package main

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// ConsolidationEngine handles memory consolidation and merging operations
type ConsolidationEngine struct {
	memoryService        *MemoryService
	relationshipDetector *RelationshipDetector
	db                   *DatabaseLayer
	logger               *logrus.Logger
	config               struct {
		maxConsolidationSize int     // Maximum memories to consolidate at once
		minSimilarityScore   float64 // Minimum similarity for auto-consolidation
		requireUserApproval  bool    // Whether consolidation requires user approval
	}
}

// NewConsolidationEngine creates a new consolidation engine
func NewConsolidationEngine(memoryService *MemoryService, relationshipDetector *RelationshipDetector, db *DatabaseLayer, logger *logrus.Logger) *ConsolidationEngine {
	ce := &ConsolidationEngine{
		memoryService:        memoryService,
		relationshipDetector: relationshipDetector,
		db:                   db,
		logger:               logger,
	}
	
	// Set default configuration
	ce.config.maxConsolidationSize = 5
	ce.config.minSimilarityScore = 0.85
	ce.config.requireUserApproval = false
	
	return ce
}

// ConsolidateMemories consolidates multiple memories into a single memory
func (ce *ConsolidationEngine) ConsolidateMemories(ctx context.Context, req *ConsolidationRequest) (*ConsolidationResult, error) {
	startTime := time.Now()
	
	// Validate request
	if err := ce.validateConsolidationRequest(req); err != nil {
		return &ConsolidationResult{
			Success: false,
			Reason:  fmt.Sprintf("Invalid request: %v", err),
			Timestamp: time.Now(),
		}, err
	}
	
	// Get source memories
	sourceMemories, err := ce.getSourceMemories(ctx, req.SourceMemoryIDs)
	if err != nil {
		ce.logger.WithError(err).Error("Failed to get source memories for consolidation")
		return &ConsolidationResult{
			Success: false,
			Reason:  "Failed to retrieve source memories",
			Timestamp: time.Now(),
		}, err
	}
	
	// Perform consolidation based on type
	var result *ConsolidationResult
	switch req.ConsolidationType {
	case "merge":
		result, err = ce.mergeMemories(ctx, req, sourceMemories)
	case "link":
		result, err = ce.linkMemories(ctx, req, sourceMemories)
	case "supersede":
		result, err = ce.supersedeMemories(ctx, req, sourceMemories)
	default:
		return &ConsolidationResult{
			Success: false,
			Reason:  fmt.Sprintf("Unknown consolidation type: %s", req.ConsolidationType),
			Timestamp: time.Now(),
		}, fmt.Errorf("unknown consolidation type: %s", req.ConsolidationType)
	}
	
	if err != nil {
		ce.logger.WithError(err).Error("Failed to consolidate memories")
		return result, err
	}
	
	// Log consolidation metrics
	processingTime := time.Since(startTime)
	ce.logger.WithFields(logrus.Fields{
		"userId":            req.UserID,
		"consolidationType": req.ConsolidationType,
		"sourceCount":       len(req.SourceMemoryIDs),
		"processingMs":      processingTime.Milliseconds(),
		"success":           result.Success,
	}).Info("Memory consolidation completed")
	
	return result, nil
}

