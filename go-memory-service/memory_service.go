package main

import (
	"context"
	"fmt"
	"runtime"
	"sort"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// MemoryService provides high-performance memory operations
type MemoryService struct {
	config              *MemoryServiceConfig
	similarityEngine    *SimilarityEngine
	similarityCache     *SimilarityCache
	backgroundProcessor *BackgroundProcessor
	database            *DatabaseLayer
	statsManager        *StatsManager
	embeddingProcessor  *EmbeddingProcessor
	shutdown            chan struct{}
	wg                  sync.WaitGroup
	dedup               *DeduplicationEngine
	logger              *logrus.Logger
}


// NewMemoryService creates a new memory service instance with optimized configuration
func NewMemoryService() (*MemoryService, error) {
	config := &MemoryServiceConfig{
		CacheSize:           20000,  // Increased cache size for better hit rate
		CacheTTL:            2 * time.Hour,  // Longer TTL for stability
		CleanupInterval:     15 * time.Minute,  // More frequent cleanup
		SimilarityThreshold: 0.65,  // Slightly lower threshold for better recall
		EnableMetrics:       true,
		EnableProfiling:     false,
		WorkerPool: WorkerPoolConfig{
			MaxWorkers:      runtime.NumCPU() * 3,  // More workers for higher throughput
			QueueSize:       2000,  // Larger queue to handle bursts
			WorkerTimeout:   15 * time.Second,  // Reduced timeout for faster response
			ShutdownTimeout: 5 * time.Second,
		},
	}

	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	ms := &MemoryService{
		config:    config,
		shutdown:  make(chan struct{}),
		logger:    logger,
	}

	// Initialize similarity cache
	ms.similarityCache = &SimilarityCache{
		cache:   make(map[string]*CacheEntry),
		maxSize: config.CacheSize,
		ttl:     config.CacheTTL,
	}

	// Initialize similarity engine
	ms.similarityEngine = NewSimilarityEngine(ms.similarityCache, logger)

	// Initialize database layer
	ms.database = NewDatabaseLayer(logger)

	// Initialize stats manager
	ms.statsManager = NewStatsManager()
	ms.statsManager.SetSimilarityCache(ms.similarityCache)

	// Initialize background processor
	ms.backgroundProcessor = NewBackgroundProcessor(config, logger)
	ms.backgroundProcessor.SetMemoryService(ms)
	
	// Set background processor reference in stats manager
	ms.statsManager.SetBackgroundProcessor(ms.backgroundProcessor)
	
	// Initialize embedding processor
	ms.embeddingProcessor = NewEmbeddingProcessor(ms.similarityEngine, ms.statsManager, logger)

	// Start background services
	ms.startBackgroundServices()

	return ms, nil
}

// startBackgroundServices initializes all background goroutines
func (ms *MemoryService) startBackgroundServices() {
	// Start background processor
	ms.backgroundProcessor.Start()
	
	// Start metrics collection if enabled
	if ms.config.EnableMetrics {
		ms.backgroundProcessor.StartMetricsCollection()
	}
}

// Core similarity and background processing extracted to dedicated modules

// CalculateCosineSimilarity computes cosine similarity between two vectors
func (ms *MemoryService) CalculateCosineSimilarity(a, b []float64) float64 {
	similarity := ms.similarityEngine.CalculateCosineSimilarity(a, b)
	
	// Update statistics
	ms.statsManager.IncrementSimilarityCalcs(1)
	
	return similarity
}

// CalculateBatchSimilarity efficiently calculates similarity for multiple vectors
func (ms *MemoryService) CalculateBatchSimilarity(baseVector []float64, vectors [][]float64) []float64 {
	results := ms.similarityEngine.CalculateBatchSimilarity(baseVector, vectors)
	
	ms.statsManager.IncrementSimilarityCalcs(int64(len(vectors)))
	
	return results
}

// GetContextualMemories retrieves relevant memories using optimized algorithms
func (ms *MemoryService) GetContextualMemories(ctx context.Context, req ContextualMemoryRequest) ([]RelevantMemory, error) {
	start := time.Now()
	defer func() {
		ms.statsManager.UpdatePerformanceMetric("contextual_retrieval_time", float64(time.Since(start).Milliseconds()))
	}()

	if len(req.ContextEmbedding) == 0 || len(req.UserMemories) == 0 {
		return []RelevantMemory{}, nil
	}

	// Calculate similarities for all memories
	similarities := ms.CalculateBatchSimilarity(req.ContextEmbedding, ms.similarityEngine.ExtractEmbeddings(req.UserMemories))
	
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
	ms.embeddingProcessor.AddHighImportanceMemories(&relevantMemories, req.UserMemories)
	
	// Sort by relevance score and limit results
	sort.Slice(relevantMemories, func(i, j int) bool {
		return relevantMemories[i].RelevanceScore > relevantMemories[j].RelevanceScore
	})
	
	if len(relevantMemories) > req.MaxResults {
		relevantMemories = relevantMemories[:req.MaxResults]
	}
	
	return relevantMemories, nil
}



// AddBackgroundTask adds a task to the background processing queue
func (ms *MemoryService) AddBackgroundTask(req ProcessMemoryRequest) {
	if ms.backgroundProcessor != nil {
		ms.backgroundProcessor.AddBackgroundTask(req)
	}
}


// ProcessEmbedding handles embedding operations
func (ms *MemoryService) ProcessEmbedding(req EmbeddingRequest) EmbeddingResponse {
	return ms.embeddingProcessor.ProcessEmbedding(req)
}

// Core Memory CRUD Operations - Phase 2 Integration

// CreateMemory creates a new memory with deduplication
func (ms *MemoryService) CreateMemory(ctx context.Context, userID int64, content string) (*Memory, error) {
	start := time.Now()
	defer func() {
		ms.statsManager.UpdatePerformanceMetric("create_memory_time", float64(time.Since(start).Milliseconds()))
	}()

	ms.logger.WithFields(logrus.Fields{
		"userId": userID,
		"contentLength": len(content),
	}).Info("Creating new memory with deduplication")

	// Initialize deduplication engine if not exists
	ms.embeddingProcessor.InitializeDeduplication(&ms.dedup, ms.logger)

	// Get recent memories for deduplication comparison
	candidates, err := ms.database.GetRecentMemoriesForUser(ctx, userID, 50)
	if err != nil {
		ms.logger.WithError(err).Warn("Failed to get recent memories for deduplication")
		candidates = []MemoryCandidate{}
	}

	// Run deduplication check
	dedupResult := ms.dedup.CheckForDuplicate(content, candidates)
	
	switch dedupResult.Action {
	case ActionSkip:
		ms.logger.WithFields(logrus.Fields{
			"action": "skip",
			"existingId": dedupResult.ExistingMemoryID,
			"confidence": dedupResult.Confidence,
		}).Info("Skipping duplicate memory creation")
		
		// Return existing memory
		return ms.database.GetMemoryByID(ctx, dedupResult.ExistingMemoryID)
		
	case ActionMerge:
		ms.logger.WithFields(logrus.Fields{
			"action": "merge",
			"existingId": dedupResult.ExistingMemoryID,
			"confidence": dedupResult.Confidence,
		}).Info("Merging with existing memory")
		
		return ms.database.MergeWithExistingMemory(ctx, dedupResult.ExistingMemoryID, content)
		
	case ActionUpdate:
		ms.logger.WithFields(logrus.Fields{
			"action": "update",
			"existingId": dedupResult.ExistingMemoryID,
			"confidence": dedupResult.Confidence,
		}).Info("Updating existing memory")
		
		return ms.database.UpdateExistingMemoryContent(ctx, dedupResult.ExistingMemoryID, content)
	}

	// Create new memory (ActionCreate)
	memory := &Memory{
		ID:              ms.database.GenerateMemoryID(),
		UserID:          int(userID),
		Content:         content,
		Category:        "personal_context", // Default category
		ImportanceScore: 0.7,               // Default importance
		CreatedAt:       time.Now(),
		LastAccessed:    time.Now(),
		IsActive:        true,
		Keywords:        []string{},
		Embedding:       []float64{},
		AccessCount:     0,
	}

	// Store memory using database layer
	err = ms.database.StoreMemory(ctx, memory)
	if err != nil {
		return nil, fmt.Errorf("failed to store memory: %w", err)
	}

	// Generate embedding in background
	ms.AddBackgroundTask(ProcessMemoryRequest{
		Type:     "embedding_generation",
		Priority: 1, // normal priority
		Payload: map[string]interface{}{
			"memoryId": memory.ID,
			"content":  content,
		},
	})

	ms.logger.WithField("memoryId", memory.ID).Info("Successfully created new memory")
	return memory, nil
}

// GetMemoriesForUser retrieves memories for a specific user
func (ms *MemoryService) GetMemoriesForUser(ctx context.Context, userID int64, limit int) ([]*Memory, error) {
	start := time.Now()
	defer func() {
		ms.statsManager.UpdatePerformanceMetric("get_memories_time", float64(time.Since(start).Milliseconds()))
	}()

	// Check cache first
	cacheKey := fmt.Sprintf("user_memories:%d:%d", userID, limit)
	if cached := ms.getFromCache(cacheKey); cached != nil {
		if memories, ok := cached.([]*Memory); ok {
			return memories, nil
		}
	}

	// Get from database using database layer
	memories, err := ms.database.QueryMemoriesFromDB(ctx, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query memories: %w", err)
	}

	// Cache the result
	ms.cacheMemories(cacheKey, memories)

	return memories, nil
}

// UpdateMemory updates an existing memory
func (ms *MemoryService) UpdateMemory(ctx context.Context, memoryID string, updates map[string]interface{}) (*Memory, error) {
	start := time.Now()
	defer func() {
		ms.statsManager.UpdatePerformanceMetric("update_memory_time", float64(time.Since(start).Milliseconds()))
	}()

	// Get existing memory
	memory, err := ms.database.GetMemoryByID(ctx, memoryID)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if content, ok := updates["content"].(string); ok && content != "" {
		memory.Content = content
		// Update last accessed time when content changes
		memory.LastAccessed = time.Now()
	}
	
	if importance, ok := updates["importance"].(float64); ok {
		memory.ImportanceScore = importance
	}

	memory.LastAccessed = time.Now()
	memory.AccessCount++

	// Update in database using database layer
	err = ms.database.UpdateMemoryInDB(ctx, memory)
	if err != nil {
		return nil, fmt.Errorf("failed to update memory: %w", err)
	}

	// Clear user cache
	ms.invalidateUserCache(int64(memory.UserID))

	ms.logger.WithField("memoryId", memoryID).Info("Successfully updated memory")
	return memory, nil
}

// DeleteMemory soft-deletes a memory
func (ms *MemoryService) DeleteMemory(ctx context.Context, memoryID string) error {
	start := time.Now()
	defer func() {
		ms.statsManager.UpdatePerformanceMetric("delete_memory_time", float64(time.Since(start).Milliseconds()))
	}()

	// Get memory to check ownership
	memory, err := ms.database.GetMemoryByID(ctx, memoryID)
	if err != nil {
		return err
	}

	// Soft delete in database using database layer
	err = ms.database.SoftDeleteMemoryInDB(ctx, memoryID)
	if err != nil {
		return fmt.Errorf("failed to delete memory: %w", err)
	}

	// Clear caches
	ms.invalidateUserCache(int64(memory.UserID))

	ms.logger.WithField("memoryId", memoryID).Info("Successfully deleted memory")
	return nil
}

// Database operations now handled by DatabaseLayer




// updateTaskStats delegates to stats manager
func (ms *MemoryService) updateTaskStats(taskType string, duration time.Duration) {
	ms.statsManager.UpdateTaskStats(taskType, duration)
}

// updateMetrics delegates to stats manager
func (ms *MemoryService) updateMetrics() {
	ms.statsManager.UpdateMetrics()
}

// GetStats returns current service statistics
func (ms *MemoryService) GetStats() ServiceStats {
	return ms.statsManager.GetStats()
}

// Shutdown gracefully shuts down the memory service
func (ms *MemoryService) Shutdown() {
	ms.logger.Info("Shutting down memory service...")
	
	// Signal shutdown to all goroutines
	close(ms.shutdown)
	
	// Shutdown background processor
	if ms.backgroundProcessor != nil {
		ms.backgroundProcessor.Shutdown()
	}
	
	// Wait for other background goroutines
	ms.wg.Wait()
	
	ms.logger.Info("Memory service shutdown completed")
}

