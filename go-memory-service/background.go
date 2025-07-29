package main

import (
	"fmt"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// WorkerPool manages concurrent background task processing
type WorkerPool struct {
	workers     int
	maxWorkers  int
	taskQueue   chan BackgroundTask
	wg          sync.WaitGroup
	shutdown    chan struct{}
	logger      *logrus.Logger
}

// BackgroundProcessor handles background task processing
type BackgroundProcessor struct {
	taskQueue    chan BackgroundTask
	workerPool   *WorkerPool
	memoryService *MemoryService
	shutdown     chan struct{}
	wg           sync.WaitGroup
	logger       *logrus.Logger
}

// NewBackgroundProcessor creates a new background processor
func NewBackgroundProcessor(config *MemoryServiceConfig, logger *logrus.Logger) *BackgroundProcessor {
	bp := &BackgroundProcessor{
		taskQueue: make(chan BackgroundTask, config.WorkerPool.QueueSize),
		shutdown:  make(chan struct{}),
		logger:    logger,
	}

	// Initialize worker pool
	bp.workerPool = &WorkerPool{
		maxWorkers: config.WorkerPool.MaxWorkers,
		taskQueue:  bp.taskQueue,
		shutdown:   make(chan struct{}),
		logger:     logger,
	}

	return bp
}

// SetMemoryService sets the memory service reference for task processing
func (bp *BackgroundProcessor) SetMemoryService(ms *MemoryService) {
	bp.memoryService = ms
}

// Start initializes background processing workers
func (bp *BackgroundProcessor) Start() {
	bp.startWorkerPool()
	bp.logger.WithField("workers", bp.workerPool.maxWorkers).Info("Started background processor")
}

// startWorkerPool launches worker goroutines for background processing
func (bp *BackgroundProcessor) startWorkerPool() {
	for i := 0; i < bp.workerPool.maxWorkers; i++ {
		bp.workerPool.wg.Add(1)
		go bp.worker(i)
	}
}

// worker processes background tasks
func (bp *BackgroundProcessor) worker(id int) {
	defer bp.workerPool.wg.Done()

	for {
		select {
		case task := <-bp.taskQueue:
			start := time.Now()
			bp.processBackgroundTask(task)
			duration := time.Since(start)

			if bp.memoryService != nil {
				bp.memoryService.updateTaskStats(task.Type, duration)
			}

		case <-bp.workerPool.shutdown:
			bp.logger.WithField("worker_id", id).Info("Worker shutting down")
			return
		case <-bp.shutdown:
			return
		}
	}
}

// AddBackgroundTask adds a task to the background processing queue
func (bp *BackgroundProcessor) AddBackgroundTask(req ProcessMemoryRequest) {
	task := BackgroundTask{
		ID:        fmt.Sprintf("%d-%s", time.Now().UnixNano(), req.Type),
		Type:      req.Type,
		Priority:  req.Priority,
		Payload:   req.Payload,
		CreatedAt: time.Now(),
		Status:    "pending",
	}

	select {
	case bp.taskQueue <- task:
		// Task queued successfully - stats handled by background processor
	default:
		bp.logger.Warn("Task queue is full, dropping task")
	}
}

// processBackgroundTask handles individual background tasks
func (bp *BackgroundProcessor) processBackgroundTask(task BackgroundTask) {
	if bp.memoryService == nil {
		bp.logger.Error("Memory service not set, cannot process task")
		return
	}

	// Stats tracking handled by StatsManager
	defer func() {
		// Background task completed
	}()

	switch task.Type {
	case "similarity_calculation":
		bp.processSimilarityTask(task)
	case "embedding_generation":
		bp.processEmbeddingTask(task)
	case "memory_processing":
		bp.processMemoryTask(task)
	default:
		bp.logger.WithField("task_type", task.Type).Warn("Unknown task type")
		return
	}

	// Task processing complete - stats handled by updateTaskStats
}

// processSimilarityTask handles similarity calculation tasks
func (bp *BackgroundProcessor) processSimilarityTask(task BackgroundTask) {
	vectorA, okA := task.Payload["vectorA"].([]interface{})
	vectorB, okB := task.Payload["vectorB"].([]interface{})
	cacheKey, okC := task.Payload["cacheKey"].(string)

	if !okA || !okB || !okC {
		bp.logger.Error("Invalid similarity task payload")
		return
	}

	// Convert interface{} slices to float64 slices
	a := make([]float64, len(vectorA))
	b := make([]float64, len(vectorB))

	for i, v := range vectorA {
		if val, ok := v.(float64); ok {
			a[i] = val
		}
	}

	for i, v := range vectorB {
		if val, ok := v.(float64); ok {
			b[i] = val
		}
	}

	if bp.memoryService != nil {
		similarity := bp.memoryService.similarityEngine.CalculateCosineSimilarity(a, b)
		bp.memoryService.similarityCache.Set(cacheKey, &CacheEntry{
			Similarity:  similarity,
			Timestamp:   time.Now(),
			AccessCount: 1,
		})
	}
}

// processEmbeddingTask handles embedding processing tasks
func (bp *BackgroundProcessor) processEmbeddingTask(task BackgroundTask) {
	// Placeholder for embedding processing logic
	if bp.memoryService != nil {
		// Embedding processing stats would be handled by StatsManager
		bp.logger.Debug("Processing embedding task")
	}
}

// processMemoryTask handles memory processing tasks
func (bp *BackgroundProcessor) processMemoryTask(task BackgroundTask) {
	// Placeholder for memory processing logic
	// In a real implementation, this would handle memory extraction,
	// classification, and storage operations
}

// GetQueueSize returns current queue size
func (bp *BackgroundProcessor) GetQueueSize() int {
	return len(bp.taskQueue)
}

// Shutdown gracefully shuts down the background processor
func (bp *BackgroundProcessor) Shutdown() {
	bp.logger.Info("Shutting down background processor...")

	// Signal shutdown to all goroutines
	close(bp.shutdown)

	// Shutdown worker pool
	close(bp.workerPool.shutdown)

	// Wait for workers to finish with timeout
	done := make(chan struct{})
	go func() {
		bp.workerPool.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		bp.logger.Info("Background processor shutdown completed")
	case <-time.After(10 * time.Second):
		bp.logger.Warn("Background processor shutdown timed out")
	}
}

// metricsRoutine collects and updates service metrics
func (bp *BackgroundProcessor) metricsRoutine() {
	defer bp.wg.Done()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if bp.memoryService != nil {
				bp.memoryService.updateMetrics()
			}

		case <-bp.shutdown:
			return
		}
	}
}

// StartMetricsCollection starts background metrics collection
func (bp *BackgroundProcessor) StartMetricsCollection() {
	bp.wg.Add(1)
	go bp.metricsRoutine()
}

// updateTaskStats updates statistics for processed tasks
func (bp *BackgroundProcessor) updateTaskStats(taskType string, duration time.Duration) {
	if bp.memoryService == nil {
		return
	}

	// Delegate to memory service stats manager
	bp.memoryService.statsManager.UpdateTaskStats(taskType, duration)
}