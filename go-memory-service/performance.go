package main

import (
	"context"
	"runtime"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// PerformanceMonitor handles advanced performance monitoring and metrics collection
type PerformanceMonitor struct {
	logger           *logrus.Logger
	startTime        time.Time
	mutex            sync.RWMutex
	responseTimes    []float64
	maxResponseTimes int
	
	// Counters for various operations
	counters struct {
		// Memory operations
		memoriesCreated   int64
		memoriesQueried   int64
		memoriesUpdated   int64
		memoriesDeleted   int64
		
		// Relationship operations
		relationshipsDetected int64
		relationshipErrors    int64
		
		// Consolidation operations
		consolidationsCompleted int64
		consolidationErrors     int64
		
		// Error tracking
		totalErrors int64
		
		// Request tracking
		totalRequests int64
	}
	
	// Timing tracking
	timings struct {
		relationshipDetection []time.Duration
		consolidationTimes    []time.Duration
		memoryOperations      []time.Duration
	}
	
	// System health tracking
	health struct {
		lastHealthCheck     time.Time
		memoryUsageMB       float64
		goroutineCount      int
		databaseConnections int
		cacheHitRate        float64
		errorRate           float64
	}
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(logger *logrus.Logger) *PerformanceMonitor {
	pm := &PerformanceMonitor{
		logger:           logger,
		startTime:        time.Now(),
		maxResponseTimes: 100,
	}
	
	// Initialize slices
	pm.responseTimes = make([]float64, 0, pm.maxResponseTimes)
	pm.timings.relationshipDetection = make([]time.Duration, 0, 50)
	pm.timings.consolidationTimes = make([]time.Duration, 0, 50)
	pm.timings.memoryOperations = make([]time.Duration, 0, 100)
	
	// Start background health monitoring
	go pm.startHealthMonitoring()
	
	return pm
}

// RecordMemoryOperation records metrics for memory operations
func (pm *PerformanceMonitor) RecordMemoryOperation(operationType string, duration time.Duration) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	switch operationType {
	case "create":
		pm.counters.memoriesCreated++
	case "query":
		pm.counters.memoriesQueried++
	case "update":
		pm.counters.memoriesUpdated++
	case "delete":
		pm.counters.memoriesDeleted++
	}
	
	// Record timing
	pm.timings.memoryOperations = append(pm.timings.memoryOperations, duration)
	if len(pm.timings.memoryOperations) > 100 {
		pm.timings.memoryOperations = pm.timings.memoryOperations[1:]
	}
	
	// Log slow operations
	if duration > 500*time.Millisecond {
		pm.logger.WithFields(logrus.Fields{
			"operation": operationType,
			"duration":  duration.Milliseconds(),
		}).Warn("Slow memory operation detected")
	}
}

// RecordRelationshipDetection records metrics for relationship detection
func (pm *PerformanceMonitor) RecordRelationshipDetection(duration time.Duration, success bool) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	if success {
		pm.counters.relationshipsDetected++
	} else {
		pm.counters.relationshipErrors++
	}
	
	// Record timing
	pm.timings.relationshipDetection = append(pm.timings.relationshipDetection, duration)
	if len(pm.timings.relationshipDetection) > 50 {
		pm.timings.relationshipDetection = pm.timings.relationshipDetection[1:]
	}
}

// RecordConsolidation records metrics for consolidation operations
func (pm *PerformanceMonitor) RecordConsolidation(duration time.Duration, success bool) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	if success {
		pm.counters.consolidationsCompleted++
	} else {
		pm.counters.consolidationErrors++
	}
	
	// Record timing
	pm.timings.consolidationTimes = append(pm.timings.consolidationTimes, duration)
	if len(pm.timings.consolidationTimes) > 50 {
		pm.timings.consolidationTimes = pm.timings.consolidationTimes[1:]
	}
}

// RecordHTTPRequest records metrics for HTTP requests
func (pm *PerformanceMonitor) RecordHTTPRequest(duration time.Duration, statusCode int) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	pm.counters.totalRequests++
	
	// Record response time
	responseTimeMs := float64(duration.Nanoseconds()) / 1e6
	pm.responseTimes = append(pm.responseTimes, responseTimeMs)
	if len(pm.responseTimes) > pm.maxResponseTimes {
		pm.responseTimes = pm.responseTimes[1:]
	}
	
	// Count errors (4xx and 5xx status codes)
	if statusCode >= 400 {
		pm.counters.totalErrors++
	}
}

// RecordError records an error occurrence
func (pm *PerformanceMonitor) RecordError(errorType string, err error) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	pm.counters.totalErrors++
	
	pm.logger.WithFields(logrus.Fields{
		"errorType": errorType,
		"error":     err.Error(),
	}).Error("Error recorded by performance monitor")
}

