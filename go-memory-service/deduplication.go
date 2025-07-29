// Package memory provides semantic deduplication engine for memory entries
// This implementation creates a clean, from-scratch approach to semantic duplicate detection
// using Go's native concurrency and efficient caching patterns.

package main

import (
	"crypto/md5"
	"crypto/sha256"
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"
	"time"
)

// DeduplicationEngine handles semantic duplicate detection and memory consolidation
type DeduplicationEngine struct {
	// Semantic hash cache for fast duplicate lookup
	hashCache map[string]string
	hashMutex sync.RWMutex

	// Similarity calculation cache
	similarityCache map[string]float64
	simMutex        sync.RWMutex

	// Content normalization cache
	normalizedCache map[string]string
	normMutex       sync.RWMutex

	// Configuration
	similarityThreshold float64
	hashDimensions      int
	cacheTimeout        time.Duration

	// Cache cleanup
	lastCleanup time.Time
	cleanupMutex sync.Mutex
}

// DeduplicationResult represents the outcome of duplicate detection
type DeduplicationResult struct {
	Action           DeduplicationAction `json:"action"`
	ExistingMemoryID string             `json:"existing_memory_id,omitempty"`
	Confidence       float64            `json:"confidence"`
	Reasoning        string             `json:"reasoning"`
	SimilarityScore  float64            `json:"similarity_score,omitempty"`
}

// DeduplicationAction defines possible actions for duplicate handling
type DeduplicationAction string

const (
	ActionCreate DeduplicationAction = "create"
	ActionUpdate DeduplicationAction = "update" 
	ActionMerge  DeduplicationAction = "merge"
	ActionSkip   DeduplicationAction = "skip"
)

// MemoryCandidate represents a memory entry for comparison
type MemoryCandidate struct {
	ID          string    `json:"id"`
	Content     string    `json:"content"`
	Category    string    `json:"category"`
	Keywords    []string  `json:"keywords"`
	CreatedAt   time.Time `json:"created_at"`
	Embedding   []float64 `json:"embedding,omitempty"`
	SemanticHash string   `json:"semantic_hash,omitempty"`
}

// NewDeduplicationEngine creates a new deduplication engine with optimized defaults
func NewDeduplicationEngine() *DeduplicationEngine {
	return &DeduplicationEngine{
		hashCache:           make(map[string]string),
		similarityCache:     make(map[string]float64),
		normalizedCache:     make(map[string]string),
		similarityThreshold: 0.75, // Higher threshold for better precision
		hashDimensions:      32,    // Optimized for speed vs accuracy
		cacheTimeout:        30 * time.Minute,
		lastCleanup:         time.Now(),
	}
}

// GenerateSemanticHash creates a semantic fingerprint for content
func (de *DeduplicationEngine) GenerateSemanticHash(content string) string {
	// Check cache first
	contentKey := fmt.Sprintf("%x", md5.Sum([]byte(content)))
	
	de.hashMutex.RLock()
	if hash, exists := de.hashCache[contentKey]; exists {
		de.hashMutex.RUnlock()
		return hash
	}
	de.hashMutex.RUnlock()

	// Normalize content for semantic consistency
	normalized := de.normalizeContent(content)
	
	// Extract semantic features
	features := de.extractSemanticFeatures(normalized)
	
	// Create semantic hash from features
	hash := de.createHashFromFeatures(features)
	
	// Cache the result
	de.hashMutex.Lock()
	de.hashCache[contentKey] = hash
	de.hashMutex.Unlock()
	
	return hash
}

// normalizeContent standardizes content for consistent comparison
func (de *DeduplicationEngine) normalizeContent(content string) string {
	// Check normalization cache
	de.normMutex.RLock()
	if normalized, exists := de.normalizedCache[content]; exists {
		de.normMutex.RUnlock()
		return normalized
	}
	de.normMutex.RUnlock()

	// Normalize: lowercase, remove extra spaces, standardize punctuation
	normalized := strings.ToLower(strings.TrimSpace(content))
	normalized = strings.Join(strings.Fields(normalized), " ")
	
	// Remove common stop words that don't contribute to semantic meaning
	words := strings.Fields(normalized)
	filtered := make([]string, 0, len(words))
	stopWords := map[string]bool{
		"a": true, "an": true, "and": true, "are": true, "as": true, "at": true,
		"be": true, "by": true, "for": true, "from": true, "has": true, "he": true,
		"in": true, "is": true, "it": true, "its": true, "of": true, "on": true,
		"that": true, "the": true, "to": true, "was": true, "will": true, "with": true,
	}
	
	for _, word := range words {
		if !stopWords[word] && len(word) > 2 {
			filtered = append(filtered, word)
		}
	}
	
	normalized = strings.Join(filtered, " ")
	
	// Cache the result
	de.normMutex.Lock()
	de.normalizedCache[content] = normalized
	de.normMutex.Unlock()
	
	return normalized
}

