import { db } from "@shared/database/db";
import { memoryEntries, type InsertMemoryEntry, type MemoryEntry, type MemoryCategory } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { memoryService } from '@shared/services/memory-service';
import crypto from 'crypto';
import {
  calculateJaccardSimilarity,
  calculateOverlapSimilarity,
  calculateLevenshteinSimilarity,
  calculateNgramSimilarity
} from './memory/similarity-utils';
import { isCacheValid, cleanExpiredCaches } from './memory/cache-utils';
import type { RelevantMemory, DeduplicationResult } from './memory/memory-types';
import { createNewMemory, updateExistingMemory, mergeWithExistingMemory } from './memory/memory-operations';
import { getRecentMemories, findSimilarMemory, buildMemoryContext } from './memory/deduplication-helpers';

/**
 * ChatGPT Memory Enhancement Service
 * Implements Phase 1: Core Memory Enhancement with real-time deduplication
 * and memory-enhanced system prompts following ChatGPT's approach
 */
export class ChatGPTMemoryEnhancement {
  private deduplicationCache = new Map<string, string>();
  private processingPromises = new Map<string, Promise<void>>();
  
  // Enhanced performance optimization caches
  private embeddingCache = new Map<string, number[]>();
  private promptCache = new Map<string, string>();
  private memoryRetrievalCache = new Map<string, RelevantMemory[]>();
  private similarityResultCache = new Map<string, number>();
  private hashGenerationCache = new Map<string, string>();
  
  // Cache TTL in milliseconds (optimized for different cache types)
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes for general cache
  private readonly SIMILARITY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for similarity results
  private readonly HASH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes for hash generation
  private cacheTimestamps = new Map<string, number>();

  /**
   * Process message with ChatGPT-style deduplication
   * Runs in parallel with chat response for optimal performance
   */
  async processWithDeduplication(
    userId: number,
    message: string,
    conversationId: string
  ): Promise<void> {
    const processingKey = `${userId}-${Date.now()}`;
    
    // Prevent duplicate processing of the same message
    if (this.processingPromises.has(processingKey)) {
      return this.processingPromises.get(processingKey);
    }

    const processingPromise = this.performDeduplicationProcess(userId, message, conversationId);
    this.processingPromises.set(processingKey, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingPromises.delete(processingKey);
    }
  }

  /**
   * Build enhanced system prompt with relevant memories (ChatGPT style) - optimized with caching
   */
  async buildEnhancedSystemPrompt(
    userId: number, 
    currentMessage: string
  ): Promise<string> {
    const promptCacheKey = `prompt_${userId}_${crypto.createHash('md5').update(currentMessage.toLowerCase().trim()).digest('hex')}`;
    
    // Check cache first
    if (this.promptCache.has(promptCacheKey) && this.isCacheValid(promptCacheKey)) {
      return this.promptCache.get(promptCacheKey)!;
    }

    try {
      // Check memory retrieval cache
      const memoryCacheKey = `memories_${userId}_${crypto.createHash('md5').update(currentMessage.toLowerCase().trim()).digest('hex')}`;
      let relevantMemories: RelevantMemory[];
      
      if (this.memoryRetrievalCache.has(memoryCacheKey) && this.isCacheValid(memoryCacheKey)) {
        relevantMemories = this.memoryRetrievalCache.get(memoryCacheKey)!;
      } else {
        // Use existing contextual memory retrieval with enhanced parameters
        relevantMemories = await memoryService.getContextualMemories(
          userId, 
          [], 
          currentMessage
        );
        
        // Cache the memories
        this.memoryRetrievalCache.set(memoryCacheKey, relevantMemories);
        this.cacheTimestamps.set(memoryCacheKey, Date.now());
      }

      let prompt: string;
      if (relevantMemories.length === 0) {
        prompt = "You are a helpful AI wellness coach.";
      } else {
        // Build memory context in ChatGPT style
        const memoryContext = buildMemoryContext(relevantMemories);
        
        prompt = `You are a helpful AI wellness coach. Consider this context about the user:

${memoryContext}

Use this information naturally in your responses to provide personalized guidance. Do not explicitly mention that you're referencing stored information.`;
      }
      
      // Cache the prompt
      this.promptCache.set(promptCacheKey, prompt);
      this.cacheTimestamps.set(promptCacheKey, Date.now());
      
      return prompt;

    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Error building enhanced prompt:', error);
      return "You are a helpful AI wellness coach.";
    }
  }

