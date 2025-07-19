/**
 * Cache management for memory operations
 * @used-by memory/memory-service - Memory caching operations
 */

import { logger } from "@shared/services/logger-service";
import { cacheService } from "@shared/services/cache-service";
import type { MemoryEntry } from "../../schema";

export class MemoryCache {
  // Lazy loading cache for user memories
  private userMemoryCache: Map<string, { memories: MemoryEntry[], lastFetch: Date }> = new Map();
  
  // Vector similarity cache
  private similarityCache: Map<string, { score: number, timestamp: Date }> = new Map();
  
  // Debounced update registry
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Optimized caching patterns
  private deduplicationCache = new Map<string, string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  constructor() {
    // Cleanup old cache entries every 30 minutes
    setInterval(() => {
      this.cleanupExpiredCaches();
    }, 30 * 60 * 1000);
  }

  // Get cached user memories
  getCachedUserMemories(userId: number): MemoryEntry[] | null {
    const cacheKey = `user-memory-${userId}`;
    const cached = this.userMemoryCache.get(cacheKey);
    
    // Return cached memories if fresh (within 30 minutes)
    if (cached && (Date.now() - cached.lastFetch.getTime()) < 30 * 60 * 1000) {
      return cached.memories;
    }
    
    return null;
  }

  // Cache user memories
  setCachedUserMemories(userId: number, memories: MemoryEntry[]): void {
    const cacheKey = `user-memory-${userId}`;
    this.userMemoryCache.set(cacheKey, {
      memories,
      lastFetch: new Date()
    });
  }

  // Get cached vector similarity
  getCachedSimilarity(cacheKey: string): number | null {
    const cached = this.similarityCache.get(cacheKey);
    
    if (cached) {
      // Check if cache is still valid (1 hour)
      const maxAge = 60 * 60 * 1000;
      if (Date.now() - cached.timestamp.getTime() < maxAge) {
        return cached.score;
      } else {
        this.similarityCache.delete(cacheKey);
      }
    }
    
    return null;
  }

  // Cache similarity score
  setCachedSimilarity(cacheKey: string, score: number): void {
    this.similarityCache.set(cacheKey, {
      score,
      timestamp: new Date()
    });
  }

  // Debounced cache invalidation
  invalidateUserMemoryCache(userId: number, delay: number = 2000): void {
    const key = `user-memory-${userId}`;
    
    // Clear existing timer
    const existingTimer = this.updateTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new debounced timer
    const timer = setTimeout(() => {
      this.userMemoryCache.delete(key);
      this.updateTimers.delete(key);
      logger.debug(`Invalidated memory cache for user ${userId}`, { service: 'memory' });
    }, delay);
    
    this.updateTimers.set(key, timer);
  }

  // Cleanup expired cache entries
  cleanupExpiredCaches(): void {
    const now = new Date();
    const cacheExpiry = 60 * 60 * 1000; // 1 hour
    
    // Clean user memory cache
    Array.from(this.userMemoryCache.entries()).forEach(([key, value]) => {
      if (now.getTime() - value.lastFetch.getTime() > cacheExpiry) {
        this.userMemoryCache.delete(key);
      }
    });
    
    // Clean similarity cache
    Array.from(this.similarityCache.entries()).forEach(([key, value]) => {
      if (now.getTime() - value.timestamp.getTime() > cacheExpiry) {
        this.similarityCache.delete(key);
      }
    });
    
    console.log(`[MemoryService] Cache cleanup completed. Active caches: ${this.userMemoryCache.size + this.similarityCache.size}`);
  }

  // Force cache cleanup for memory management
  forceCacheCleanup(): void {
    this.cleanupExpiredCaches();
  }

  // Clear related cache entries for user
  clearUserCache(userId: number): void {
    const cacheKey = `user-memory-${userId}`;
    this.userMemoryCache.delete(cacheKey);
    cacheService.clearMemorySearchResults(userId);
  }

  // Get cache performance stats
  getCacheStats(): {
    activeCaches: number;
    pendingUpdates: number;
    cacheHitRate: string;
  } {
    return {
      activeCaches: this.userMemoryCache.size + this.similarityCache.size,
      pendingUpdates: this.updateTimers.size,
      cacheHitRate: `${Math.round((this.userMemoryCache.size / (this.userMemoryCache.size + 1)) * 100)}%`
    };
  }
}