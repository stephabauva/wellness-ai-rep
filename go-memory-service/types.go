package main

import (
	"sync"
	"time"
)

// Request/Response types for API endpoints

// SimilarityRequest represents a request to calculate similarity between two vectors
type SimilarityRequest struct {
	VectorA []float64 `json:"vectorA"`
	VectorB []float64 `json:"vectorB"`
}

// SimilarityResponse represents the response from similarity calculation
type SimilarityResponse struct {
	Similarity float64   `json:"similarity"`
	Timestamp  time.Time `json:"timestamp"`
}

// BatchSimilarityRequest represents a request to calculate similarity between one vector and many
type BatchSimilarityRequest struct {
	BaseVector []float64   `json:"baseVector"`
	Vectors    [][]float64 `json:"vectors"`
}

// BatchSimilarityResponse represents the response from batch similarity calculation
type BatchSimilarityResponse struct {
	Results   []float64 `json:"results"`
	Timestamp time.Time `json:"timestamp"`
}

// ContextualMemoryRequest represents a request to get contextual memories
type ContextualMemoryRequest struct {
	UserID              int         `json:"userId"`
	ContextEmbedding    []float64   `json:"contextEmbedding"`
	UserMemories        []Memory    `json:"userMemories"`
	SimilarityThreshold float64     `json:"similarityThreshold"`
	MaxResults          int         `json:"maxResults"`
}

// ProcessMemoryRequest represents a request for background memory processing
type ProcessMemoryRequest struct {
	Type     string                 `json:"type"`
	Priority int                    `json:"priority"`
	Payload  map[string]interface{} `json:"payload"`
}

// EmbeddingRequest represents a request for embedding processing
type EmbeddingRequest struct {
	Text      string    `json:"text"`
	Operation string    `json:"operation"` // "normalize", "validate", "compare"
	Vector    []float64 `json:"vector,omitempty"`
}

// EmbeddingResponse represents the response from embedding processing
type EmbeddingResponse struct {
	IsValid    bool      `json:"isValid"`
	Normalized []float64 `json:"normalized,omitempty"`
	Magnitude  float64   `json:"magnitude,omitempty"`
	Timestamp  time.Time `json:"timestamp"`
}

// Memory represents a memory entry with embeddings
type Memory struct {
	ID              string    `json:"id"`
	UserID          int       `json:"userId"`
	Content         string    `json:"content"`
	Category        string    `json:"category"`
	ImportanceScore float64   `json:"importanceScore"`
	Keywords        []string  `json:"keywords"`
	Embedding       []float64 `json:"embedding"`
	CreatedAt       time.Time `json:"createdAt"`
	AccessCount     int       `json:"accessCount"`
	LastAccessed    time.Time `json:"lastAccessed"`
	IsActive        bool      `json:"isActive"`
}

// RelevantMemory represents a memory with relevance score
type RelevantMemory struct {
	Memory
	RelevanceScore   float64 `json:"relevanceScore"`
	RetrievalReason  string  `json:"retrievalReason"`
}

// BackgroundTask represents a task in the processing queue
type BackgroundTask struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Priority  int                    `json:"priority"`
	Payload   map[string]interface{} `json:"payload"`
	CreatedAt time.Time              `json:"createdAt"`
	Status    string                 `json:"status"` // "pending", "processing", "completed", "failed"
}

// ServiceStats represents memory service statistics
type ServiceStats struct {
	QueueSize              int                    `json:"queueSize"`
	ProcessedTasks         int64                  `json:"processedTasks"`
	FailedTasks            int64                  `json:"failedTasks"`
	ActiveWorkers          int                    `json:"activeWorkers"`
	MaxWorkers             int                    `json:"maxWorkers"`
	CacheSize              int                    `json:"cacheSize"`
	CacheHitRate           float64                `json:"cacheHitRate"`
	AverageProcessingTime  float64                `json:"averageProcessingTime"`
	TotalSimilarityCalcs   int64                  `json:"totalSimilarityCalcs"`
	TotalEmbeddingOps      int64                  `json:"totalEmbeddingOps"`
	MemoryUsageMB          float64                `json:"memoryUsageMB"`
	GoroutineCount         int                    `json:"goroutineCount"`
	Uptime                 time.Duration          `json:"uptime"`
	TaskTypeStats          map[string]int64       `json:"taskTypeStats"`
	PerformanceMetrics     map[string]float64     `json:"performanceMetrics"`
	Timestamp              time.Time              `json:"timestamp"`
}