  /**
   * Perform the actual deduplication process
   */
  private async performDeduplicationProcess(
    userId: number,
    message: string,
    conversationId: string
  ): Promise<void> {
    try {
      // Generate semantic hash for fast duplicate detection
      const semanticHash = await this.generateSemanticHash(message);
      
      // Check for existing duplicate
      const deduplicationResult = await this.checkSemanticDuplicate(userId, semanticHash, message);
      
      if (deduplicationResult.action === 'skip') {
        console.log(`[ChatGPTMemoryEnhancement] Skipping duplicate memory: ${deduplicationResult.reasoning}`);
        return;
      }

      // Use existing memory detection logic
      const detection = await memoryService.detectMemoryWorthy(message);
      
      if (!detection.shouldRemember) {
        return;
      }

      // Handle different deduplication actions
      switch (deduplicationResult.action) {
        case 'create':
          // Generate proper UUID for conversation ID if test format
          const validConversationId = conversationId.startsWith('test-') 
            ? crypto.randomUUID() 
            : conversationId;
          await createNewMemory(userId, detection, validConversationId, semanticHash);
          break;
        case 'update':
          await updateExistingMemory(deduplicationResult.existingMemoryId!, detection);
          break;
        case 'merge':
          await mergeWithExistingMemory(deduplicationResult.existingMemoryId!, detection);
          break;
      }

    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Processing error:', error);
      // Fallback to existing memory processing
      await memoryService.processMessageForMemory(userId, message, conversationId, 0);
    }
  }

  /**
   * Generate semantic hash for deduplication using optimized embedding-based approach
   */
  public async generateSemanticHash(message: string): Promise<string> {
    const normalizedMessage = message.toLowerCase().trim();
    const contentHash = crypto.createHash('md5').update(normalizedMessage).digest('hex');
    const cacheKey = `hash_${contentHash}`;
    
    // Check optimized hash cache first for immediate return
    if (this.hashGenerationCache.has(cacheKey) && this.isCacheValid(cacheKey, this.HASH_CACHE_TTL)) {
      return this.hashGenerationCache.get(cacheKey)!;
    }

    // Check legacy deduplication cache for backward compatibility
    if (this.deduplicationCache.has(cacheKey)) {
      return this.deduplicationCache.get(cacheKey)!;
    }

    try {
      // Fast path: try cached embedding first
      const embeddingCacheKey = `emb_${contentHash}`;
      let embedding: number[];
      
      if (this.embeddingCache.has(embeddingCacheKey) && this.isCacheValid(embeddingCacheKey)) {
        embedding = this.embeddingCache.get(embeddingCacheKey)!;
      } else {
        // Use embedding-based approach for better semantic similarity
        embedding = await memoryService.generateEmbedding(normalizedMessage);
        // Cache the embedding for future use
        this.embeddingCache.set(embeddingCacheKey, embedding);
        this.cacheTimestamps.set(embeddingCacheKey, Date.now());
      }
      
      // Create optimized hash using fewer dimensions for speed
      const embeddingHash = crypto.createHash('sha256')
        .update(embedding.slice(0, 32).join(',')) // Reduced from 50 to 32 dimensions
        .digest('hex').slice(0, 24); // Reduced hash length for better performance
      
      // Cache the hash with longer TTL
      this.hashGenerationCache.set(cacheKey, embeddingHash);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return embeddingHash;
    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Embedding generation failed, falling back to content hash:', error);
      
      // Optimized fallback to content-based hash if embedding fails
      const fallbackHash = crypto.createHash('sha256').update(normalizedMessage).digest('hex').slice(0, 24);
      this.hashGenerationCache.set(cacheKey, fallbackHash);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return fallbackHash;
    }
  }

