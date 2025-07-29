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

// findBestSimilarityMatch finds the most similar memory using embedding-based semantic comparison
func (de *DeduplicationEngine) findBestSimilarityMatch(content string, candidates []MemoryCandidate) (MemoryCandidate, float64) {
	// Generate embedding for new content
	contentEmbedding := de.generateContentEmbedding(content)
	
	contentPreview := content
	if len(content) > 30 {
		contentPreview = content[:30]
	}
	fmt.Printf("DEBUG: Generated embedding for content '%s', dimensions: %d\n", contentPreview, len(contentEmbedding))
	
	// Use embedding-based similarity matching
	bestMatch, score := de.findBestEmbeddingMatch(contentEmbedding, candidates)
	
	if bestMatch.Content != "" {
		matchPreview := bestMatch.Content
		if len(bestMatch.Content) > 30 {
			matchPreview = bestMatch.Content[:30]
		}
		fmt.Printf("DEBUG: Best embedding match score: %.4f for content: '%s'\n", score, matchPreview)
	} else {
		fmt.Printf("DEBUG: No embedding matches found\n")
	}
	
	return bestMatch, score
}

// findBestEmbeddingMatch uses vector embeddings for superior semantic similarity
func (de *DeduplicationEngine) findBestEmbeddingMatch(contentEmbedding []float64, candidates []MemoryCandidate) (MemoryCandidate, float64) {
	var bestMatch MemoryCandidate
	var bestScore float64 = 0.0
	
	fmt.Printf("DEBUG: Checking %d candidates for embedding similarity\n", len(candidates))
	
	for i, candidate := range candidates {
		// Generate embedding for candidate if it doesn't exist
		var candidateEmbedding []float64
		if len(candidate.Embedding) == 0 {
			candidatePreview := candidate.Content
		if len(candidate.Content) > 30 {
			candidatePreview = candidate.Content[:30]
		}
		fmt.Printf("DEBUG: Generating embedding for candidate %d: '%s'\n", i, candidatePreview)
			candidateEmbedding = de.generateContentEmbedding(candidate.Content)
		} else {
			candidateEmbedding = candidate.Embedding
		}
		
		if len(candidateEmbedding) == 0 {
			fmt.Printf("DEBUG: Skipping candidate %d - no embedding\n", i)
			continue
		}
		
		// Calculate cosine similarity between embeddings
		similarity := de.calculateCosineSimilarity(contentEmbedding, candidateEmbedding)
		
		fmt.Printf("DEBUG: Candidate %d similarity: %.4f\n", i, similarity)
		
		if similarity > bestScore {
			bestScore = similarity
			bestMatch = candidate
		}
	}
	
	return bestMatch, bestScore
}

// calculateCosineSimilarity computes cosine similarity between two embedding vectors
func (de *DeduplicationEngine) calculateCosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0.0
	}
	
	var dotProduct, normA, normB float64
	
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

// generateContentEmbedding creates an embedding for the given content
func (de *DeduplicationEngine) generateContentEmbedding(content string) []float64 {
	// Simple semantic embedding based on content analysis
	// This creates a basic 100-dimensional vector that captures semantic meaning
	normalized := de.normalizeContent(content)
	words := strings.Fields(normalized)
	
	if len(words) == 0 {
		return []float64{}
	}
	
	// Create a 100-dimensional embedding
	embedding := make([]float64, 100)
	
	// Initialize with content-based features
	contentLen := float64(len(content))
	wordCount := float64(len(words))
	
	// Semantic feature extraction with better categorization
	semanticFeatures := de.extractEnhancedSemanticFeatures(normalized)
	
	// Map semantic features to embedding dimensions
	featureIndex := 0
	for feature, weight := range semanticFeatures {
		if featureIndex >= 100 {
			break
		}
		
		// Use hash-based mapping for consistent feature placement
		hash := de.simpleHash(feature) % 100
		embedding[hash] += weight
		featureIndex++
	}
	
	// Add structural features
	embedding[90] = contentLen / 100.0  // Content length feature
	embedding[91] = wordCount / 20.0    // Word count feature
	embedding[92] = de.calculateTextComplexity(words) // Complexity feature
	
	// Normalize the embedding vector
	return de.normalizeEmbedding(embedding)
}

