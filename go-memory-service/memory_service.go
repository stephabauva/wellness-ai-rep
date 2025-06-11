package main

import (
	"context"
	"crypto/md5"
	"fmt"
	"math"
	"runtime"
	"sort"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// MemoryService provides high-performance memory operations
type MemoryService struct {
	// Configuration
	config *MemoryServiceConfig
	
	// Similarity cache for fast vector operations
	similarityCache *SimilarityCache
	
	// Background processing
	taskQueue    chan BackgroundTask
	workerPool   *WorkerPool
	
	// Statistics and metrics
	stats        *ServiceStats
	statsMutex   sync.RWMutex
	startTime    time.Time
	
	// Shutdown coordination
	shutdown     chan struct{}
	wg           sync.WaitGroup
	
	logger       *logrus.Logger
}

// SimilarityCache provides thread-safe caching for similarity calculations
type SimilarityCache struct {
	cache      map[string]*CacheEntry
	mutex      sync.RWMutex
	maxSize    int
	ttl        time.Duration
	hitCount   int64
	missCount  int64
}

// WorkerPool manages concurrent background task processing
type WorkerPool struct {
	workers     int
	maxWorkers  int
	taskQueue   chan BackgroundTask
	wg          sync.WaitGroup
	shutdown    chan struct{}
	logger      *logrus.Logger
}

// NewMemoryService creates a new memory service instance
func NewMemoryService() (*MemoryService, error) {
	config := &MemoryServiceConfig{
		CacheSize:           10000,
		CacheTTL:            time.Hour,
		CleanupInterval:     30 * time.Minute,
		SimilarityThreshold: 0.7,
		EnableMetrics:       true,
		EnableProfiling:     false,
		WorkerPool: WorkerPoolConfig{
			MaxWorkers:      runtime.NumCPU() * 2,
			QueueSize:       1000,
			WorkerTimeout:   30 * time.Second,
			ShutdownTimeout: 10 * time.Second,
		},
	}

	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	ms := &MemoryService{
		config:    config,
		taskQueue: make(chan BackgroundTask, config.WorkerPool.QueueSize),
		shutdown:  make(chan struct{}),
		startTime: time.Now(),
		logger:    logger,
		stats: &ServiceStats{
			TaskTypeStats:      make(map[string]int64),
			PerformanceMetrics: make(map[string]float64),
			MaxWorkers:         config.WorkerPool.MaxWorkers,
		},
	}

	// Initialize similarity cache
	ms.similarityCache = &SimilarityCache{
		cache:   make(map[string]*CacheEntry),
		maxSize: config.CacheSize,
		ttl:     config.CacheTTL,
	}

	// Initialize worker pool
	ms.workerPool = &WorkerPool{
		maxWorkers: config.WorkerPool.MaxWorkers,
		taskQueue:  ms.taskQueue,
		shutdown:   make(chan struct{}),
		logger:     logger,
	}

	// Start background services
	ms.startBackgroundServices()

	return ms, nil
}

// startBackgroundServices initializes all background goroutines
func (ms *MemoryService) startBackgroundServices() {
	// Start worker pool
	ms.startWorkerPool()
	
	// Start cache cleanup routine
	ms.wg.Add(1)
	go ms.cacheCleanupRoutine()
	
	// Start metrics collection
	if ms.config.EnableMetrics {
		ms.wg.Add(1)
		go ms.metricsRoutine()
	}
}

// startWorkerPool launches worker goroutines for background processing
func (ms *MemoryService) startWorkerPool() {
	for i := 0; i < ms.workerPool.maxWorkers; i++ {
		ms.workerPool.wg.Add(1)
		go ms.worker(i)
	}
	ms.logger.WithField("workers", ms.workerPool.maxWorkers).Info("Started worker pool")
}

// worker processes background tasks
func (ms *MemoryService) worker(id int) {
	defer ms.workerPool.wg.Done()
	
	for {
		select {
		case task := <-ms.taskQueue:
			start := time.Now()
			ms.processBackgroundTask(task)
			duration := time.Since(start)
			
			ms.updateTaskStats(task.Type, duration)
			
		case <-ms.workerPool.shutdown:
			ms.logger.WithField("worker_id", id).Info("Worker shutting down")
			return
		case <-ms.shutdown:
			return
		}
	}
}

// CalculateCosineSimilarity computes cosine similarity between two vectors
func (ms *MemoryService) CalculateCosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0.0
	}

	// Check cache first
	cacheKey := ms.createVectorCacheKey(a, b)
	if cached := ms.similarityCache.Get(cacheKey); cached != nil {
		return cached.Similarity
	}

	// Calculate similarity using optimized algorithm
	similarity := ms.fastCosineSimilarity(a, b)
	
	// Cache the result
	ms.similarityCache.Set(cacheKey, &CacheEntry{
		Similarity:  similarity,
		Timestamp:   time.Now(),
		AccessCount: 1,
	})

	// Update statistics
	ms.updateSimilarityStats()
	
	return similarity
}