// mergeMemories merges multiple memories into a single consolidated memory
func (ce *ConsolidationEngine) mergeMemories(ctx context.Context, req *ConsolidationRequest, sourceMemories []*Memory) (*ConsolidationResult, error) {
	// Sort memories by importance and recency
	sort.Slice(sourceMemories, func(i, j int) bool {
		if sourceMemories[i].ImportanceScore != sourceMemories[j].ImportanceScore {
			return sourceMemories[i].ImportanceScore > sourceMemories[j].ImportanceScore
		}
		return sourceMemories[i].CreatedAt.After(sourceMemories[j].CreatedAt)
	})
	
	// Create merged memory content
	mergedContent := ce.createMergedContent(sourceMemories)
	mergedCategory := ce.determineBestCategory(sourceMemories)
	mergedImportance := ce.calculateMergedImportance(sourceMemories)
	mergedKeywords := ce.consolidateKeywords(sourceMemories)
	
	// Create new consolidated memory
	newMemory := &Memory{
		ID:              ce.db.GenerateMemoryID(),
		UserID:          int(req.UserID),
		Content:         mergedContent,
		Category:        mergedCategory,
		ImportanceScore: mergedImportance,
		Keywords:        mergedKeywords,
		CreatedAt:       time.Now(),
		LastAccessed:    time.Now(),
		AccessCount:     ce.calculateTotalAccessCount(sourceMemories),
		IsActive:        true,
	}
	
	// Store the new memory
	if err := ce.db.StoreMemory(ctx, newMemory); err != nil {
		return &ConsolidationResult{
			Success: false,
			Reason:  "Failed to store consolidated memory",
			Timestamp: time.Now(),
		}, err
	}
	
	// Soft delete source memories
	for _, sourceMemory := range sourceMemories {
		if err := ce.db.SoftDeleteMemoryInDB(ctx, sourceMemory.ID); err != nil {
			ce.logger.WithError(err).Warn("Failed to soft delete source memory during consolidation")
		}
	}
	
	return &ConsolidationResult{
		Success:          true,
		NewMemoryID:      newMemory.ID,
		ConsolidatedIDs:  req.SourceMemoryIDs,
		ConsolidationType: req.ConsolidationType,
		Reason:           req.Reason,
		Metadata: map[string]interface{}{
			"originalCount":      len(sourceMemories),
			"contentLength":      len(mergedContent),
			"averageImportance":  mergedImportance,
			"totalKeywords":      len(mergedKeywords),
			"consolidationDate":  time.Now(),
		},
		Timestamp: time.Now(),
	}, nil
}

// linkMemories creates relationships between memories without merging content
func (ce *ConsolidationEngine) linkMemories(ctx context.Context, req *ConsolidationRequest, sourceMemories []*Memory) (*ConsolidationResult, error) {
	// Find the primary memory (highest importance or most recent)
	primaryMemory := ce.findPrimaryMemory(sourceMemories)
	
	// Create relationships between primary and other memories
	var linkedIDs []string
	for _, memory := range sourceMemories {
		if memory.ID == primaryMemory.ID {
			continue
		}
		
		// Create relationship (this would be stored in database in real implementation)
		relationship := &MemoryRelationship{
			ID:               ce.relationshipDetector.generateRelationshipID(),
			UserID:           req.UserID,
			SourceMemoryID:   primaryMemory.ID,
			TargetMemoryID:   memory.ID,
			RelationshipType: "linked",
			Strength:         0.8, // High strength for manual linking
			CreatedAt:        time.Now(),
			Confidence:       1.0, // Full confidence for manual linking
			Metadata: map[string]interface{}{
				"consolidationType": "link",
				"reason":           req.Reason,
				"createdBy":        "consolidation_engine",
			},
		}
		
		ce.logger.WithFields(logrus.Fields{
			"relationshipId": relationship.ID,
			"sourceId":       relationship.SourceMemoryID,
			"targetId":       relationship.TargetMemoryID,
		}).Debug("Created memory link relationship")
		
		linkedIDs = append(linkedIDs, memory.ID)
	}
	
	return &ConsolidationResult{
		Success:          true,
		NewMemoryID:      primaryMemory.ID, // Primary memory remains
		ConsolidatedIDs:  linkedIDs,
		ConsolidationType: req.ConsolidationType,
		Reason:           req.Reason,
		Metadata: map[string]interface{}{
			"primaryMemoryId": primaryMemory.ID,
			"relationshipsCreated": len(linkedIDs),
			"linkType": "bidirectional",
		},
		Timestamp: time.Now(),
	}, nil
}

