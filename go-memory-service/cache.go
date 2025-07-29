package main

import (
	"time"
)

// Get retrieves a cached similarity entry
func (sc *SimilarityCache) Get(key string) *CacheEntry {
	sc.mutex.RLock()
	defer sc.mutex.RUnlock()
	
	entry, exists := sc.cache[key]
	if !exists {
		sc.missCount++
		return nil
	}
	
	// Check if entry has expired
	if time.Since(entry.Timestamp) > sc.ttl {
		// Don't delete here to avoid upgrading to write lock
		// Will be cleaned up by cleanup routine
		sc.missCount++
		return nil
	}
	
	// Update access count (note: this modifies the entry but doesn't require write lock
	// since we're only incrementing a counter)
	entry.AccessCount++
	sc.hitCount++
	
	return entry
}

// Set stores a similarity calculation result in the cache
func (sc *SimilarityCache) Set(key string, entry *CacheEntry) {
	sc.mutex.Lock()
	defer sc.mutex.Unlock()
	
	// Check if cache is full and needs eviction
	if len(sc.cache) >= sc.maxSize {
		sc.evictLRU()
	}
	
	sc.cache[key] = entry
}

// evictLRU removes least recently used entries (called with write lock held)
func (sc *SimilarityCache) evictLRU() {
	if len(sc.cache) == 0 {
		return
	}
	
	// Find oldest entry by timestamp and lowest access count
	var oldestKey string
	var oldestEntry *CacheEntry
	
	for key, entry := range sc.cache {
		if oldestEntry == nil || 
		   entry.Timestamp.Before(oldestEntry.Timestamp) ||
		   (entry.Timestamp.Equal(oldestEntry.Timestamp) && entry.AccessCount < oldestEntry.AccessCount) {
			oldestKey = key
			oldestEntry = entry
		}
	}
	
	if oldestKey != "" {
		delete(sc.cache, oldestKey)
	}
}

// Cleanup removes expired entries from the cache
func (sc *SimilarityCache) Cleanup() int {
	sc.mutex.Lock()
	defer sc.mutex.Unlock()
	
	var removed int
	now := time.Now()
	
	for key, entry := range sc.cache {
		if now.Sub(entry.Timestamp) > sc.ttl {
			delete(sc.cache, key)
			removed++
		}
	}
	
	return removed
}

// GetStats returns cache statistics
func (sc *SimilarityCache) GetStats() map[string]interface{} {
	sc.mutex.RLock()
	defer sc.mutex.RUnlock()
	
	total := sc.hitCount + sc.missCount
	hitRate := 0.0
	if total > 0 {
		hitRate = float64(sc.hitCount) / float64(total) * 100
	}
	
	return map[string]interface{}{
		"size":      len(sc.cache),
		"max_size":  sc.maxSize,
		"hit_count": sc.hitCount,
		"miss_count": sc.missCount,
		"hit_rate":  hitRate,
		"ttl_seconds": sc.ttl.Seconds(),
	}
}

// Clear removes all entries from the cache
func (sc *SimilarityCache) Clear() {
	sc.mutex.Lock()
	defer sc.mutex.Unlock()
	
	sc.cache = make(map[string]*CacheEntry)
	sc.hitCount = 0
	sc.missCount = 0
}

// cacheCleanupRoutine runs periodic cleanup of expired cache entries - moved to background.go
// This function is now handled by BackgroundProcessor

// Cache helper functions for memory operations

// getFromCache retrieves data from cache (placeholder)
func (ms *MemoryService) getFromCache(key string) interface{} {
	// Placeholder for cache get
	return nil
}

// cacheMemories stores memories in cache (placeholder)
func (ms *MemoryService) cacheMemories(key string, memories []*Memory) {
	// Placeholder for cache set
	ms.logger.WithField("cacheKey", key).Debug("Caching memories")
}

// invalidateUserCache removes user-specific cache entries
func (ms *MemoryService) invalidateUserCache(userID int64) {
	// Placeholder for cache invalidation
	ms.logger.WithField("userId", userID).Debug("Invalidating user cache")
}