// GetMetrics returns current performance metrics
func (pm *PerformanceMonitor) GetMetrics() *PerformanceMetrics {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()
	
	now := time.Now()
	uptime := now.Sub(pm.startTime)
	
	metrics := &PerformanceMetrics{}
	
	// Relationship detection metrics
	metrics.RelationshipDetection.TotalProcessed = pm.counters.relationshipsDetected
	metrics.RelationshipDetection.AverageTime = pm.calculateAverageTime(pm.timings.relationshipDetection)
	metrics.RelationshipDetection.SuccessRate = pm.calculateSuccessRate(pm.counters.relationshipsDetected, pm.counters.relationshipErrors)
	if len(pm.timings.relationshipDetection) > 0 {
		metrics.RelationshipDetection.LastProcessedAt = now.Add(-pm.timings.relationshipDetection[len(pm.timings.relationshipDetection)-1])
	}
	
	// Consolidation metrics
	metrics.Consolidation.TotalConsolidations = pm.counters.consolidationsCompleted
	metrics.Consolidation.AverageTime = pm.calculateAverageTime(pm.timings.consolidationTimes)
	metrics.Consolidation.SuccessRate = pm.calculateSuccessRate(pm.counters.consolidationsCompleted, pm.counters.consolidationErrors)
	if len(pm.timings.consolidationTimes) > 0 {
		metrics.Consolidation.LastConsolidatedAt = now.Add(-pm.timings.consolidationTimes[len(pm.timings.consolidationTimes)-1])
	}
	
	// Memory operations metrics
	minutesUptime := uptime.Minutes()
	if minutesUptime > 0 {
		metrics.MemoryOperations.CreatedPerMinute = float64(pm.counters.memoriesCreated) / minutesUptime
		metrics.MemoryOperations.QueriedPerMinute = float64(pm.counters.memoriesQueried) / minutesUptime
		metrics.MemoryOperations.UpdatedPerMinute = float64(pm.counters.memoriesUpdated) / minutesUptime
		metrics.MemoryOperations.DeletedPerMinute = float64(pm.counters.memoriesDeleted) / minutesUptime
	}
	metrics.MemoryOperations.LastOperationAt = now // Approximation
	
	// System health metrics
	metrics.SystemHealth.MemoryUsageMB = pm.health.memoryUsageMB
	metrics.SystemHealth.GoroutineCount = pm.health.goroutineCount
	metrics.SystemHealth.DatabaseConnections = pm.health.databaseConnections
	metrics.SystemHealth.CacheHitRate = pm.health.cacheHitRate
	metrics.SystemHealth.ResponseTimes = make([]float64, len(pm.responseTimes))
	copy(metrics.SystemHealth.ResponseTimes, pm.responseTimes)
	metrics.SystemHealth.ErrorRate = pm.calculateErrorRate()
	metrics.SystemHealth.Uptime = uptime
	metrics.SystemHealth.LastHealthCheck = pm.health.lastHealthCheck
	
	return metrics
}

// GetDetailedStats returns detailed statistics for monitoring dashboard
func (pm *PerformanceMonitor) GetDetailedStats(ctx context.Context) (map[string]interface{}, error) {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()
	
	now := time.Now()
	uptime := now.Sub(pm.startTime)
	
	// Calculate percentiles for response times
	p50, p95, p99 := pm.calculatePercentiles(pm.responseTimes)
	
	stats := map[string]interface{}{
		"uptime": map[string]interface{}{
			"seconds":     uptime.Seconds(),
			"humanReadable": uptime.String(),
			"startTime":   pm.startTime,
		},
		"requests": map[string]interface{}{
			"total":           pm.counters.totalRequests,
			"errors":          pm.counters.totalErrors,
			"errorRate":       pm.calculateErrorRate(),
			"requestsPerSec":  pm.calculateRequestsPerSecond(uptime),
		},
		"responseTimes": map[string]interface{}{
			"count":       len(pm.responseTimes),
			"p50":         p50,
			"p95":         p95,
			"p99":         p99,
			"average":     pm.calculateAverageResponseTime(),
		},
		"memoryOperations": map[string]interface{}{
			"created": pm.counters.memoriesCreated,
			"queried": pm.counters.memoriesQueried,
			"updated": pm.counters.memoriesUpdated,
			"deleted": pm.counters.memoriesDeleted,
			"total":   pm.counters.memoriesCreated + pm.counters.memoriesQueried + pm.counters.memoriesUpdated + pm.counters.memoriesDeleted,
		},
		"relationships": map[string]interface{}{
			"detected":    pm.counters.relationshipsDetected,
			"errors":      pm.counters.relationshipErrors,
			"successRate": pm.calculateSuccessRate(pm.counters.relationshipsDetected, pm.counters.relationshipErrors),
			"averageTime": pm.calculateAverageTime(pm.timings.relationshipDetection).Milliseconds(),
		},
		"consolidation": map[string]interface{}{
			"completed":   pm.counters.consolidationsCompleted,
			"errors":      pm.counters.consolidationErrors,
			"successRate": pm.calculateSuccessRate(pm.counters.consolidationsCompleted, pm.counters.consolidationErrors),
			"averageTime": pm.calculateAverageTime(pm.timings.consolidationTimes).Milliseconds(),
		},
		"systemHealth": map[string]interface{}{
			"memoryUsageMB":       pm.health.memoryUsageMB,
			"goroutineCount":      pm.health.goroutineCount,
			"databaseConnections": pm.health.databaseConnections,
			"cacheHitRate":        pm.health.cacheHitRate,
			"lastHealthCheck":     pm.health.lastHealthCheck,
		},
	}
	
	return stats, nil
}

