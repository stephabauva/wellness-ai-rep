package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
)

var (
	memoryService *MemoryService
	logger        *logrus.Logger
)

func init() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize logger
	logger = logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// Initialize memory service
	var err error
	memoryService, err = NewMemoryService()
	if err != nil {
		log.Fatalf("Failed to initialize memory service: %v", err)
	}
}

func main() {
	// Get port from environment or default to 3001
	port := os.Getenv("GO_MEMORY_SERVICE_PORT")
	if port == "" {
		port = "3001"
	}

	// Set up router
	router := mux.NewRouter()
	
	// Health check endpoint
	router.HandleFunc("/health", healthHandler).Methods("GET")
	
	// Memory service endpoints
	router.HandleFunc("/api/memory/similarity", similarityHandler).Methods("POST")
	router.HandleFunc("/api/memory/contextual", contextualMemoryHandler).Methods("POST")
	router.HandleFunc("/api/memory/process", processMemoryHandler).Methods("POST")
	router.HandleFunc("/api/memory/stats", statsHandler).Methods("GET")
	router.HandleFunc("/api/memory/batch-similarity", batchSimilarityHandler).Methods("POST")
	router.HandleFunc("/api/memory/embeddings", embeddingHandler).Methods("POST")

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	// Create server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.WithFields(logrus.Fields{
			"port":     port,
			"goroutines": runtime.NumGoroutine(),
		}).Info("Starting Go Memory Service")
		
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down Go Memory Service...")

	// Create a deadline for shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown server
	if err := server.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %v", err)
	}

	// Shutdown memory service
	memoryService.Shutdown()

	logger.Info("Go Memory Service stopped")
}

// Health check handler
func healthHandler(w http.ResponseWriter, r *http.Request) {
	stats := memoryService.GetStats()
	
	health := map[string]interface{}{
		"status":     "healthy",
		"timestamp":  time.Now(),
		"stats":      stats,
		"goroutines": runtime.NumGoroutine(),
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