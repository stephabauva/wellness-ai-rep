/**
 * Memory retrieval service for contextual memory fetching
 * @used-by memory/memory-service - Memory retrieval and contextual matching
 */

import { db } from "@shared/database/db";
import { memoryEntries, type MemoryEntry } from "../../schema";
import { eq, desc, and } from 'drizzle-orm';
import { cacheService } from "@shared/services/cache-service";
import { logger } from "@shared/services/logger-service";
import { EmbeddingService } from './embedding-service';
import { MemoryCache } from './memory-cache';
import { cosineSimilaritySync } from './memory-utils';
import { goMemoryService } from '../../../server/services/go-memory-service';

interface RelevantMemory extends MemoryEntry {
  relevanceScore: number;
  retrievalReason: string;
}

export class MemoryRetrievalService {
  private embeddingService: EmbeddingService;
  private memoryCache: MemoryCache;

  constructor(embeddingService: EmbeddingService, memoryCache: MemoryCache) {
    this.embeddingService = embeddingService;
    this.memoryCache = memoryCache;
  }

  /**
   * Calculate cosine similarity between two vectors
   * Uses Go service for performance-critical similarity calculations
   */
  private async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    // Try Go service first for better performance
    if (goMemoryService.isAvailable() && a.length > 100) {
      try {
        return await goMemoryService.calculateCosineSimilarity(a, b);
      } catch (error) {
        console.warn('[MemoryRetrievalService] Go service fallback to TypeScript implementation:', error);
      }
    }
    
    // Fallback to TypeScript implementation
    return cosineSimilaritySync(a, b);
  }

  /**
   * Get cached vector similarity with background calculation
   */
  private getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    const cacheKey = this.createSimilarityCacheKey(vectorA, vectorB);
    return this.memoryCache.getCachedSimilarity(cacheKey);
  }

  /**
   * Create similarity cache key
   */
  private createSimilarityCacheKey(vectorA: number[], vectorB: number[]): string {
    const hashA = this.vectorHash(vectorA);
    const hashB = this.vectorHash(vectorB);
    return `similarity:${hashA}:${hashB}`;
  }

  /**
   * Create a simple hash for vector identification
   */
  private vectorHash(vector: number[]): string {
    const sum = vector.reduce((acc, val) => acc + val, 0);
    const length = vector.length;
    return `${Math.round(sum * 1000)}_${length}`;
  }

  /**
   * Lazy loading for user memories with caching
   */
  private async getUserMemoriesLazy(userId: number): Promise<MemoryEntry[]> {
    // Check cache first
    const cachedMemories = this.memoryCache.getCachedUserMemories(userId);
    if (cachedMemories) {
      return cachedMemories;
    }
    
    // Fetch from database
    const memories = await db
      .select()
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ))
      .orderBy(desc(memoryEntries.importanceScore));
    
    // Cache the results
    this.memoryCache.setCachedUserMemories(userId, memories);
    
    return memories;
  }

  /**
   * Retrieve relevant memories based on context
   */
  async getContextualMemories(
    userId: number, 
    conversationHistory: any[], 
    currentMessage: string
  ): Promise<RelevantMemory[]> {
    try {
      console.log(`[MemoryRetrievalService] getContextualMemories called for user ${userId}, message: "${currentMessage}"`);
      
      // Combine recent conversation + current message for context (current session only)
      const context = [
        ...conversationHistory.slice(-3),
        { role: 'user', content: currentMessage }
      ].map(m => m.content).join(' ');

      console.log(`[MemoryRetrievalService] Context built: "${context}"`);

      // Attempt to retrieve from cache first
      const cached = await cacheService.getMemorySearchResults(userId, context, 10);
      if (cached) {
        logger.debug(`[MemoryRetrievalService] Contextual memories cache hit for user ${userId}`, { service: 'memory' });
        return cached as RelevantMemory[];
      }
      logger.debug(`[MemoryRetrievalService] Contextual memories cache miss for user ${userId}`, { service: 'memory' });

      // Get user memories directly
      const userMemories = await this.getUserMemoriesLazy(userId);

      // For memory-related queries, return ALL memories with basic scoring
      if (currentMessage.toLowerCase().includes('memor') || currentMessage.toLowerCase().includes('about me')) {
        logger.debug(`Memory query detected, returning all active memories`, { service: 'memory' });
        
        const allRelevantMemories: RelevantMemory[] = userMemories.map(memory => ({
          ...memory,
          relevanceScore: memory.importanceScore,
          retrievalReason: 'direct_memory_query'
        }));

        return allRelevantMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      // Generate embedding for current context
      const contextEmbedding = await this.embeddingService.generateEmbedding(context);

      // Calculate semantic similarity and create relevant memories
      const relevantMemories: RelevantMemory[] = [];

      for (const memory of userMemories) {
        if (!memory.embedding) {
          continue;
        }

        try {
          let memoryEmbedding;
          if (typeof memory.embedding === 'string') {
            memoryEmbedding = JSON.parse(memory.embedding);
          } else {
            memoryEmbedding = memory.embedding;
          }
          
          if (Array.isArray(memoryEmbedding) && memoryEmbedding.length > 0 && Array.isArray(contextEmbedding)) {
            // Use cached similarity if available
            let similarity = this.getCachedSimilarity(contextEmbedding, memoryEmbedding);
            
            // Fall back to calculation if not cached
            if (similarity === null) {
              similarity = await this.cosineSimilarity(contextEmbedding, memoryEmbedding);
            }
            
            // Debug logging only for high similarity
            if (similarity > 0.7) {
              logger.debug(`High similarity memory found: ${similarity.toFixed(3)}`, { service: 'memory' });
            }
            
            if (similarity > 0.5) { // Lowered threshold for better retrieval
              relevantMemories.push({
                ...memory,
                relevanceScore: similarity * memory.importanceScore,
                retrievalReason: 'semantic_similarity'
              });
            }
          }
        } catch (error) {
          logger.error(`Error parsing memory embedding for memory ${memory.id}`, error as Error, { service: 'memory' });
        }
      }

      // Always include high-importance memories (0.7+ instead of 0.8+)
      const importantMemories = userMemories
        .filter(m => m.importanceScore >= 0.7)
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

      // Add important memories that aren't already included
      for (const memory of importantMemories) {
        if (!relevantMemories.find(rm => rm.id === memory.id)) {
          relevantMemories.push({
            ...memory,
            relevanceScore: memory.importanceScore,
            retrievalReason: 'high_importance'
          });
        }
      }

      // Sort by relevance score and return top memories
      const results = relevantMemories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 8);
      
      logger.memory('memory retrieval', { userId, count: results.length });
      
      return results;
        
    } catch (error) {
      logger.error('Error retrieving contextual memories', error as Error, { service: 'memory' });
      return [];
    }
  }
}