// extractSemanticFeatures identifies key semantic elements from normalized content
func (de *DeduplicationEngine) extractSemanticFeatures(content string) map[string]float64 {
	features := make(map[string]float64)
	words := strings.Fields(content)
	
	if len(words) == 0 {
		return features
	}
	
	// Word frequency features (TF-IDF style)
	wordCount := make(map[string]int)
	for _, word := range words {
		wordCount[word]++
	}
	
	// Convert to normalized frequencies
	totalWords := float64(len(words))
	for word, count := range wordCount {
		features[word] = float64(count) / totalWords
	}
	
	// Add bigram features for better semantic capture
	for i := 0; i < len(words)-1; i++ {
		bigram := words[i] + "_" + words[i+1]
		features[bigram] = features[bigram] + (1.0 / float64(len(words)-1))
	}
	
	// Add content length as a feature (normalized)
	features["_length"] = math.Log(float64(len(content)) + 1) / 10.0
	
	return features
}

// createHashFromFeatures generates a consistent hash from semantic features
func (de *DeduplicationEngine) createHashFromFeatures(features map[string]float64) string {
	// Sort features for consistent hashing
	var keys []string
	for key := range features {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	
	// Create feature vector string
	var featureStr strings.Builder
	for _, key := range keys {
		featureStr.WriteString(key)
		featureStr.WriteString(":")
		featureStr.WriteString(fmt.Sprintf("%.4f", features[key]))
		featureStr.WriteString(";")
	}
	
	// Generate SHA256 hash and truncate for efficiency
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(featureStr.String())))
	return hash[:24] // 24 chars for good collision resistance vs performance
}

// CheckForDuplicate performs semantic duplicate detection against existing memories
func (de *DeduplicationEngine) CheckForDuplicate(content string, candidates []MemoryCandidate) DeduplicationResult {
	if len(candidates) == 0 {
		return DeduplicationResult{
			Action:     ActionCreate,
			Confidence: 1.0,
			Reasoning:  "No existing memories to compare against",
		}
	}
	
	// Generate semantic hash for the new content
	contentHash := de.GenerateSemanticHash(content)
	
	// Check for exact semantic hash matches first (fastest path)
	for _, candidate := range candidates {
		if candidate.SemanticHash == contentHash {
			return DeduplicationResult{
				Action:           ActionSkip,
				ExistingMemoryID: candidate.ID,
				Confidence:       1.0,
				Reasoning:        "Exact semantic hash match found",
				SimilarityScore:  1.0,
			}
		}
	}
	
	// Find best semantic similarity match
	bestMatch, bestScore := de.findBestSimilarityMatch(content, candidates)
	
	// Determine action based on similarity score
	if bestScore >= 0.85 {
		// Very high similarity - likely duplicate, skip creation
		return DeduplicationResult{
			Action:           ActionSkip,
			ExistingMemoryID: bestMatch.ID,
			Confidence:       bestScore,
			Reasoning:        fmt.Sprintf("Very high similarity (%.1f%%) - likely duplicate", bestScore*100),
			SimilarityScore:  bestScore,
		}
	} else if bestScore >= 0.65 {
		// High similarity - merge with existing
		return DeduplicationResult{
			Action:           ActionMerge,
			ExistingMemoryID: bestMatch.ID,
			Confidence:       bestScore,
			Reasoning:        fmt.Sprintf("High similarity (%.1f%%) - merging with existing", bestScore*100),
			SimilarityScore:  bestScore,
		}
	} else if bestScore >= 0.45 {
		// Medium similarity - update existing
		return DeduplicationResult{
			Action:           ActionUpdate,
			ExistingMemoryID: bestMatch.ID,
			Confidence:       bestScore,
			Reasoning:        fmt.Sprintf("Medium similarity (%.1f%%) - updating existing", bestScore*100),
			SimilarityScore:  bestScore,
		}
	}
	
	// Low or no similarity - create new memory
	return DeduplicationResult{
		Action:     ActionCreate,
		Confidence: 1.0,
		Reasoning:  fmt.Sprintf("Low similarity (%.1f%%) - creating new memory", bestScore*100),
		SimilarityScore: bestScore,
	}
}

