/**
 * Deduplication Helper Utilities
 * Support functions for semantic duplicate detection and memory retrieval
 * 
 * @used-by memory/memory-routes - Duplicate detection API endpoint
 * @used-by memory/MemorySection - Duplicate notification UI integration  
 * @used-by shared/services/memory-service - Preview duplicate detection
 */

import { db } from "@shared/database/db";
import { memoryEntries, type MemoryEntry } from '../../schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { memoryService } from '@shared/services/memory-service';
import crypto from 'crypto';
import type { RelevantMemory } from './memory-types';

/**
 * Get recent memories for comparison
 */
export async function getRecentMemories(userId: number, hoursBack: number): Promise<MemoryEntry[]> {
  const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
  
  return await db
    .select()
    .from(memoryEntries)
    .where(and(
      eq(memoryEntries.userId, userId),
      eq(memoryEntries.isActive, true),
      sql`${memoryEntries.createdAt} > ${cutoffTime}`
    ))
    .orderBy(desc(memoryEntries.createdAt))
    .limit(20);
}

/**
 * Find similar memory using optimized semantic similarity calculation with enhanced caching
 */
export async function findSimilarMemory(
  content: string, 
  memories: MemoryEntry[],
  embeddingCache: Map<string, number[]>,
  similarityResultCache: Map<string, number>,
  cacheTimestamps: Map<string, number>,
  isCacheValidFn: (key: string, ttl?: number) => boolean,
  SIMILARITY_CACHE_TTL: number,
  findFuzzyMatchFn: (content: string, memories: MemoryEntry[]) => { id: string; content: string; similarity: number } | null
): Promise<{ id: string; content: string; similarity: number } | null> {
  if (memories.length === 0) return null;

  try {
    // Fast path: check similarity cache for recent calculations
    const contentHash = crypto.createHash('md5').update(content.toLowerCase().trim()).digest('hex');
    
    // Generate embedding for the new content with caching
    const embeddingCacheKey = `emb_${contentHash}`;
    let contentEmbedding: number[];
    
    if (embeddingCache.has(embeddingCacheKey) && isCacheValidFn(embeddingCacheKey)) {
      contentEmbedding = embeddingCache.get(embeddingCacheKey)!;
    } else {
      contentEmbedding = await memoryService.generateEmbedding(content);
      embeddingCache.set(embeddingCacheKey, contentEmbedding);
      cacheTimestamps.set(embeddingCacheKey, Date.now());
    }
    
    let bestMatch: { id: string; content: string; similarity: number } | null = null;
    let highestSimilarity = 0;

    // Optimized batch similarity calculation for better performance
    const validMemories = memories.filter(m => m.embedding && Array.isArray(m.embedding) && m.embedding.length > 0);
    if (validMemories.length === 0) {
      return findFuzzyMatchFn(content, memories);
    }

    // Batch process similarities with caching
    for (const memory of validMemories) {
      const memoryHash = crypto.createHash('md5').update(memory.content.toLowerCase().trim()).digest('hex');
      const similarityCacheKey = `sim_${contentHash}_${memoryHash}`;
      
      let similarity: number;
      
      // Check similarity cache first
      if (similarityResultCache.has(similarityCacheKey) && isCacheValidFn(similarityCacheKey, SIMILARITY_CACHE_TTL)) {
        similarity = similarityResultCache.get(similarityCacheKey)!;
      } else {
        // Calculate cosine similarity
        similarity = await memoryService.cosineSimilarity(
          contentEmbedding, 
          memory.embedding as number[]
        );
        
        // Cache the result
        similarityResultCache.set(similarityCacheKey, similarity);
        cacheTimestamps.set(similarityCacheKey, Date.now());
      }

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = {
          id: memory.id,
          content: memory.content,
          similarity: similarity
        };
      }
    }

    // If no good semantic match found, try fuzzy string matching as fallback
    if (!bestMatch || bestMatch.similarity < 0.3) {
      const fuzzyMatch = findFuzzyMatchFn(content, memories);
      if (fuzzyMatch && (!bestMatch || fuzzyMatch.similarity > bestMatch.similarity)) {
        bestMatch = fuzzyMatch;
      }
    }

    return bestMatch;
  } catch (error) {
    console.error('[ChatGPTMemoryEnhancement] Similarity check failed:', error);
    // Fallback to fuzzy matching if embedding fails
    return findFuzzyMatchFn(content, memories);
  }
}

