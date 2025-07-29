package main

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// RelationshipDetector handles memory relationship detection and management
type RelationshipDetector struct {
	memoryService *MemoryService
	logger        *logrus.Logger
	threshold     struct {
		duplicate   float64 // 0.9+ for duplicates
		related     float64 // 0.7+ for related memories
		buildsOn    float64 // 0.6+ for memories that build on others
		contradicts float64 // High semantic similarity but opposite sentiment
		supports    float64 // 0.5+ for supporting memories
	}
}

// NewRelationshipDetector creates a new relationship detector
func NewRelationshipDetector(memoryService *MemoryService, logger *logrus.Logger) *RelationshipDetector {
	rd := &RelationshipDetector{
		memoryService: memoryService,
		logger:        logger,
	}
	
	// Set similarity thresholds for different relationship types
	rd.threshold.duplicate = 0.9
	rd.threshold.related = 0.7
	rd.threshold.buildsOn = 0.6
	rd.threshold.contradicts = 0.8
	rd.threshold.supports = 0.5
	
	return rd
}

// DetectRelationships analyzes a memory and finds relationships with existing memories
func (rd *RelationshipDetector) DetectRelationships(ctx context.Context, memory *Memory) ([]*MemoryRelationship, error) {
	startTime := time.Now()
	
	// Get user's existing memories for comparison
	existingMemories, err := rd.memoryService.GetMemoriesForUser(ctx, int64(memory.UserID), 100)
	if err != nil {
		rd.logger.WithError(err).Error("Failed to get existing memories for relationship detection")
		return nil, err
	}
	
	var relationships []*MemoryRelationship
	
	// Analyze relationships with each existing memory
	for _, existing := range existingMemories {
		if existing.ID == memory.ID {
			continue // Skip self
		}
		
		relationship := rd.analyzeMemoryPair(memory, existing)
		if relationship != nil {
			relationships = append(relationships, relationship)
		}
	}
	
	// Sort relationships by strength (strongest first)
	sort.Slice(relationships, func(i, j int) bool {
		return relationships[i].Strength > relationships[j].Strength
	})
	
	// Limit to top 10 relationships to avoid noise
	if len(relationships) > 10 {
		relationships = relationships[:10]
	}
	
	processingTime := time.Since(startTime)
	rd.logger.WithFields(logrus.Fields{
		"memoryId":      memory.ID,
		"relationships": len(relationships),
		"processingMs":  processingTime.Milliseconds(),
	}).Debug("Completed relationship detection")
	
	return relationships, nil
}

// analyzeMemoryPair analyzes two memories and determines their relationship
func (rd *RelationshipDetector) analyzeMemoryPair(memory1, memory2 *Memory) *MemoryRelationship {
	// Calculate semantic similarity
	similarity := rd.calculateSemanticSimilarity(memory1, memory2)
	
	// Determine relationship type based on similarity and content analysis
	relationshipType, confidence := rd.determineRelationshipType(memory1, memory2, similarity)
	
	// Only create relationship if it meets minimum threshold
	if similarity < rd.threshold.supports {
		return nil
	}
	
	return &MemoryRelationship{
		ID:               rd.generateRelationshipID(),
		UserID:           int64(memory1.UserID),
		SourceMemoryID:   memory1.ID,
		TargetMemoryID:   memory2.ID,
		RelationshipType: relationshipType,
		Strength:         similarity,
		CreatedAt:        time.Now(),
		Confidence:       confidence,
		Metadata: map[string]interface{}{
			"detection_method": "semantic_similarity",
			"categories_match": memory1.Category == memory2.Category,
			"content_overlap":  rd.calculateContentOverlap(memory1.Content, memory2.Content),
		},
	}
}