// startHealthMonitoring starts background health monitoring
func (pm *PerformanceMonitor) startHealthMonitoring() {
	ticker := time.NewTicker(30 * time.Second) // Check every 30 seconds
	defer ticker.Stop()
	
	for range ticker.C {
		pm.updateSystemHealth()
	}
}

// updateSystemHealth updates system health metrics
func (pm *PerformanceMonitor) updateSystemHealth() {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	// Get memory statistics
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	
	pm.health.lastHealthCheck = time.Now()
	pm.health.memoryUsageMB = float64(memStats.Alloc) / 1024 / 1024
	pm.health.goroutineCount = runtime.NumGoroutine()
	pm.health.errorRate = pm.calculateErrorRate()
	
	// Log health metrics periodically
	pm.logger.WithFields(logrus.Fields{
		"memoryMB":      pm.health.memoryUsageMB,
		"goroutines":    pm.health.goroutineCount,
		"errorRate":     pm.health.errorRate,
		"totalRequests": pm.counters.totalRequests,
	}).Debug("System health check")
}

// Helper functions

func (pm *PerformanceMonitor) calculateAverageTime(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}
	
	var total time.Duration
	for _, d := range durations {
		total += d
	}
	
	return total / time.Duration(len(durations))
}

func (pm *PerformanceMonitor) calculateSuccessRate(successes, errors int64) float64 {
	total := successes + errors
	if total == 0 {
		return 1.0
	}
	return float64(successes) / float64(total)
}

func (pm *PerformanceMonitor) calculateErrorRate() float64 {
	if pm.counters.totalRequests == 0 {
		return 0.0
	}
	return float64(pm.counters.totalErrors) / float64(pm.counters.totalRequests)
}

func (pm *PerformanceMonitor) calculateRequestsPerSecond(uptime time.Duration) float64 {
	seconds := uptime.Seconds()
	if seconds == 0 {
		return 0.0
	}
	return float64(pm.counters.totalRequests) / seconds
}

func (pm *PerformanceMonitor) calculateAverageResponseTime() float64 {
	if len(pm.responseTimes) == 0 {
		return 0.0
	}
	
	var total float64
	for _, rt := range pm.responseTimes {
		total += rt
	}
	
	return total / float64(len(pm.responseTimes))
}

func (pm *PerformanceMonitor) calculatePercentiles(values []float64) (p50, p95, p99 float64) {
	if len(values) == 0 {
		return 0, 0, 0
	}
	
	// Create a copy and sort it
	sorted := make([]float64, len(values))
	copy(sorted, values)
	
	// Simple bubble sort for small arrays
	for i := 0; i < len(sorted); i++ {
		for j := 0; j < len(sorted)-1-i; j++ {
			if sorted[j] > sorted[j+1] {
				sorted[j], sorted[j+1] = sorted[j+1], sorted[j]
			}
		}
	}
	
	// Calculate percentiles
	n := len(sorted)
	p50 = sorted[n*50/100]
	p95 = sorted[n*95/100]
	p99 = sorted[n*99/100]
	
	return p50, p95, p99
}

// ResetMetrics resets all metrics (useful for testing)
func (pm *PerformanceMonitor) ResetMetrics() {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()
	
	pm.startTime = time.Now()
	pm.responseTimes = pm.responseTimes[:0]
	pm.counters = struct {
		memoriesCreated         int64
		memoriesQueried         int64
		memoriesUpdated         int64
		memoriesDeleted         int64
		relationshipsDetected   int64
		relationshipErrors      int64
		consolidationsCompleted int64
		consolidationErrors     int64
		totalErrors             int64
		totalRequests           int64
	}{}
	pm.timings.relationshipDetection = pm.timings.relationshipDetection[:0]
	pm.timings.consolidationTimes = pm.timings.consolidationTimes[:0]
	pm.timings.memoryOperations = pm.timings.memoryOperations[:0]
	
	pm.logger.Info("Performance metrics reset")
}

// Shutdown gracefully shuts down the performance monitor
func (pm *PerformanceMonitor) Shutdown() {
	pm.logger.WithFields(logrus.Fields{
		"uptime":        time.Since(pm.startTime),
		"totalRequests": pm.counters.totalRequests,
		"totalErrors":   pm.counters.totalErrors,
	}).Info("Performance monitor shutting down")
}