// fastCosineSimilarity provides optimized cosine similarity calculation
func (ms *MemoryService) fastCosineSimilarity(a, b []float64) float64 {
	var dotProduct, normA, normB float64
	
	// Vectorized operations for better performance
	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	
	if normA == 0 || normB == 0 {
		return 0.0
	}
	
	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

// CalculateBatchSimilarity efficiently calculates similarity for multiple vectors
func (ms *MemoryService) CalculateBatchSimilarity(baseVector []float64, vectors [][]float64) []float64 {
	results := make([]float64, len(vectors))
	
	// Pre-calculate base vector norm for efficiency
	var baseNorm float64
	for _, val := range baseVector {
		baseNorm += val * val
	}
	baseNorm = math.Sqrt(baseNorm)
	
	if baseNorm == 0 {
		return results // All zeros
	}
	
	// Calculate similarities in parallel for large batches
	if len(vectors) > 100 {
		return ms.parallelBatchSimilarity(baseVector, vectors, baseNorm)
	}
	
	// Sequential processing for smaller batches
	for i, vector := range vectors {
		results[i] = ms.fastCosineSimilarityWithNorm(baseVector, vector, baseNorm)
	}
	
	ms.statsMutex.Lock()
	ms.stats.TotalSimilarityCalcs += int64(len(vectors))
	ms.statsMutex.Unlock()
	
	return results
}

// parallelBatchSimilarity uses goroutines for large batch processing
func (ms *MemoryService) parallelBatchSimilarity(baseVector []float64, vectors [][]float64, baseNorm float64) []float64 {
	results := make([]float64, len(vectors))
	numWorkers := runtime.NumCPU()
	chunkSize := len(vectors) / numWorkers
	
	if chunkSize == 0 {
		chunkSize = 1
	}
	
	var wg sync.WaitGroup
	
	for i := 0; i < len(vectors); i += chunkSize {
		end := i + chunkSize
		if end > len(vectors) {
			end = len(vectors)
		}
		
		wg.Add(1)
		go func(start, end int) {
			defer wg.Done()
			for j := start; j < end; j++ {
				results[j] = ms.fastCosineSimilarityWithNorm(baseVector, vectors[j], baseNorm)
			}
		}(i, end)
	}
	
	wg.Wait()
	return results
}

// fastCosineSimilarityWithNorm calculates similarity with pre-computed base norm
func (ms *MemoryService) fastCosineSimilarityWithNorm(a, b []float64, aNorm float64) float64 {
	if len(a) != len(b) || len(a) == 0 || aNorm == 0 {
		return 0.0
	}
	
	var dotProduct, bNorm float64
	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		bNorm += b[i] * b[i]
	}
	
	bNorm = math.Sqrt(bNorm)
	if bNorm == 0 {
		return 0.0
	}
	
	return dotProduct / (aNorm * bNorm)
}