// calculateSemanticSimilarity calculates similarity between two memories
func (rd *RelationshipDetector) calculateSemanticSimilarity(memory1, memory2 *Memory) float64 {
	// If embeddings are available, use cosine similarity
	if len(memory1.Embedding) > 0 && len(memory2.Embedding) > 0 {
		return rd.memoryService.CalculateCosineSimilarity(memory1.Embedding, memory2.Embedding)
	}
	
	// Fallback to text-based similarity
	return rd.calculateTextSimilarity(memory1.Content, memory2.Content)
}

// calculateTextSimilarity calculates text similarity using multiple methods
func (rd *RelationshipDetector) calculateTextSimilarity(text1, text2 string) float64 {
	// Normalize texts
	norm1 := rd.normalizeText(text1)
	norm2 := rd.normalizeText(text2)
	
	// Calculate multiple similarity metrics
	wordSim := rd.calculateWordSimilarity(norm1, norm2)
	lengthSim := rd.calculateLengthSimilarity(text1, text2)
	keywordSim := rd.calculateKeywordSimilarity(norm1, norm2)
	
	// Weighted combination
	return (wordSim * 0.5) + (lengthSim * 0.2) + (keywordSim * 0.3)
}

// normalizeText normalizes text for comparison
func (rd *RelationshipDetector) normalizeText(text string) string {
	// Convert to lowercase and remove extra whitespace
	normalized := strings.ToLower(strings.TrimSpace(text))
	
	// Remove common stop words (basic implementation)
	stopWords := []string{"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
	words := strings.Fields(normalized)
	
	var filtered []string
	for _, word := range words {
		isStopWord := false
		for _, stop := range stopWords {
			if word == stop {
				isStopWord = true
				break
			}
		}
		if !isStopWord {
			filtered = append(filtered, word)
		}
	}
	
	return strings.Join(filtered, " ")
}

// calculateWordSimilarity calculates word-level similarity
func (rd *RelationshipDetector) calculateWordSimilarity(text1, text2 string) float64 {
	words1 := strings.Fields(text1)
	words2 := strings.Fields(text2)
	
	if len(words1) == 0 || len(words2) == 0 {
		return 0.0
	}
	
	// Create word frequency maps
	freq1 := make(map[string]int)
	freq2 := make(map[string]int)
	
	for _, word := range words1 {
		freq1[word]++
	}
	for _, word := range words2 {
		freq2[word]++
	}
	
	// Calculate Jaccard similarity
	intersection := 0
	for word := range freq1 {
		if freq2[word] > 0 {
			intersection++
		}
	}
	
	union := len(freq1) + len(freq2) - intersection
	if union == 0 {
		return 0.0
	}
	
	return float64(intersection) / float64(union)
}

// calculateLengthSimilarity calculates similarity based on text length
func (rd *RelationshipDetector) calculateLengthSimilarity(text1, text2 string) float64 {
	len1 := float64(len(text1))
	len2 := float64(len(text2))
	
	if len1 == 0 && len2 == 0 {
		return 1.0
	}
	if len1 == 0 || len2 == 0 {
		return 0.0
	}
	
	maxLen := math.Max(len1, len2)
	minLen := math.Min(len1, len2)
	
	return minLen / maxLen
}

// calculateKeywordSimilarity calculates similarity based on key phrases
func (rd *RelationshipDetector) calculateKeywordSimilarity(text1, text2 string) float64 {
	// Extract potential keywords (words longer than 4 characters)
	words1 := strings.Fields(text1)
	words2 := strings.Fields(text2)
	
	keywords1 := make(map[string]bool)
	keywords2 := make(map[string]bool)
	
	for _, word := range words1 {
		if len(word) > 4 {
			keywords1[word] = true
		}
	}
	for _, word := range words2 {
		if len(word) > 4 {
			keywords2[word] = true
		}
	}
	
	if len(keywords1) == 0 && len(keywords2) == 0 {
		return 0.0
	}
	
	// Calculate keyword overlap
	common := 0
	for keyword := range keywords1 {
		if keywords2[keyword] {
			common++
		}
	}
	
	total := len(keywords1) + len(keywords2) - common
	if total == 0 {
		return 0.0
	}
	
	return float64(common) / float64(total)
}

// calculateContentOverlap calculates percentage of content overlap
func (rd *RelationshipDetector) calculateContentOverlap(content1, content2 string) float64 {
	words1 := strings.Fields(strings.ToLower(content1))
	words2 := strings.Fields(strings.ToLower(content2))
	
	if len(words1) == 0 || len(words2) == 0 {
		return 0.0
	}
	
	wordSet1 := make(map[string]bool)
	for _, word := range words1 {
		wordSet1[word] = true
	}
	
	overlap := 0
	for _, word := range words2 {
		if wordSet1[word] {
			overlap++
		}
	}
	
	return float64(overlap) / float64(len(words2))
}

// determineRelationshipType determines the type of relationship between memories
func (rd *RelationshipDetector) determineRelationshipType(memory1, memory2 *Memory, similarity float64) (string, float64) {
	// High confidence thresholds
	if similarity >= rd.threshold.duplicate {
		return "duplicate", 0.95
	}
	
	if similarity >= rd.threshold.related {
		// Check if memories are in same category
		if memory1.Category == memory2.Category {
			return "related", 0.8
		}
		return "related", 0.7
	}
	
	if similarity >= rd.threshold.buildsOn {
		// Check if one memory is more detailed than the other
		if float64(len(memory1.Content)) > float64(len(memory2.Content))*1.5 {
			return "builds_on", 0.6
		}
		if float64(len(memory2.Content)) > float64(len(memory1.Content))*1.5 {
			return "builds_on", 0.6
		}
		return "related", 0.6
	}
	
	// Check for contradictory information (high similarity but different sentiment)
	if similarity >= rd.threshold.contradicts && rd.detectContradiction(memory1.Content, memory2.Content) {
		return "contradicts", 0.7
	}
	
	if similarity >= rd.threshold.supports {
		return "supports", 0.5
	}
	
	return "supports", 0.3 // Default low-confidence relationship
}

// detectContradiction detects if two texts contradict each other
func (rd *RelationshipDetector) detectContradiction(text1, text2 string) bool {
	// Simple contradiction detection based on negation patterns
	negationWords := []string{"not", "never", "don't", "doesn't", "didn't", "won't", "can't", "shouldn't"}
	
	text1Lower := strings.ToLower(text1)
	text2Lower := strings.ToLower(text2)
	
	// Count negations in each text
	negCount1 := 0
	negCount2 := 0
	
	for _, neg := range negationWords {
		negCount1 += strings.Count(text1Lower, neg)
		negCount2 += strings.Count(text2Lower, neg)
	}
	
	// If one text has significantly more negations, they might contradict
	return math.Abs(float64(negCount1-negCount2)) >= 2
}

// GetRelationships retrieves relationships for a specific memory
func (rd *RelationshipDetector) GetRelationships(ctx context.Context, memoryID string) ([]*MemoryRelationship, error) {
	// Placeholder - in a real implementation, this would query the database
	rd.logger.WithField("memoryId", memoryID).Debug("Getting relationships for memory")
	
	// Return empty for now - would be populated from database
	return []*MemoryRelationship{}, nil
}

// generateRelationshipID generates a unique ID for a relationship
func (rd *RelationshipDetector) generateRelationshipID() string {
	return fmt.Sprintf("rel_%d", time.Now().UnixNano())
}

// GetRelationshipStats returns statistics about memory relationships
func (rd *RelationshipDetector) GetRelationshipStats(ctx context.Context, userID int64) (map[string]interface{}, error) {
	// Placeholder for relationship statistics
	return map[string]interface{}{
		"totalRelationships":     0,
		"relationshipTypes":      map[string]int{},
		"averageRelationships":   0.0,
		"strongRelationships":    0,
		"lastDetectionRun":       time.Now(),
		"detectionSuccessRate":   1.0,
	}, nil
}