/**
 * Cache Management Utilities
 * Pure utility functions for cache validation and cleanup
 */

/**
 * Check if cache entry is still valid with custom TTL support
 */
export function isCacheValid(
  cacheTimestamps: Map<string, number>,
  cacheKey: string, 
  defaultTTL: number,
  customTTL?: number
): boolean {
  const timestamp = cacheTimestamps.get(cacheKey);
  if (!timestamp) return false;
  const ttl = customTTL || defaultTTL;
  return (Date.now() - timestamp) < ttl;
}

/**
 * Clean expired cache entries with optimized TTL handling
 */
export function cleanExpiredCaches(
  cacheTimestamps: Map<string, number>,
  caches: {
    embeddingCache: Map<string, any>;
    promptCache: Map<string, any>;
    memoryRetrievalCache: Map<string, any>;
    similarityResultCache: Map<string, any>;
    hashGenerationCache: Map<string, any>;
  },
  ttlConfig: {
    CACHE_TTL: number;
    SIMILARITY_CACHE_TTL: number;
    HASH_CACHE_TTL: number;
  }
): void {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  // Convert to array to iterate safely
  Array.from(cacheTimestamps.entries()).forEach(([key, timestamp]) => {
    let isExpired = false;
    
    // Different TTL for different cache types
    if (key.startsWith('hash_')) {
      isExpired = now - timestamp > ttlConfig.HASH_CACHE_TTL;
    } else if (key.startsWith('sim_')) {
      isExpired = now - timestamp > ttlConfig.SIMILARITY_CACHE_TTL;
    } else {
      isExpired = now - timestamp > ttlConfig.CACHE_TTL;
    }
    
    if (isExpired) {
      expiredKeys.push(key);
    }
  });
  
  expiredKeys.forEach(key => {
    caches.embeddingCache.delete(key);
    caches.promptCache.delete(key);
    caches.memoryRetrievalCache.delete(key);
    caches.similarityResultCache.delete(key);
    caches.hashGenerationCache.delete(key);
    cacheTimestamps.delete(key);
  });
}