// GetContextualMemories retrieves relevant memories using optimized algorithms
func (ms *MemoryService) GetContextualMemories(ctx context.Context, req ContextualMemoryRequest) ([]RelevantMemory, error) {
	start := time.Now()
	defer func() {
		ms.updatePerformanceMetric("contextual_retrieval_time", float64(time.Since(start).Milliseconds()))
	}()

	if len(req.ContextEmbedding) == 0 || len(req.UserMemories) == 0 {
		return []RelevantMemory{}, nil
	}

	// Calculate similarities for all memories
	similarities := ms.CalculateBatchSimilarity(req.ContextEmbedding, ms.extractEmbeddings(req.UserMemories))
	
	// Create relevant memories with scores
	relevantMemories := make([]RelevantMemory, 0, len(req.UserMemories))
	
	for i, memory := range req.UserMemories {
		if similarities[i] > req.SimilarityThreshold {
			relevantMemories = append(relevantMemories, RelevantMemory{
				Memory:          memory,
				RelevanceScore:  similarities[i] * memory.ImportanceScore,
				RetrievalReason: "semantic_similarity",
			})
		}
	}
	
	// Add high-importance recent memories
	ms.addHighImportanceMemories(&relevantMemories, req.UserMemories)
	
	// Sort by relevance score and limit results
	sort.Slice(relevantMemories, func(i, j int) bool {
		return relevantMemories[i].RelevanceScore > relevantMemories[j].RelevanceScore
	})
	
	if len(relevantMemories) > req.MaxResults {
		relevantMemories = relevantMemories[:req.MaxResults]
	}
	
	return relevantMemories, nil
}

// extractEmbeddings efficiently extracts embedding vectors from memories
func (ms *MemoryService) extractEmbeddings(memories []Memory) [][]float64 {
	embeddings := make([][]float64, len(memories))
	for i, memory := range memories {
		embeddings[i] = memory.Embedding
	}
	return embeddings
}

// addHighImportanceMemories adds recent high-importance memories to results
func (ms *MemoryService) addHighImportanceMemories(relevantMemories *[]RelevantMemory, userMemories []Memory) {
	// Find high-importance memories (score > 0.8)
	highImportanceMemories := make([]Memory, 0)
	for _, memory := range userMemories {
		if memory.ImportanceScore > 0.8 {
			highImportanceMemories = append(highImportanceMemories, memory)
		}
	}
	
	// Sort by creation date (most recent first)
	sort.Slice(highImportanceMemories, func(i, j int) bool {
		return highImportanceMemories[i].CreatedAt.After(highImportanceMemories[j].CreatedAt)
	})
	
	// Add top 3 recent high-importance memories if not already included
	count := 0
	for _, memory := range highImportanceMemories {
		if count >= 3 {
			break
		}
		
		// Check if already included
		found := false
		for _, existing := range *relevantMemories {
			if existing.ID == memory.ID {
				found = true
				break
			}
		}
		
		if !found {
			*relevantMemories = append(*relevantMemories, RelevantMemory{
				Memory:          memory,
				RelevanceScore:  memory.ImportanceScore,
				RetrievalReason: "high_importance",
			})
			count++
		}
	}
}

// AddBackgroundTask adds a task to the background processing queue
func (ms *MemoryService) AddBackgroundTask(req ProcessMemoryRequest) {
	task := BackgroundTask{
		ID:        fmt.Sprintf("%d-%s", time.Now().UnixNano(), req.Type),
		Type:      req.Type,
		Priority:  req.Priority,
		Payload:   req.Payload,
		CreatedAt: time.Now(),
		Status:    "pending",
	}
	
	select {
	case ms.taskQueue <- task:
		ms.statsMutex.Lock()
		ms.stats.QueueSize++
		ms.statsMutex.Unlock()
	default:
		ms.logger.Warn("Task queue is full, dropping task")
	}
}

