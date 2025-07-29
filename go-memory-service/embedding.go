package main

import (
	"time"

	"github.com/sirupsen/logrus"
)

// EmbeddingProcessor handles embedding operations
type EmbeddingProcessor struct {
	similarityEngine *SimilarityEngine
	statsManager     *StatsManager
	logger           *logrus.Logger
}

// NewEmbeddingProcessor creates a new embedding processor
func NewEmbeddingProcessor(similarityEngine *SimilarityEngine, statsManager *StatsManager, logger *logrus.Logger) *EmbeddingProcessor {
	return &EmbeddingProcessor{
		similarityEngine: similarityEngine,
		statsManager:     statsManager,
		logger:           logger,
	}
}

// ProcessEmbedding handles embedding operations
func (ep *EmbeddingProcessor) ProcessEmbedding(req EmbeddingRequest) EmbeddingResponse {
	start := time.Now()
	defer func() {
		ep.statsManager.UpdatePerformanceMetric("embedding_processing_time", float64(time.Since(start).Milliseconds()))
	}()
	
	switch req.Operation {
	case "normalize":
		normalized := ep.similarityEngine.NormalizeVector(req.Vector)
		return EmbeddingResponse{
			IsValid:    true,
			Normalized: normalized,
			Magnitude:  ep.similarityEngine.VectorMagnitude(req.Vector),
			Timestamp:  time.Now(),
		}
	case "validate":
		isValid := ep.similarityEngine.ValidateVector(req.Vector)
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

// Helper functions for memory operations

// AddHighImportanceMemories adds recent high-importance memories to results
func (ep *EmbeddingProcessor) AddHighImportanceMemories(relevantMemories *[]RelevantMemory, userMemories []Memory) {
	// Find high-importance memories (score > 0.8)
	highImportanceMemories := make([]Memory, 0)
	for _, memory := range userMemories {
		if memory.ImportanceScore > 0.8 {
			highImportanceMemories = append(highImportanceMemories, memory)
		}
	}
	
	// Sort by creation date (most recent first)
	for i := 0; i < len(highImportanceMemories)-1; i++ {
		for j := i + 1; j < len(highImportanceMemories); j++ {
			if highImportanceMemories[j].CreatedAt.After(highImportanceMemories[i].CreatedAt) {
				highImportanceMemories[i], highImportanceMemories[j] = highImportanceMemories[j], highImportanceMemories[i]
			}
		}
	}
	
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

// InitializeDeduplication initializes the deduplication engine if needed
func (ep *EmbeddingProcessor) InitializeDeduplication(dedup **DeduplicationEngine, logger *logrus.Logger) {
	if *dedup == nil {
		*dedup = NewDeduplicationEngine()
		logger.Info("Initialized deduplication engine")
	}
}