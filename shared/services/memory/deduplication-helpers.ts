/**
 * Deduplication Helper Utilities
 * Support functions for semantic duplicate detection and memory retrieval
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