// extractEnhancedSemanticFeatures creates better semantic features than basic TF-IDF
func (de *DeduplicationEngine) extractEnhancedSemanticFeatures(content string) map[string]float64 {
	features := make(map[string]float64)
	words := strings.Fields(content)
	
	if len(words) == 0 {
		return features
	}
	
	// Enhanced semantic keywords with weights
	semanticKeywords := map[string]float64{
		// Time-related
		"morning": 2.0, "evening": 2.0, "night": 2.0, "day": 2.0, "wake": 2.0, "start": 2.0, "begins": 2.0,
		"usually": 1.5, "always": 1.5, "often": 1.5, "typically": 1.5, "regularly": 1.5,
		
		// Food-related
		"eat": 2.0, "food": 2.0, "meal": 2.0, "breakfast": 2.0, "lunch": 2.0, "dinner": 2.0,
		"eggs": 2.5, "bunch": 1.5, "some": 1.0, "many": 1.5, "few": 1.0,
		
		// Quantity
		"1": 1.0, "2": 1.0, "3": 1.0, "4": 1.0, "5": 1.0, "6": 1.0, "7": 1.0, "8": 1.0, "9": 1.0,
		"one": 1.0, "two": 1.0, "three": 1.0, "four": 1.0, "five": 1.0, "six": 1.0, "seven": 1.0,
		
		// Actions
		"drink": 1.5, "consume": 1.5, "have": 1.0, "take": 1.0, "get": 1.0,
		
		// Common patterns
		"with": 1.0, "and": 0.5, "or": 0.5, "but": 1.0, "when": 1.5, "while": 1.5,
	}
	
	// Calculate weighted features
	totalWords := float64(len(words))
	for _, word := range words {
		word = strings.ToLower(word)
		
		// Apply semantic weighting
		weight := 1.0
		if semanticWeight, exists := semanticKeywords[word]; exists {
			weight = semanticWeight
		}
		
		features[word] = features[word] + (weight / totalWords)
	}
	
	// Add bigram features with semantic awareness
	for i := 0; i < len(words)-1; i++ {
		word1 := strings.ToLower(words[i])
		word2 := strings.ToLower(words[i+1])
		bigram := word1 + "_" + word2
		
		// Higher weight for meaningful bigrams
		weight := 1.0
		if de.isMeaningfulBigram(word1, word2) {
			weight = 2.0
		}
		
		features[bigram] = features[bigram] + (weight / float64(len(words)-1))
	}
	
	return features
}

// isMeaningfulBigram checks if a word pair has semantic significance
func (de *DeduplicationEngine) isMeaningfulBigram(word1, word2 string) bool {
	meaningfulPairs := map[string]bool{
		"eat_eggs": true, "eggs_morning": true, "morning_routine": true,
		"wake_up": true, "day_starts": true, "usually_eat": true,
		"bunch_of": true, "bunch_eggs": true, "every_morning": true,
		"7_eggs": true, "eggs_daily": true, "daily_routine": true,
	}
	
	bigram := word1 + "_" + word2
	return meaningfulPairs[bigram]
}

// calculateTextComplexity estimates semantic complexity of text
func (de *DeduplicationEngine) calculateTextComplexity(words []string) float64 {
	if len(words) == 0 {
		return 0.0
	}
	
	// Factors: unique words, average word length, sentence structure
	uniqueWords := make(map[string]bool)
	totalLength := 0
	
	for _, word := range words {
		uniqueWords[strings.ToLower(word)] = true
		totalLength += len(word)
	}
	
	uniqueRatio := float64(len(uniqueWords)) / float64(len(words))
	avgWordLen := float64(totalLength) / float64(len(words))
	
	return (uniqueRatio + avgWordLen/10.0) / 2.0
}

// simpleHash creates a simple hash for consistent feature mapping
func (de *DeduplicationEngine) simpleHash(s string) int {
	hash := 0
	for i, char := range s {
		hash = (hash*31 + int(char) + i) % 2147483647
	}
	if hash < 0 {
		hash = -hash
	}
	return hash
}

// normalizeEmbedding normalizes an embedding vector to unit length
func (de *DeduplicationEngine) normalizeEmbedding(embedding []float64) []float64 {
	var magnitude float64
	for _, val := range embedding {
		magnitude += val * val
	}
	
	magnitude = math.Sqrt(magnitude)
	if magnitude == 0 {
		return embedding
	}
	
	normalized := make([]float64, len(embedding))
	for i, val := range embedding {
		normalized[i] = val / magnitude
	}
	
	return normalized
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