// processBackgroundTask handles individual background tasks
func (ms *MemoryService) processBackgroundTask(task BackgroundTask) {
	ms.statsMutex.Lock()
	ms.stats.QueueSize--
	ms.stats.ActiveWorkers++
	ms.statsMutex.Unlock()
	
	defer func() {
		ms.statsMutex.Lock()
		ms.stats.ActiveWorkers--
		ms.statsMutex.Unlock()
	}()
	
	switch task.Type {
	case "similarity_calculation":
		ms.processSimilarityTask(task)
	case "embedding_generation":
		ms.processEmbeddingTask(task)
	case "memory_processing":
		ms.processMemoryTask(task)
	default:
		ms.logger.WithField("task_type", task.Type).Warn("Unknown task type")
		ms.statsMutex.Lock()
		ms.stats.FailedTasks++
		ms.statsMutex.Unlock()
		return
	}
	
	ms.statsMutex.Lock()
	ms.stats.ProcessedTasks++
	ms.stats.TaskTypeStats[task.Type]++
	ms.statsMutex.Unlock()
}

// processSimilarityTask handles similarity calculation tasks
func (ms *MemoryService) processSimilarityTask(task BackgroundTask) {
	vectorA, okA := task.Payload["vectorA"].([]interface{})
	vectorB, okB := task.Payload["vectorB"].([]interface{})
	cacheKey, okC := task.Payload["cacheKey"].(string)
	
	if !okA || !okB || !okC {
		ms.logger.Error("Invalid similarity task payload")
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
	
	similarity := ms.fastCosineSimilarity(a, b)
	ms.similarityCache.Set(cacheKey, &CacheEntry{
		Similarity:  similarity,
		Timestamp:   time.Now(),
		AccessCount: 1,
	})
}

// processEmbeddingTask handles embedding processing tasks
func (ms *MemoryService) processEmbeddingTask(task BackgroundTask) {
	// Placeholder for embedding processing logic
	ms.statsMutex.Lock()
	ms.stats.TotalEmbeddingOps++
	ms.statsMutex.Unlock()
}

// processMemoryTask handles memory processing tasks
func (ms *MemoryService) processMemoryTask(task BackgroundTask) {
	// Placeholder for memory processing logic
	// In a real implementation, this would handle memory extraction,
	// classification, and storage operations
}

// ProcessEmbedding handles embedding operations
func (ms *MemoryService) ProcessEmbedding(req EmbeddingRequest) EmbeddingResponse {
	start := time.Now()
	defer func() {
		ms.updatePerformanceMetric("embedding_processing_time", float64(time.Since(start).Milliseconds()))
	}()
	
	switch req.Operation {
	case "normalize":
		normalized := ms.normalizeVector(req.Vector)
		return EmbeddingResponse{
			IsValid:    true,
			Normalized: normalized,
			Magnitude:  ms.vectorMagnitude(req.Vector),
			Timestamp:  time.Now(),
		}
	case "validate":
		isValid := ms.validateVector(req.Vector)
		return EmbeddingResponse{
			IsValid:   isValid,
			Timestamp: time.Now(),
		}
	default:
		return EmbeddingResponse{
			IsValid:   false,
			Timestamp: time.Now(),
		}
	}
}

// Helper functions for vector operations
func (ms *MemoryService) normalizeVector(vector []float64) []float64 {
	magnitude := ms.vectorMagnitude(vector)
	if magnitude == 0 {
		return vector
	}
	
	normalized := make([]float64, len(vector))
	for i, val := range vector {
		normalized[i] = val / magnitude
	}
	return normalized
}

func (ms *MemoryService) vectorMagnitude(vector []float64) float64 {
	var sum float64
	for _, val := range vector {
		sum += val * val
	}
	return math.Sqrt(sum)
}

func (ms *MemoryService) validateVector(vector []float64) bool {
	if len(vector) == 0 {
		return false
	}
	
	for _, val := range vector {
		if math.IsNaN(val) || math.IsInf(val, 0) {
			return false
		}
	}
	return true
}

// createVectorCacheKey creates a hash-based cache key for vector pairs
func (ms *MemoryService) createVectorCacheKey(a, b []float64) string {
	// Use first few elements to create a lightweight hash
	hashInput := ""
	for i := 0; i < min(10, len(a)); i++ {
		hashInput += fmt.Sprintf("%.3f", a[i])
	}
	hashInput += "|"
	for i := 0; i < min(10, len(b)); i++ {
		hashInput += fmt.Sprintf("%.3f", b[i])
	}
	
	return fmt.Sprintf("%x", md5.Sum([]byte(hashInput)))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}