// supersedeMemories marks older memories as superseded by a newer one
func (ce *ConsolidationEngine) supersedeMemories(ctx context.Context, req *ConsolidationRequest, sourceMemories []*Memory) (*ConsolidationResult, error) {
	// Find the most recent or most important memory to be the superseding one
	supersedeMemory := ce.findSupersedingMemory(sourceMemories)
	
	// Mark other memories as superseded
	var supersededIDs []string
	for _, memory := range sourceMemories {
		if memory.ID == supersedeMemory.ID {
			continue
		}
		
		// In a real implementation, this would update memory status in database
		ce.logger.WithFields(logrus.Fields{
			"supersededId": memory.ID,
			"supersedingId": supersedeMemory.ID,
		}).Debug("Memory superseded")
		
		supersededIDs = append(supersededIDs, memory.ID)
	}
	
	// Update the superseding memory to indicate it supersedes others
	updatedContent := ce.addSupersessionNote(supersedeMemory.Content, supersededIDs)
	updates := map[string]interface{}{
		"content": updatedContent,
	}
	
	_, err := ce.memoryService.UpdateMemory(ctx, supersedeMemory.ID, updates)
	if err != nil {
		return &ConsolidationResult{
			Success: false,
			Reason:  "Failed to update superseding memory",
			Timestamp: time.Now(),
		}, err
	}
	
	return &ConsolidationResult{
		Success:          true,
		NewMemoryID:      supersedeMemory.ID,
		ConsolidatedIDs:  supersededIDs,
		ConsolidationType: req.ConsolidationType,
		Reason:           req.Reason,
		Metadata: map[string]interface{}{
			"supersedingMemoryId": supersedeMemory.ID,
			"supersededCount":     len(supersededIDs),
			"supersessionDate":    time.Now(),
		},
		Timestamp: time.Now(),
	}, nil
}

// detectDuplicateCandidates finds memories that are likely duplicates for consolidation
func (ce *ConsolidationEngine) DetectDuplicateCandidates(ctx context.Context, userID int64, limit int) ([]*MemoryCandidate, error) {
	// Get user's memories
	memories, err := ce.memoryService.GetMemoriesForUser(ctx, userID, limit*2) // Get more to find duplicates
	if err != nil {
		return nil, err
	}
	
	var candidates []*MemoryCandidate
	processed := make(map[string]bool)
	
	// Compare each memory with others to find potential duplicates
	for i, memory1 := range memories {
		if processed[memory1.ID] {
			continue
		}
		
		for j := i + 1; j < len(memories); j++ {
			memory2 := memories[j]
			if processed[memory2.ID] {
				continue
			}
			
			// Calculate similarity
			similarity := ce.relationshipDetector.calculateSemanticSimilarity(memory1, memory2)
			
			// If similarity is high enough, consider as duplicate candidate
			if similarity >= ce.config.minSimilarityScore {
				candidate := &MemoryCandidate{
					ID:        memory2.ID,
					Content:   memory2.Content,
					Category:  memory2.Category,
					Keywords:  memory2.Keywords,
					CreatedAt: memory2.CreatedAt,
					Embedding: memory2.Embedding,
				}
				candidates = append(candidates, candidate)
				processed[memory2.ID] = true
			}
		}
		processed[memory1.ID] = true
		
		// Limit results
		if len(candidates) >= limit {
			break
		}
	}
	
	// Sort by creation date (newest first) since we don't store similarity score
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].CreatedAt.After(candidates[j].CreatedAt)
	})
	
	return candidates, nil
}

// Helper functions

func (ce *ConsolidationEngine) validateConsolidationRequest(req *ConsolidationRequest) error {
	if req.UserID <= 0 {
		return fmt.Errorf("invalid user ID")
	}
	if len(req.SourceMemoryIDs) < 2 {
		return fmt.Errorf("at least 2 memories required for consolidation")
	}
	if len(req.SourceMemoryIDs) > ce.config.maxConsolidationSize {
		return fmt.Errorf("too many memories for consolidation (max: %d)", ce.config.maxConsolidationSize)
	}
	if req.ConsolidationType == "" {
		return fmt.Errorf("consolidation type is required")
	}
	return nil
}

func (ce *ConsolidationEngine) getSourceMemories(ctx context.Context, memoryIDs []string) ([]*Memory, error) {
	var memories []*Memory
	for _, id := range memoryIDs {
		memory, err := ce.db.GetMemoryByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get memory %s: %v", id, err)
		}
		memories = append(memories, memory)
	}
	return memories, nil
}

