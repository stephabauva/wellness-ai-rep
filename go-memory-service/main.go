package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
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
	// Get port from environment or default to 5001
	port := os.Getenv("GO_MEMORY_SERVICE_PORT")
	if port == "" {
		port = "5001"
	}

	// Set up router
	router := mux.NewRouter()
	
	// Health check endpoint
	router.HandleFunc("/health", healthHandler).Methods("GET")
	
	// Memory CRUD endpoints (frontend integration)
	router.HandleFunc("/api/memories", getMemoriesHandler).Methods("GET")
	router.HandleFunc("/api/memories/manual", createMemoryHandler).Methods("POST")
	router.HandleFunc("/api/memories/check-duplicates", checkDuplicatesHandler).Methods("POST")
	router.HandleFunc("/api/memories/{id}", updateMemoryHandler).Methods("PUT")
	router.HandleFunc("/api/memories/{id}", deleteMemoryHandler).Methods("DELETE")
	router.HandleFunc("/api/memories/overview", memoryOverviewHandler).Methods("GET")
	router.HandleFunc("/api/memories/quality-metrics", qualityMetricsHandler).Methods("GET")
	
	// Phase 4: Advanced Features endpoints (specific routes BEFORE parameterized routes)
	router.HandleFunc("/api/memories/stats/relationships", relationshipStatsHandler).Methods("GET")
	router.HandleFunc("/api/memories/stats/consolidation", consolidationStatsHandler).Methods("GET")
	router.HandleFunc("/api/memories/duplicates/advanced", detectDuplicatesAdvancedHandler).Methods("GET")
	router.HandleFunc("/api/memories/metrics/advanced", advancedMetricsHandler).Methods("GET")
	router.HandleFunc("/api/memories/consolidate", consolidateMemoriesHandler).Methods("POST")
	router.HandleFunc("/api/memories/{id}/relationships", detectRelationshipsHandler).Methods("GET")
	router.HandleFunc("/api/system/health", systemHealthHandler).Methods("GET")
	
	// Memory service endpoints (internal)
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

