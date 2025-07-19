/**
 * Memory Graph Batch Analyzer - Extracted from MemoryGraphService
 * 
 * Handles optimized batch relationship analysis for memory pairs with caching
 * for improved performance in large memory sets.
 */

import type { MemoryEntry } from '@shared/schema';
import { MemoryPrompts } from './MemoryPrompts';
import { ResponseParsers, type RelationshipDetectionResult } from './ResponseParsers';
import { aiService } from '@shared/services/ai-service';

export class BatchAnalyzer {
  private relationshipCache = new Map<string, RelationshipDetectionResult>();
  private cacheTimeout = 3600000; // 1 hour
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    this.startCacheCleanup();
  }

  private startCacheCleanup(): void {
    setInterval(() => this.cleanExpiredCache(), 300000); // 5 minutes
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.cacheTimeout) {
        this.relationshipCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  private getCacheKey(memory1: MemoryEntry, memory2: MemoryEntry): string {
    const id1 = memory1.id < memory2.id ? memory1.id : memory2.id;
    const id2 = memory1.id < memory2.id ? memory2.id : memory1.id;
    return `${id1}-${id2}`;
  }

  /**
   * Public method to get cache key for memory pairs
   */
  public getCacheKeyForMemories(memory1: MemoryEntry, memory2: MemoryEntry): string {
    return this.getCacheKey(memory1, memory2);
  }

  /**
   * Public method to analyze a single memory relationship with caching
   */
  public async analyzeSingleRelationship(
    memory1: MemoryEntry,
    memory2: MemoryEntry
  ): Promise<RelationshipDetectionResult | null> {
    const cacheKey = this.getCacheKey(memory1, memory2);
    return this.analyzeMemoryRelationshipCached(memory1, memory2, cacheKey);
  }

  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Batch analyze relationships for all memory pairs - OPTIMIZED
   */
  async batchAnalyzeRelationships(memories: MemoryEntry[]): Promise<Map<string, RelationshipDetectionResult>> {
    const relationshipMap = new Map<string, RelationshipDetectionResult>();
    const uncachedPairs: Array<[MemoryEntry, MemoryEntry, string]> = [];

    // Check cache first
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memory1 = memories[i];
        const memory2 = memories[j];
        const cacheKey = this.getCacheKey(memory1, memory2);
        
        const cached = this.relationshipCache.get(cacheKey);
        if (cached && this.isCacheValid(cacheKey)) {
          relationshipMap.set(cacheKey, cached);
        } else {
          uncachedPairs.push([memory1, memory2, cacheKey]);
        }
      }
    }

    // Batch process uncached pairs in chunks of 10 for optimal performance
    const chunkSize = 10;
    for (let i = 0; i < uncachedPairs.length; i += chunkSize) {
      const chunk = uncachedPairs.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(([memory1, memory2, cacheKey]) => 
        this.analyzeMemoryRelationshipCached(memory1, memory2, cacheKey)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          const cacheKey = chunk[idx][2];
          relationshipMap.set(cacheKey, result.value);
        }
      });
    }

    return relationshipMap;
  }

  /**
   * Analyze relationship with caching - OPTIMIZED
   */
  private async analyzeMemoryRelationshipCached(
    memory1: MemoryEntry,
    memory2: MemoryEntry,
    cacheKey: string
  ): Promise<RelationshipDetectionResult | null> {
    // Check cache first
    const cached = this.relationshipCache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    const analysisPrompt = MemoryPrompts.buildRelationshipAnalysisPrompt();

    try {
      const chatResponse = await aiService.getChatResponse(
        `Memory 1: ${memory1.content}\\n\\nMemory 2: ${memory2.content}`,
        memory1.userId,
        'memory-relationship-analysis',
        1,
        'general',
        [{ role: 'system', content: analysisPrompt }],
        { provider: 'openai', model: 'gpt-4o' },
        [],
        false
      );
      const response = chatResponse.response;

      const result = ResponseParsers.parseRelationshipResponse(response);
      
      // Cache the result
      if (result) {
        this.relationshipCache.set(cacheKey, result);
        this.cacheTimestamps.set(cacheKey, Date.now());
      }
      
      return result;
    } catch (error) {
      console.error('[BatchAnalyzer] Error analyzing relationship:', error);
      return null;
    }
  }
}