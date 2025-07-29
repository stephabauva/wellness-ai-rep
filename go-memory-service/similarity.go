package main

import (
	"crypto/md5"
	"fmt"
	"math"
	"runtime"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// SimilarityEngine handles all vector similarity calculations
type SimilarityEngine struct {
	cache  *SimilarityCache
	logger *logrus.Logger
}

// NewSimilarityEngine creates a new similarity calculation engine
func NewSimilarityEngine(cache *SimilarityCache, logger *logrus.Logger) *SimilarityEngine {
	return &SimilarityEngine{
		cache:  cache,
		logger: logger,
	}
}

// CalculateCosineSimilarity computes cosine similarity between two vectors
func (se *SimilarityEngine) CalculateCosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0.0
	}

	// Check cache first
	cacheKey := se.createVectorCacheKey(a, b)
	if cached := se.cache.Get(cacheKey); cached != nil {
		return cached.Similarity
	}

	// Calculate similarity using optimized algorithm
	similarity := se.fastCosineSimilarity(a, b)
	
	// Cache the result
	se.cache.Set(cacheKey, &CacheEntry{
		Similarity:  similarity,
		Timestamp:   time.Now(),
		AccessCount: 1,
	})
	
	return similarity
}

// fastCosineSimilarity provides optimized cosine similarity calculation
func (se *SimilarityEngine) fastCosineSimilarity(a, b []float64) float64 {
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

// CalculateBatchSimilarity efficiently calculates similarity for multiple vectors with optimized thresholds
func (se *SimilarityEngine) CalculateBatchSimilarity(baseVector []float64, vectors [][]float64) []float64 {
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
	
	// Optimized threshold for parallel processing (reduced from 100 to 50)
	if len(vectors) > 50 {
		return se.parallelBatchSimilarity(baseVector, vectors, baseNorm)
	}
	
	// Sequential processing for smaller batches with cache optimization
	for i, vector := range vectors {
		// Check cache first for frequently calculated similarities
		cacheKey := se.createVectorCacheKey(baseVector, vector)
		if cached := se.cache.Get(cacheKey); cached != nil {
			results[i] = cached.Similarity
			continue
		}
		
		similarity := se.fastCosineSimilarityWithNorm(baseVector, vector, baseNorm)
		results[i] = similarity
		
		// Cache the result for future use
		se.cache.Set(cacheKey, &CacheEntry{
			Similarity:  similarity,
			Timestamp:   time.Now(),
			AccessCount: 1,
		})
	}
	
	return results
}

// parallelBatchSimilarity uses optimized goroutines for large batch processing
func (se *SimilarityEngine) parallelBatchSimilarity(baseVector []float64, vectors [][]float64, baseNorm float64) []float64 {
	results := make([]float64, len(vectors))
	numWorkers := runtime.NumCPU() * 2  // Increased worker count for better parallelization
	chunkSize := len(vectors) / numWorkers
	
	if chunkSize == 0 {
		chunkSize = 1
	}
	
	// Ensure minimum chunk size for efficiency
	if chunkSize < 10 && len(vectors) > 20 {
		chunkSize = 10
		numWorkers = len(vectors) / chunkSize
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
				// Check cache first in parallel processing
				cacheKey := se.createVectorCacheKey(baseVector, vectors[j])
				if cached := se.cache.Get(cacheKey); cached != nil {
					results[j] = cached.Similarity
					continue
				}
				
				similarity := se.fastCosineSimilarityWithNorm(baseVector, vectors[j], baseNorm)
				results[j] = similarity
				
				// Cache the result (thread-safe)
				se.cache.Set(cacheKey, &CacheEntry{
					Similarity:  similarity,
					Timestamp:   time.Now(),
					AccessCount: 1,
				})
			}
		}(i, end)
	}
	
	wg.Wait()
	return results
}

// fastCosineSimilarityWithNorm calculates similarity with pre-computed base norm
func (se *SimilarityEngine) fastCosineSimilarityWithNorm(a, b []float64, aNorm float64) float64 {
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

// createVectorCacheKey creates an optimized hash-based cache key for vector pairs
func (se *SimilarityEngine) createVectorCacheKey(a, b []float64) string {
	// Use fewer elements for faster hash generation (reduced from 10 to 6)
	hashInput := ""
	elementsToUse := min(6, len(a))
	
	for i := 0; i < elementsToUse; i++ {
		hashInput += fmt.Sprintf("%.2f", a[i])  // Reduced precision for better performance
	}
	hashInput += "|"
	for i := 0; i < min(6, len(b)); i++ {
		hashInput += fmt.Sprintf("%.2f", b[i])
	}
	
	// Use shorter hash for better memory efficiency
	hash := fmt.Sprintf("%x", md5.Sum([]byte(hashInput)))
	return hash[:16]  // Use first 16 characters for cache key
}

// Helper functions for vector operations

// normalizeVector normalizes a vector to unit length
func (se *SimilarityEngine) NormalizeVector(vector []float64) []float64 {
	magnitude := se.VectorMagnitude(vector)
	if magnitude == 0 {
		return vector
	}
	
	normalized := make([]float64, len(vector))
	for i, val := range vector {
		normalized[i] = val / magnitude
	}
	return normalized
}

// VectorMagnitude calculates the magnitude of a vector
func (se *SimilarityEngine) VectorMagnitude(vector []float64) float64 {
	var sum float64
	for _, val := range vector {
		sum += val * val
	}
	return math.Sqrt(sum)
}

// ValidateVector checks if a vector is valid (no NaN or Inf values)
func (se *SimilarityEngine) ValidateVector(vector []float64) bool {
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

// extractEmbeddings efficiently extracts embedding vectors from memories
func (se *SimilarityEngine) ExtractEmbeddings(memories []Memory) [][]float64 {
	embeddings := make([][]float64, len(memories))
	for i, memory := range memories {
		embeddings[i] = memory.Embedding
	}
	return embeddings
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}