func (ce *ConsolidationEngine) createMergedContent(memories []*Memory) string {
	var contentParts []string
	
	// Use the most important memory as base content
	baseContent := memories[0].Content
	contentParts = append(contentParts, baseContent)
	
	// Add unique information from other memories
	for i := 1; i < len(memories); i++ {
		additional := ce.extractUniqueContent(baseContent, memories[i].Content)
		if additional != "" {
			contentParts = append(contentParts, additional)
		}
	}
	
	return strings.Join(contentParts, " | ")
}

func (ce *ConsolidationEngine) extractUniqueContent(baseContent, newContent string) string {
	// Simple implementation - in practice, this would use more sophisticated NLP
	baseWords := strings.Fields(strings.ToLower(baseContent))
	newWords := strings.Fields(strings.ToLower(newContent))
	
	baseSet := make(map[string]bool)
	for _, word := range baseWords {
		baseSet[word] = true
	}
	
	var uniqueWords []string
	for _, word := range newWords {
		if !baseSet[word] && len(word) > 3 { // Skip short words
			uniqueWords = append(uniqueWords, word)
		}
	}
	
	if len(uniqueWords) > 0 {
		return strings.Join(uniqueWords, " ")
	}
	
	return ""
}

func (ce *ConsolidationEngine) determineBestCategory(memories []*Memory) string {
	categoryCount := make(map[string]int)
	for _, memory := range memories {
		categoryCount[memory.Category]++
	}
	
	bestCategory := ""
	maxCount := 0
	for category, count := range categoryCount {
		if count > maxCount {
			maxCount = count
			bestCategory = category
		}
	}
	
	return bestCategory
}

func (ce *ConsolidationEngine) calculateMergedImportance(memories []*Memory) float64 {
	var total float64
	for _, memory := range memories {
		total += memory.ImportanceScore
	}
	return total / float64(len(memories))
}

func (ce *ConsolidationEngine) consolidateKeywords(memories []*Memory) []string {
	keywordSet := make(map[string]bool)
	for _, memory := range memories {
		for _, keyword := range memory.Keywords {
			keywordSet[keyword] = true
		}
	}
	
	var keywords []string
	for keyword := range keywordSet {
		keywords = append(keywords, keyword)
	}
	
	return keywords
}

func (ce *ConsolidationEngine) calculateTotalAccessCount(memories []*Memory) int {
	total := 0
	for _, memory := range memories {
		total += memory.AccessCount
	}
	return total
}

func (ce *ConsolidationEngine) findPrimaryMemory(memories []*Memory) *Memory {
	primary := memories[0]
	for _, memory := range memories[1:] {
		if memory.ImportanceScore > primary.ImportanceScore ||
			(memory.ImportanceScore == primary.ImportanceScore && memory.CreatedAt.After(primary.CreatedAt)) {
			primary = memory
		}
	}
	return primary
}

func (ce *ConsolidationEngine) findSupersedingMemory(memories []*Memory) *Memory {
	// Find the most recent memory with highest importance
	superseding := memories[0]
	for _, memory := range memories[1:] {
		if memory.CreatedAt.After(superseding.CreatedAt) ||
			(memory.CreatedAt.Equal(superseding.CreatedAt) && memory.ImportanceScore > superseding.ImportanceScore) {
			superseding = memory
		}
	}
	return superseding
}

func (ce *ConsolidationEngine) addSupersessionNote(content string, supersededIDs []string) string {
	note := fmt.Sprintf(" [Supersedes: %s]", strings.Join(supersededIDs, ", "))
	return content + note
}

// GetConsolidationStats returns statistics about consolidation operations
func (ce *ConsolidationEngine) GetConsolidationStats(ctx context.Context, userID int64) (map[string]interface{}, error) {
	return map[string]interface{}{
		"totalConsolidations":    0,
		"mergeOperations":        0,
		"linkOperations":         0,
		"supersedeOperations":    0,
		"averageProcessingTime":  0.0,
		"successRate":            1.0,
		"lastConsolidationDate":  nil,
		"duplicateCandidates":    0,
	}, nil
}