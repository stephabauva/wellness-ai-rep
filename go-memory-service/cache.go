package main

import (
	"runtime"
	"sync"
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

// cacheCleanupRoutine runs periodic cleanup of expired cache entries
func (ms *MemoryService) cacheCleanupRoutine() {
	defer ms.wg.Done()
	
	ticker := time.NewTicker(ms.config.CleanupInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			removed := ms.similarityCache.Cleanup()
			if removed > 0 {
				ms.logger.WithField("removed_entries", removed).Debug("Cache cleanup completed")
			}
			
			// Force garbage collection if cache cleanup removed many entries
			if removed > 1000 {
				runtime.GC()
			}
			
		case <-ms.shutdown:
			return
		}
	}
}

// metricsRoutine collects and updates service metrics
func (ms *MemoryService) metricsRoutine() {
	defer ms.wg.Done()
	
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			ms.updateMetrics()
			
		case <-ms.shutdown:
			return
		}
	}
}

// updateMetrics collects current service metrics
func (ms *MemoryService) updateMetrics() {
	ms.statsMutex.Lock()
	defer ms.statsMutex.Unlock()
	
	// Update cache statistics
	cacheStats := ms.similarityCache.GetStats()
	ms.stats.CacheSize = cacheStats["size"].(int)
	ms.stats.CacheHitRate = cacheStats["hit_rate"].(float64)
	
	// Update memory usage
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	ms.stats.MemoryUsageMB = float64(memStats.Alloc) / 1024 / 1024
	
	// Update goroutine count
	ms.stats.GoroutineCount = runtime.NumGoroutine()
	
	// Update uptime
	ms.stats.Uptime = time.Since(ms.startTime)
	
	// Update timestamp
	ms.stats.Timestamp = time.Now()
}

// updateTaskStats updates statistics for processed tasks
func (ms *MemoryService) updateTaskStats(taskType string, duration time.Duration) {
	ms.statsMutex.Lock()
	defer ms.statsMutex.Unlock()
	
	// Update average processing time
	currentAvg := ms.stats.AverageProcessingTime
	totalTasks := ms.stats.ProcessedTasks + 1
	
	newDuration := float64(duration.Milliseconds())
	ms.stats.AverageProcessingTime = (currentAvg*float64(ms.stats.ProcessedTasks) + newDuration) / float64(totalTasks)
	
	// Update task type statistics
	ms.stats.TaskTypeStats[taskType]++
}

// updateSimilarityStats updates similarity calculation statistics
func (ms *MemoryService) updateSimilarityStats() {
	ms.statsMutex.Lock()
	defer ms.statsMutex.Unlock()
	
	ms.stats.TotalSimilarityCalcs++
}

// updatePerformanceMetric updates a specific performance metric
func (ms *MemoryService) updatePerformanceMetric(metric string, value float64) {
	ms.statsMutex.Lock()
	defer ms.statsMutex.Unlock()
	
	ms.stats.PerformanceMetrics[metric] = value
}

// GetStats returns current service statistics
func (ms *MemoryService) GetStats() ServiceStats {
	ms.statsMutex.RLock()
	defer ms.statsMutex.RUnlock()
	
	// Create a copy to avoid race conditions
	statsCopy := *ms.stats
	statsCopy.QueueSize = len(ms.taskQueue)
	
	return statsCopy
}

// Shutdown gracefully shuts down the memory service
func (ms *MemoryService) Shutdown() {
	ms.logger.Info("Shutting down memory service...")
	
	// Signal shutdown to all goroutines
	close(ms.shutdown)
	
	// Shutdown worker pool
	close(ms.workerPool.shutdown)
	
	// Wait for workers to finish with timeout
	done := make(chan struct{})
	go func() {
		ms.workerPool.wg.Wait()
		close(done)
	}()
	
	select {
	case <-done:
		ms.logger.Info("Worker pool shutdown completed")
	case <-time.After(ms.config.WorkerPool.ShutdownTimeout):
		ms.logger.Warn("Worker pool shutdown timed out")
	}
	
	// Wait for other background goroutines
	ms.wg.Wait()
	
	ms.logger.Info("Memory service shutdown completed")
}