/**
 * Preview mode: Find similar memories for duplicate detection UI
 * This is a simplified wrapper around findSimilarMemory for frontend preview
 */
export async function findSimilarMemoriesForPreview(
  content: string,
  userId: number,
  options: {
    hoursBack?: number;
    similarityThreshold?: number;
    maxResults?: number;
  } = {}
): Promise<{
  hasDuplicates: boolean;
  similarMemories: Array<{
    id: string;
    content: string;
    similarity: number;
    category: string;
    createdAt?: string;
  }>;
  processingTime: string;
}> {
  const startTime = performance.now();
  
  try {
    // Default options
    const {
      hoursBack = 24 * 7, // 7 days
      similarityThreshold = 0.3,
      maxResults = 5
    } = options;

    // Get recent memories
    const recentMemories = await getRecentMemories(userId, hoursBack);
    
    if (recentMemories.length === 0) {
      return {
        hasDuplicates: false,
        similarMemories: [],
        processingTime: `${(performance.now() - startTime).toFixed(2)}ms`
      };
    }

    // Initialize caches for similarity calculation
    const embeddingCache = new Map<string, number[]>();
    const similarityResultCache = new Map<string, number>();
    const cacheTimestamps = new Map<string, number>();
    
    const isCacheValid = (key: string, ttl: number = 300000): boolean => {
      const timestamp = cacheTimestamps.get(key);
      return timestamp ? (Date.now() - timestamp) < ttl : false;
    };

    // Fuzzy matching fallback
    const findFuzzyMatch = (content: string, memories: any[]) => {
      const normalizedContent = content.toLowerCase().trim();
      for (const memory of memories) {
        const normalizedMemory = memory.content.toLowerCase().trim();
        if (normalizedMemory.includes(normalizedContent) || normalizedContent.includes(normalizedMemory)) {
          return {
            id: memory.id,
            content: memory.content,
            similarity: 0.8 // High fuzzy match score
          };
        }
      }
      return null;
    };

    // Find the most similar memory
    const similarMemory = await findSimilarMemory(
      content.trim(),
      recentMemories,
      embeddingCache,
      similarityResultCache,
      cacheTimestamps,
      isCacheValid,
      300000, // 5 minute cache TTL
      findFuzzyMatch
    );

    const duration = performance.now() - startTime;
    
    if (similarMemory && similarMemory.similarity >= similarityThreshold) {
      // Found potential duplicate
      const matchedMemory = recentMemories.find(m => m.id === similarMemory.id);
      
      return {
        hasDuplicates: true,
        similarMemories: [{
          id: similarMemory.id,
          content: similarMemory.content,
          similarity: similarMemory.similarity,
          category: matchedMemory?.category || 'unknown',
          createdAt: matchedMemory?.createdAt?.toISOString()
        }],
        processingTime: `${duration.toFixed(2)}ms`
      };
    }

    return {
      hasDuplicates: false,
      similarMemories: [],
      processingTime: `${duration.toFixed(2)}ms`
    };

  } catch (error) {
    console.error('[DuplicatePreview] Error finding similar memories:', error);
    return {
      hasDuplicates: false,
      similarMemories: [],
      processingTime: `${(performance.now() - startTime).toFixed(2)}ms`
    };
  }
}

/**
 * Build memory context for system prompt
 */
export function buildMemoryContext(memories: RelevantMemory[]): string {
  return memories
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 4) // Limit to top 4 memories for optimal prompt length
    .map((memory, index) => {
      const priority = memory.importanceScore > 0.8 ? '[Important]' : '';
      return `- ${priority} ${memory.content}`.trim();
    })
    .join('\n');
}