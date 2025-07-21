/**
 * Memory retrieval management for Memory Relationship Engine
 * @used-by server/services/memory-relationship-engine
 */

import { db } from "@shared/database/db";
import { memoryEntries, type MemoryEntry } from '../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { MemoryRelationship } from './memory-relationship-types';
import { MemoryRelationshipCache } from './memory-relationship-cache';

/**
 * Manages memory retrieval operations with caching and optimization
 */
export class MemoryRetrievalManager {
  private cache: MemoryRelationshipCache;

  constructor(cache: MemoryRelationshipCache) {
    this.cache = cache;
  }

  /**
   * Optimized memory retrieval using lightweight relationship context
   */
  async getRelatedMemories(
    queryMemoryId: string,
    candidateMemories: MemoryEntry[],
    relationships: MemoryRelationship[],
    maxDepth: number = 1,
    maxResults: number = 5
  ): Promise<{ memory: MemoryEntry; relationship: MemoryRelationship; depth: number }[]> {
    const startTime = Date.now();
    
    try {
      const relatedMemories: { memory: MemoryEntry; relationship: MemoryRelationship; depth: number }[] = [];
      const visited = new Set<string>([queryMemoryId]);
      
      // Process only direct relationships for performance
      for (const relationship of relationships.slice(0, maxResults)) {
        const targetId = relationship.targetMemoryId;
        
        if (visited.has(targetId)) continue;
        
        // Find target memory in candidates to avoid additional DB query
        const targetMemory = candidateMemories.find(m => m.id === targetId);
        
        if (targetMemory) {
          relatedMemories.push({
            memory: targetMemory,
            relationship,
            depth: 1
          });
          
          visited.add(targetId);
        }
      }
      
      // Sort by relationship strength
      relatedMemories.sort((a, b) => b.relationship.strength - a.relationship.strength);
      
      const processingTime = Date.now() - startTime;
      console.log(`[MemoryRetrievalManager] Found ${relatedMemories.length} related memories in ${processingTime}ms`);
      
      return relatedMemories.slice(0, maxResults);
    } catch (error) {
      console.error('[MemoryRetrievalManager] Related memory retrieval failed:', error);
      return [];
    }
  }

  /**
   * Fast candidate memory retrieval with caching
   */
  async getCandidateMemories(memoryId: string): Promise<MemoryEntry[]> {
    const cacheKey = `candidates_${memoryId}`;
    
    const cachedMemories = this.cache.getRelationships(cacheKey) as any;
    if (cachedMemories) {
      return cachedMemories;
    }

    try {
      // Get recent memories from the same user efficiently
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.createdAt))
        .limit(10); // Reduced limit for performance
      
      // Cache the results
      this.cache.setRelationships(cacheKey, memories as any);
      
      return memories;
    } catch (error) {
      console.error('[MemoryRetrievalManager] Failed to get candidate memories:', error);
      return [];
    }
  }
}

// Export factory function
export function createMemoryRetrievalManager(cache: MemoryRelationshipCache): MemoryRetrievalManager {
  return new MemoryRetrievalManager(cache);
}