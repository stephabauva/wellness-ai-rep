package main

import (
	"runtime"
	"sync"
	"time"
)

// StatsManager handles all statistics and metrics collection
type StatsManager struct {
	stats        *ServiceStats
	statsMutex   sync.RWMutex
	startTime    time.Time
	similarityCache *SimilarityCache
	backgroundProcessor *BackgroundProcessor
}

// NewStatsManager creates a new statistics manager
func NewStatsManager() *StatsManager {
	return &StatsManager{
		stats: &ServiceStats{
			TaskTypeStats:      make(map[string]int64),
			PerformanceMetrics: make(map[string]float64),
		},
		startTime: time.Now(),
	}
}

// SetSimilarityCache sets the similarity cache reference for stats
func (sm *StatsManager) SetSimilarityCache(cache *SimilarityCache) {
	sm.similarityCache = cache
}

// SetBackgroundProcessor sets the background processor reference for stats
func (sm *StatsManager) SetBackgroundProcessor(bp *BackgroundProcessor) {
	sm.backgroundProcessor = bp
}

// UpdateTaskStats updates statistics for processed tasks
func (sm *StatsManager) UpdateTaskStats(taskType string, duration time.Duration) {
	sm.statsMutex.Lock()
	defer sm.statsMutex.Unlock()
	
	// Update average processing time
	currentAvg := sm.stats.AverageProcessingTime
	totalTasks := sm.stats.ProcessedTasks + 1
	
	newDuration := float64(duration.Milliseconds())
	sm.stats.AverageProcessingTime = (currentAvg*float64(sm.stats.ProcessedTasks) + newDuration) / float64(totalTasks)
	
	// Increment processed tasks count
	sm.stats.ProcessedTasks++
	
	// Update task type statistics
	sm.stats.TaskTypeStats[taskType]++
}

// UpdatePerformanceMetric updates a specific performance metric
func (sm *StatsManager) UpdatePerformanceMetric(metric string, value float64) {
	sm.statsMutex.Lock()
	defer sm.statsMutex.Unlock()
	
	sm.stats.PerformanceMetrics[metric] = value
}

// IncrementSimilarityCalcs increments the similarity calculation counter
func (sm *StatsManager) IncrementSimilarityCalcs(count int64) {
	sm.statsMutex.Lock()
	defer sm.statsMutex.Unlock()
	
	sm.stats.TotalSimilarityCalcs += count
}

// UpdateMetrics collects current service metrics
func (sm *StatsManager) UpdateMetrics() {
	sm.statsMutex.Lock()
	defer sm.statsMutex.Unlock()
	
	// Update cache statistics if available
	if sm.similarityCache != nil {
		cacheStats := sm.similarityCache.GetStats()
		sm.stats.CacheSize = cacheStats["size"].(int)
		sm.stats.CacheHitRate = cacheStats["hit_rate"].(float64)
	}
	
	// Update memory usage
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	sm.stats.MemoryUsageMB = float64(memStats.Alloc) / 1024 / 1024
	
	// Update goroutine count
	sm.stats.GoroutineCount = runtime.NumGoroutine()
	
	// Update uptime
	sm.stats.Uptime = time.Since(sm.startTime)
	
	// Update timestamp
	sm.stats.Timestamp = time.Now()
}

// GetStats returns current service statistics
func (sm *StatsManager) GetStats() ServiceStats {
	sm.statsMutex.RLock()
	defer sm.statsMutex.RUnlock()
	
	// Create a copy to avoid race conditions
	statsCopy := *sm.stats
	if sm.backgroundProcessor != nil {
		statsCopy.QueueSize = sm.backgroundProcessor.GetQueueSize()
	}
	
	return statsCopy
}