// GetStats returns deduplication engine statistics
func (de *DeduplicationEngine) GetStats() map[string]interface{} {
	de.hashMutex.RLock()
	hashCacheSize := len(de.hashCache)
	de.hashMutex.RUnlock()
	
	de.simMutex.RLock()
	simCacheSize := len(de.similarityCache)
	de.simMutex.RUnlock()
	
	de.normMutex.RLock()
	normCacheSize := len(de.normalizedCache)
	de.normMutex.RUnlock()
	
	return map[string]interface{}{
		"hash_cache_size":         hashCacheSize,
		"similarity_cache_size":   simCacheSize,
		"normalization_cache_size": normCacheSize,
		"similarity_threshold":    de.similarityThreshold,
		"hash_dimensions":         de.hashDimensions,
		"cache_timeout_minutes":   de.cacheTimeout.Minutes(),
		"last_cleanup":           de.lastCleanup.Format(time.RFC3339),
	}
}

// findBestSimilarityMatch finds the most similar memory using semantic comparison
func (de *DeduplicationEngine) findBestSimilarityMatch(content string, candidates []MemoryCandidate) (MemoryCandidate, float64) {
	var bestMatch MemoryCandidate
	var bestScore float64 = 0.0
	
	// Prepare content for comparison
	contentFeatures := de.extractSemanticFeatures(de.normalizeContent(content))
	
	for _, candidate := range candidates {
		// Create cache key for this comparison
		cacheKey := fmt.Sprintf("%x_%s", md5.Sum([]byte(content)), candidate.ID)
		
		// Check similarity cache
		de.simMutex.RLock()
		if score, exists := de.similarityCache[cacheKey]; exists {
			de.simMutex.RUnlock()
			if score > bestScore {
				bestScore = score
				bestMatch = candidate
			}
			continue
		}
		de.simMutex.RUnlock()
		
		// Calculate semantic similarity
		candidateFeatures := de.extractSemanticFeatures(de.normalizeContent(candidate.Content))
		similarity := de.calculateFeatureSimilarity(contentFeatures, candidateFeatures)
		
		// Cache the result
		de.simMutex.Lock()
		de.similarityCache[cacheKey] = similarity
		de.simMutex.Unlock()
		
		if similarity > bestScore {
			bestScore = similarity
			bestMatch = candidate
		}
	}
	
	return bestMatch, bestScore
}

// calculateFeatureSimilarity computes cosine similarity between feature vectors
func (de *DeduplicationEngine) calculateFeatureSimilarity(features1, features2 map[string]float64) float64 {
	// Get all unique features
	allFeatures := make(map[string]bool)
	for k := range features1 {
		allFeatures[k] = true
	}
	for k := range features2 {
		allFeatures[k] = true
	}
	
	if len(allFeatures) == 0 {
		return 0.0
	}
	
	// Calculate cosine similarity
	var dotProduct, norm1, norm2 float64
	
	for feature := range allFeatures {
		val1 := features1[feature]
		val2 := features2[feature]
		
		dotProduct += val1 * val2
		norm1 += val1 * val1
		norm2 += val2 * val2
	}
	
	if norm1 == 0 || norm2 == 0 {
		return 0.0
	}
	
	return dotProduct / (math.Sqrt(norm1) * math.Sqrt(norm2))
}

// ProcessBatch handles batch deduplication for multiple memory entries
func (de *DeduplicationEngine) ProcessBatch(contents []string, candidates []MemoryCandidate) []DeduplicationResult {
	results := make([]DeduplicationResult, len(contents))
	
	// Process in parallel for better performance
	var wg sync.WaitGroup
	for i, content := range contents {
		wg.Add(1)
		go func(index int, text string) {
			defer wg.Done()
			results[index] = de.CheckForDuplicate(text, candidates)
		}(i, content)
	}
	
	wg.Wait()
	return results
}

// CleanupCaches removes expired cache entries
func (de *DeduplicationEngine) CleanupCaches() {
	de.cleanupMutex.Lock()
	defer de.cleanupMutex.Unlock()
	
	now := time.Now()
	if now.Sub(de.lastCleanup) < 5*time.Minute {
		return // Don't cleanup too frequently
	}
	
	// Clear all caches - simple approach for Phase 1
	// In production, implement proper TTL-based cleanup
	de.hashMutex.Lock()
	de.hashCache = make(map[string]string)
	de.hashMutex.Unlock()
	
	de.simMutex.Lock()
	de.similarityCache = make(map[string]float64)
	de.simMutex.Unlock()
	
	de.normMutex.Lock()
	de.normalizedCache = make(map[string]string)
	de.normMutex.Unlock()
	
	de.lastCleanup = now
}

// SetSimilarityThreshold allows runtime adjustment of similarity threshold
func (de *DeduplicationEngine) SetSimilarityThreshold(threshold float64) {
	if threshold >= 0.0 && threshold <= 1.0 {
		de.similarityThreshold = threshold
	}
}