  /**
   * Check for semantic duplicates - optimized for performance
   */
  private async checkSemanticDuplicate(
    userId: number, 
    semanticHash: string,
    messageContent: string
  ): Promise<DeduplicationResult> {
    try {
      // Check cache first
      const cacheKey = `${userId}-${semanticHash}`;
      if (this.deduplicationCache.has(cacheKey)) {
        return {
          action: 'skip',
          existingMemoryId: this.deduplicationCache.get(cacheKey),
          confidence: 1.0,
          reasoning: 'Found in deduplication cache'
        };
      }

      // Single optimized database query for exact semantic hash match
      const exactMatch = await db
        .select({ id: memoryEntries.id })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.semanticHash, semanticHash),
          eq(memoryEntries.isActive, true)
        ))
        .limit(1);

      if (exactMatch.length > 0) {
        this.deduplicationCache.set(cacheKey, exactMatch[0].id);
        return {
          action: 'skip',
          existingMemoryId: exactMatch[0].id,
          confidence: 1.0,
          reasoning: 'Exact semantic hash match found'
        };
      }

      // Fast similarity check using lightweight content comparison
      const contentHash = crypto.createHash('md5').update(messageContent.toLowerCase().trim()).digest('hex');
      const contentCacheKey = `content_${userId}_${contentHash}`;
      
      if (this.deduplicationCache.has(contentCacheKey)) {
        return {
          action: 'skip',
          existingMemoryId: this.deduplicationCache.get(contentCacheKey),
          confidence: 0.9,
          reasoning: 'Similar content found in cache'
        };
      }

      // Get recent memories to check for semantic similarity
      const recentMemories = await getRecentMemories(userId, 72); // Check last 3 days
      
      if (recentMemories.length === 0) {
        return {
          action: 'create',
          confidence: 1.0,
          reasoning: 'No existing memories to compare against'
        };
      }

      // Find semantically similar memory using existing similarity logic
      const similarMemory = await findSimilarMemory(
        messageContent, 
        recentMemories,
        this.embeddingCache,
        this.similarityResultCache,
        this.cacheTimestamps,
        (key, ttl) => this.isCacheValid(key, ttl),
        this.SIMILARITY_CACHE_TTL,
        (content, memories) => this.findFuzzyMatch(content, memories)
      );
      
      if (similarMemory && similarMemory.similarity > 0.6) {
        // High similarity - merge instead of creating duplicate (lowered from 0.8)
        const result = {
          action: 'merge' as const,
          existingMemoryId: similarMemory.id,
          confidence: similarMemory.similarity,
          reasoning: `High similarity (${(similarMemory.similarity * 100).toFixed(1)}%) with existing memory: "${similarMemory.content.substring(0, 50)}..."`
        };
        
        // Cache the result
        this.deduplicationCache.set(cacheKey, similarMemory.id);
        return result;
      } else if (similarMemory && similarMemory.similarity > 0.4) {
        // Medium similarity - update existing memory (lowered from 0.6)
        const result = {
          action: 'update' as const,
          existingMemoryId: similarMemory.id,
          confidence: similarMemory.similarity,
          reasoning: `Medium similarity (${(similarMemory.similarity * 100).toFixed(1)}%) with existing memory: "${similarMemory.content.substring(0, 50)}..."`
        };
        
        // Cache the result
        this.deduplicationCache.set(cacheKey, similarMemory.id);
        return result;
      } else {
        // Low or no similarity - create new memory
        return {
          action: 'create',
          confidence: 1.0,
          reasoning: similarMemory 
            ? `Low similarity (${(similarMemory.similarity * 100).toFixed(1)}%) - creating new memory`
            : 'No similar memories found - creating new memory'
        };
      }

    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Deduplication check failed:', error);
      return {
        action: 'create',
        confidence: 0.8,
        reasoning: 'Deduplication check failed - defaulting to create'
      };
    }
  }




  /**
   * Find fuzzy match using enhanced word-based similarity with Levenshtein distance
   */
  private findFuzzyMatch(
    content: string, 
    memories: MemoryEntry[]
  ): { id: string; content: string; similarity: number } | null {
    const normalizedContent = content.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const contentWords = normalizedContent.split(/\s+/).filter(w => w.length > 2);
    
    if (contentWords.length === 0) return null;

    let bestMatch: { id: string; content: string; similarity: number } | null = null;
    let highestSimilarity = 0;

    for (const memory of memories) {
      const normalizedMemory = memory.content.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const memoryWords = normalizedMemory.split(/\s+/).filter(w => w.length > 2);
      
      if (memoryWords.length === 0) continue;

      // Enhanced similarity calculation with multiple metrics
      const jaccardSimilarity = calculateJaccardSimilarity(contentWords, memoryWords);
      const overlapSimilarity = calculateOverlapSimilarity(contentWords, memoryWords);
      const levenshteinSimilarity = calculateLevenshteinSimilarity(normalizedContent, normalizedMemory);
      const ngramSimilarity = calculateNgramSimilarity(contentWords, memoryWords);
      
      // Weighted combination of all similarity metrics
      const combinedSimilarity = (
        jaccardSimilarity * 0.35 +
        overlapSimilarity * 0.25 +
        levenshteinSimilarity * 0.25 +
        ngramSimilarity * 0.15
      );

      if (combinedSimilarity > highestSimilarity && combinedSimilarity > 0.15) {
        highestSimilarity = combinedSimilarity;
        bestMatch = {
          id: memory.id,
          content: memory.content,
          similarity: combinedSimilarity
        };
      }
    }

    return bestMatch;
  }


  /**
   * Get enhanced performance metrics for monitoring
   */
  getPerformanceMetrics(): any {
    // Calculate cache hit rates
    const totalCacheEntries = this.cacheTimestamps.size;
    const embeddingCacheHitRate = this.embeddingCache.size > 0 ? 
      (this.embeddingCache.size / Math.max(totalCacheEntries, 1)) * 100 : 0;
    const similarityCacheHitRate = this.similarityResultCache.size > 0 ? 
      (this.similarityResultCache.size / Math.max(totalCacheEntries, 1)) * 100 : 0;
    
    return {
      // Legacy metrics
      cacheSize: this.deduplicationCache.size,
      activeProcessing: this.processingPromises.size,
      embeddingCacheSize: this.embeddingCache.size,
      promptCacheSize: this.promptCache.size,
      memoryRetrievalCacheSize: this.memoryRetrievalCache.size,
      
      // Enhanced performance metrics
      similarityResultCacheSize: this.similarityResultCache.size,
      hashGenerationCacheSize: this.hashGenerationCache.size,
      totalCacheEntries: totalCacheEntries,
      embeddingCacheHitRate: Math.round(embeddingCacheHitRate * 100) / 100,
      similarityCacheHitRate: Math.round(similarityCacheHitRate * 100) / 100,
      
      // Performance targets tracking
      targets: {
        embeddingCacheHitRateTarget: 80,
        similarityCacheHitRateTarget: 80,
        memoryCreationTimeTarget: 200 // milliseconds
      },
      
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if cache entry is still valid with custom TTL support
   */
  private isCacheValid(cacheKey: string, customTTL?: number): boolean {
    return isCacheValid(this.cacheTimestamps, cacheKey, this.CACHE_TTL, customTTL);
  }

  /**
   * Clean expired cache entries with optimized TTL handling
   */
  private cleanExpiredCaches(): void {
    cleanExpiredCaches(
      this.cacheTimestamps,
      {
        embeddingCache: this.embeddingCache,
        promptCache: this.promptCache,
        memoryRetrievalCache: this.memoryRetrievalCache,
        similarityResultCache: this.similarityResultCache,
        hashGenerationCache: this.hashGenerationCache
      },
      {
        CACHE_TTL: this.CACHE_TTL,
        SIMILARITY_CACHE_TTL: this.SIMILARITY_CACHE_TTL,
        HASH_CACHE_TTL: this.HASH_CACHE_TTL
      }
    );
  }

  /**
   * Clear caches (for testing and maintenance)
   */
  clearCaches(): void {
    this.deduplicationCache.clear();
    this.processingPromises.clear();
    this.embeddingCache.clear();
    this.promptCache.clear();
    this.memoryRetrievalCache.clear();
    this.similarityResultCache.clear();
    this.hashGenerationCache.clear();
    this.cacheTimestamps.clear();
  }
}

// Export singleton instance
export const chatGPTMemoryEnhancement = new ChatGPTMemoryEnhancement();