// CacheEntry represents a cached similarity calculation
type CacheEntry struct {
	Similarity float64   `json:"similarity"`
	Timestamp  time.Time `json:"timestamp"`
	AccessCount int      `json:"accessCount"`
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

// WorkerPool configuration
type WorkerPoolConfig struct {
	MaxWorkers      int           `json:"maxWorkers"`
	QueueSize       int           `json:"queueSize"`
	WorkerTimeout   time.Duration `json:"workerTimeout"`
	ShutdownTimeout time.Duration `json:"shutdownTimeout"`
}

// MemoryServiceConfig represents configuration for the memory service
type MemoryServiceConfig struct {
	CacheSize           int           `json:"cacheSize"`
	CacheTTL            time.Duration `json:"cacheTTL"`
	CleanupInterval     time.Duration `json:"cleanupInterval"`
	WorkerPool          WorkerPoolConfig `json:"workerPool"`
	SimilarityThreshold float64       `json:"similarityThreshold"`
	EnableMetrics       bool          `json:"enableMetrics"`
	EnableProfiling     bool          `json:"enableProfiling"`
}

// Phase 4: Advanced Features Types

// MemoryRelationship represents a relationship between two memories
type MemoryRelationship struct {
	ID               string    `json:"id"`
	UserID           int64     `json:"userId"`
	SourceMemoryID   string    `json:"sourceMemoryId"`
	TargetMemoryID   string    `json:"targetMemoryId"`
	RelationshipType string    `json:"relationshipType"` // "duplicate", "related", "builds_on", "contradicts", "supports"
	Strength         float64   `json:"strength"`         // 0.0 to 1.0
	CreatedAt        time.Time `json:"createdAt"`
	Confidence       float64   `json:"confidence"`       // AI confidence in this relationship
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// Note: MemoryCandidate is defined in deduplication.go to avoid duplication

// ConsolidationRequest represents a request to consolidate memories
type ConsolidationRequest struct {
	UserID           int64    `json:"userId"`
	SourceMemoryIDs  []string `json:"sourceMemoryIds"`
	ConsolidationType string  `json:"consolidationType"` // "merge", "link", "supersede"
	Reason           string   `json:"reason"`
}

// ConsolidationResult represents the result of memory consolidation
type ConsolidationResult struct {
	Success          bool                   `json:"success"`
	NewMemoryID      string                 `json:"newMemoryId,omitempty"`
	ConsolidatedIDs  []string               `json:"consolidatedIds"`
	ConsolidationType string                `json:"consolidationType"`
	Reason           string                 `json:"reason"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	Timestamp        time.Time              `json:"timestamp"`
}

// PerformanceMetrics represents advanced performance monitoring
type PerformanceMetrics struct {
	RelationshipDetection struct {
		TotalProcessed    int64         `json:"totalProcessed"`
		AverageTime       time.Duration `json:"averageTime"`
		SuccessRate       float64       `json:"successRate"`
		LastProcessedAt   time.Time     `json:"lastProcessedAt"`
	} `json:"relationshipDetection"`
	
	Consolidation struct {
		TotalConsolidations int64         `json:"totalConsolidations"`
		AverageTime         time.Duration `json:"averageTime"`
		SuccessRate         float64       `json:"successRate"`
		LastConsolidatedAt  time.Time     `json:"lastConsolidatedAt"`
	} `json:"consolidation"`
	
	MemoryOperations struct {
		CreatedPerMinute    float64   `json:"createdPerMinute"`
		QueriedPerMinute    float64   `json:"queriedPerMinute"`
		UpdatedPerMinute    float64   `json:"updatedPerMinute"`
		DeletedPerMinute    float64   `json:"deletedPerMinute"`
		LastOperationAt     time.Time `json:"lastOperationAt"`
	} `json:"memoryOperations"`
	
	SystemHealth struct {
		MemoryUsageMB       float64   `json:"memoryUsageMB"`
		GoroutineCount      int       `json:"goroutineCount"`
		DatabaseConnections int       `json:"databaseConnections"`
		CacheHitRate        float64   `json:"cacheHitRate"`
		ResponseTimes       []float64 `json:"responseTimes"` // Last 100 response times
		ErrorRate           float64   `json:"errorRate"`
		Uptime              time.Duration `json:"uptime"`
		LastHealthCheck     time.Time `json:"lastHealthCheck"`
	} `json:"systemHealth"`
}