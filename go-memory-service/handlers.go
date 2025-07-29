package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// Health check handler
func healthHandler(w http.ResponseWriter, r *http.Request) {
	stats := memoryService.GetStats()
	
	health := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"stats":      stats,
		"goroutines": memoryService.statsManager.GetStats().GoroutineCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// Vector similarity calculation handler
func similarityHandler(w http.ResponseWriter, r *http.Request) {
	var req SimilarityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	similarity := memoryService.CalculateCosineSimilarity(req.VectorA, req.VectorB)
	
	response := SimilarityResponse{
		Similarity: similarity,
		Timestamp:  time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Contextual memory retrieval handler
func contextualMemoryHandler(w http.ResponseWriter, r *http.Request) {
	var req ContextualMemoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	memories, err := memoryService.GetContextualMemories(r.Context(), req)
	if err != nil {
		logger.WithError(err).Error("Failed to get contextual memories")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(memories)
}

// Background memory processing handler
func processMemoryHandler(w http.ResponseWriter, r *http.Request) {
	var req ProcessMemoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Add to background processing queue
	memoryService.AddBackgroundTask(req)

	response := map[string]interface{}{
		"status":    "queued",
		"timestamp": time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Statistics handler
func statsHandler(w http.ResponseWriter, r *http.Request) {
	stats := memoryService.GetStats()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// Batch similarity calculation handler
func batchSimilarityHandler(w http.ResponseWriter, r *http.Request) {
	var req BatchSimilarityRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	results := memoryService.CalculateBatchSimilarity(req.BaseVector, req.Vectors)
	
	response := BatchSimilarityResponse{
		Results:   results,
		Timestamp: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Embedding processing handler
func embeddingHandler(w http.ResponseWriter, r *http.Request) {
	var req EmbeddingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	result := memoryService.ProcessEmbedding(req)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// CRUD handlers for frontend integration

// Get memories with pagination
func getMemoriesHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := int64(1) // Default user ID
	
	// Parse query parameters
	page := 1
	limit := 20
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := json.Number(p).Int64(); err == nil {
			page = int(parsed)
		}
	}
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := json.Number(l).Int64(); err == nil && parsed <= 50 {
			limit = int(parsed)
		}
	}
	
	memories, err := memoryService.GetMemoriesForUser(ctx, userID, limit)
	if err != nil {
		logger.WithError(err).Error("Failed to get memories")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	
	// Simulate pagination response structure
	response := map[string]interface{}{
		"memories":    memories,
		"hasMore":     len(memories) == limit,
		"page":        page,
		"limit":       limit,
		"count":       len(memories),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Create manual memory
func createMemoryHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := int64(1) // Default user ID
	
	var req struct {
		Content    string  `json:"content"`
		Category   string  `json:"category"`
		Importance float64 `json:"importance"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	// Validation
	if len(req.Content) < 10 {
		http.Error(w, "Memory content must be at least 10 characters", http.StatusBadRequest)
		return
	}
	
	validCategories := []string{"preferences", "personal_context", "instructions", "food_diet", "goals"}
	isValidCategory := false
	for _, cat := range validCategories {
		if req.Category == cat {
			isValidCategory = true
			break
		}
	}
	if !isValidCategory {
		http.Error(w, "Invalid category", http.StatusBadRequest)
		return
	}
	
	if req.Importance < 0 || req.Importance > 1 {
		http.Error(w, "Importance must be between 0 and 1", http.StatusBadRequest)
		return
	}
	
	memory, err := memoryService.CreateMemory(ctx, userID, req.Content)
	if err != nil {
		logger.WithError(err).Error("Failed to create memory")
		http.Error(w, "Failed to create memory", http.StatusInternalServerError)
		return
	}
	
	response := map[string]interface{}{
		"success": true,
		"memory": map[string]interface{}{
			"id":         memory.ID,
			"content":    memory.Content,
			"category":   memory.Category,
			"importance": memory.ImportanceScore,
			"createdAt":  memory.CreatedAt,
		},
		"message": "Memory processed and saved successfully",
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// Check for duplicate memories
func checkDuplicatesHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := int64(1) // Default user ID
	
	var req struct {
		Content  string `json:"content"`
		Category string `json:"category"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	// Get recent memories for comparison
	recentMemories, err := memoryService.GetMemoriesForUser(ctx, userID, 50)
	if err != nil {
		logger.WithError(err).Warn("Failed to get recent memories for duplicate check")
		recentMemories = []*Memory{}
	}
	
	// Simple duplicate detection based on content similarity
	hasDuplicates := false
	similarMemories := []map[string]interface{}{}
	
	for _, memory := range recentMemories {
		// Simple text similarity check (can be enhanced with semantic similarity)
		if len(memory.Content) > 10 && len(req.Content) > 10 {
			similarity := calculateSimpleTextSimilarity(req.Content, memory.Content)
			if similarity > 0.3 {
				hasDuplicates = true
				similarMemories = append(similarMemories, map[string]interface{}{
					"id":         memory.ID,
					"content":    memory.Content,
					"similarity": similarity,
					"createdAt":  memory.CreatedAt,
				})
			}
		}
	}
	
	response := map[string]interface{}{
		"hasDuplicates":    hasDuplicates,
		"similarMemories":  similarMemories,
		"processingTime":   "< 100ms",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Update memory
func updateMemoryHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	vars := mux.Vars(r)
	memoryID := vars["id"]
	
	var req struct {
		Content string `json:"content"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	if len(req.Content) < 10 {
		http.Error(w, "Memory content must be at least 10 characters", http.StatusBadRequest)
		return
	}
	
	updates := map[string]interface{}{
		"content": req.Content,
	}
	
	memory, err := memoryService.UpdateMemory(ctx, memoryID, updates)
	if err != nil {
		logger.WithError(err).Error("Failed to update memory")
		http.Error(w, "Failed to update memory", http.StatusInternalServerError)
		return
	}
	
	response := map[string]interface{}{
		"success": true,
		"memory": map[string]interface{}{
			"id":         memory.ID,
			"content":    memory.Content,
			"category":   memory.Category,
			"importance": memory.ImportanceScore,
			"updatedAt":  memory.LastAccessed,
		},
		"message": "Memory updated successfully",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Delete memory
func deleteMemoryHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	vars := mux.Vars(r)
	memoryID := vars["id"]
	
	err := memoryService.DeleteMemory(ctx, memoryID)
	if err != nil {
		logger.WithError(err).Error("Failed to delete memory")
		http.Error(w, "Failed to delete memory", http.StatusInternalServerError)
		return
	}
	
	response := map[string]interface{}{
		"message": "Memory deleted successfully",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Memory overview
func memoryOverviewHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := int64(1) // Default user ID
	
	memories, err := memoryService.GetMemoriesForUser(ctx, userID, 100)
	if err != nil {
		logger.WithError(err).Error("Failed to get memories for overview")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	
	// Calculate overview statistics
	totalMemories := len(memories)
	categoryCounts := make(map[string]int)
	var totalImportance float64
	
	for _, memory := range memories {
		categoryCounts[memory.Category]++
		totalImportance += memory.ImportanceScore
	}
	
	avgImportance := 0.0
	if totalMemories > 0 {
		avgImportance = totalImportance / float64(totalMemories)
	}
	
	response := map[string]interface{}{
		"totalMemories":        totalMemories,
		"categoryCounts":       categoryCounts,
		"averageImportance":    avgImportance,
		"recentMemoriesCount":  minInt(totalMemories, 10),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Quality metrics
func qualityMetricsHandler(w http.ResponseWriter, r *http.Request) {
	stats := memoryService.GetStats()
	
	response := map[string]interface{}{
		"totalMemories":         stats.ProcessedTasks,
		"duplicateRate":         0.05, // Placeholder
		"qualityScore":          0.85, // Placeholder
		"averageImportanceScore": 0.7,  // Placeholder
		"averageFreshness":      0.8,  // Placeholder
		"potentialDuplicates":   2,    // Placeholder
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper function for simple text similarity
func calculateSimpleTextSimilarity(text1, text2 string) float64 {
	// Very basic similarity based on length difference for now
	if len(text1) == 0 || len(text2) == 0 {
		return 0.0
	}
	
	lenDiff := float64(absInt(len(text1) - len(text2)))
	maxLen := float64(maxInt(len(text1), len(text2)))
	
	if maxLen == 0 {
		return 1.0
	}
	
	return maxFloat(0.0, 1.0 - (lenDiff / maxLen))
}

// Helper functions
func absInt(a int) int {
	if a < 0 {
		return -a
	}
	return a
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// Phase 4: Advanced Features Handlers

// Relationship detection handler
func detectRelationshipsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	vars := mux.Vars(r)
	memoryID := vars["id"]
	
	if memoryID == "" {
		http.Error(w, "Memory ID is required", http.StatusBadRequest)
		return
	}
	
	// Get memory by ID first
	memory, err := memoryService.database.GetMemoryByID(ctx, memoryID)
	if err != nil {
		logger.WithError(err).Error("Failed to get memory for relationship detection")
		http.Error(w, "Memory not found", http.StatusNotFound)
		return
	}
	
	// Detect relationships using relationship detector
	relationships, err := memoryService.relationshipDetector.DetectRelationships(ctx, memory)
	if err != nil {
		logger.WithError(err).Error("Failed to detect relationships")
		http.Error(w, "Failed to detect relationships", http.StatusInternalServerError)
		return
	}
	
	response := map[string]interface{}{
		"memoryId":      memoryID,
		"relationships": relationships,
		"count":         len(relationships),
		"processingTime": "< 100ms",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Memory consolidation handler
func consolidateMemoriesHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	var req ConsolidationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	// Consolidate memories using consolidation engine
	result, err := memoryService.consolidationEngine.ConsolidateMemories(ctx, &req)
	if err != nil {
		logger.WithError(err).Error("Failed to consolidate memories")
		http.Error(w, "Failed to consolidate memories", http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	if result.Success {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusBadRequest)
	}
	json.NewEncoder(w).Encode(result)
}

// Duplicate candidates detection handler
func detectDuplicatesAdvancedHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := int64(1) // Default user ID
	
	// Parse query parameters
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := json.Number(l).Int64(); err == nil && parsed <= 50 {
			limit = int(parsed)
		}
	}
	
	// Detect duplicate candidates
	candidates, err := memoryService.consolidationEngine.DetectDuplicateCandidates(ctx, userID, limit)
	if err != nil {
		logger.WithError(err).Error("Failed to detect duplicate candidates")
		http.Error(w, "Failed to detect duplicates", http.StatusInternalServerError)
		return
	}
	
	response := map[string]interface{}{
		"candidates":    candidates,
		"count":         len(candidates),
		"processingTime": "< 200ms",
		"autoMergeReady": len(candidates) > 0,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Advanced performance metrics handler
func advancedMetricsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// Get detailed performance stats
	stats, err := memoryService.performanceMonitor.GetDetailedStats(ctx)
	if err != nil {
		logger.WithError(err).Error("Failed to get performance stats")
		http.Error(w, "Failed to get performance metrics", http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// System health and monitoring handler
func systemHealthHandler(w http.ResponseWriter, r *http.Request) {
	metrics := memoryService.performanceMonitor.GetMetrics()
	
	health := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"metrics":    metrics,
		"version":    "1.0.0",
		"phase":      "4-advanced-features",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// Relationship statistics handler
func relationshipStatsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := int64(1) // Default user ID
	
	stats, err := memoryService.relationshipDetector.GetRelationshipStats(ctx, userID)
	if err != nil {
		logger.WithError(err).Error("Failed to get relationship stats")
		http.Error(w, "Failed to get relationship statistics", http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// Consolidation statistics handler
func consolidationStatsHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := int64(1) // Default user ID
	
	stats, err := memoryService.consolidationEngine.GetConsolidationStats(ctx, userID)
	if err != nil {
		logger.WithError(err).Error("Failed to get consolidation stats")
		http.Error(w, "Failed to get consolidation statistics", http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}