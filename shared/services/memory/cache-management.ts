/**
 * Memory cache management utilities
 * @used-by memory/memory-service - Cache operations and similarity caching
 */

import { MemoryCache } from './memory-cache';
import { createSimilarityCacheKey } from './memory-utils';

export class MemoryCacheManager {
  private memoryCache: MemoryCache;
  
  // Optimized caching patterns from optimized-memory-service
  private deduplicationCache = new Map<string, string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  constructor(memoryCache: MemoryCache) {
    this.memoryCache = memoryCache;
  }

  /**
   * Get cached vector similarity with background calculation
   */
  getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    const cacheKey = this.createSimilarityCacheKey(vectorA, vectorB);
    const cached = this.memoryCache.getCachedSimilarity(cacheKey);
    
    if (cached !== null) {
      return cached;
    }
    
    return null;
  }

  /**
   * Create similarity cache key using imported utility
   */
  private createSimilarityCacheKey(vectorA: number[], vectorB: number[]): string {
    return createSimilarityCacheKey(vectorA, vectorB);
  }

  /**
   * Force cache cleanup for memory management
   */
  forceCacheCleanup(): void {
    this.memoryCache.forceCacheCleanup();
  }

  /**
   * Clear user cache
   */
  clearUserCache(userId: number): void {
    this.memoryCache.clearUserCache(userId);
  }

  /**
   * Invalidate user memory cache with debounced timing
   */
  invalidateUserMemoryCache(userId: number, delay: number = 500): void {
    this.memoryCache.invalidateUserMemoryCache(userId, delay);
  }
}