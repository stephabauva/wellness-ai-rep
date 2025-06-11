package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
)

// AIGateway represents the main gateway service
type AIGateway struct {
	config         ServiceConfig
	cache          *CacheService
	poolManager    *ConnectionPoolManager
	queue          *RequestQueue
	handlers       map[AIProvider]AIProviderHandler
	logger         *logrus.Logger
	startTime      time.Time
	router         *gin.Engine
	server         *http.Server
}

// NewAIGateway creates a new AI Gateway instance
func NewAIGateway() *AIGateway {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// Load configuration from environment
	config := loadConfig()

	// Set log level
	if level, err := logrus.ParseLevel(config.LogLevel); err == nil {
		logger.SetLevel(level)
	}

	// Initialize components
	cache := NewCacheService(config.CacheTTL, 10*time.Minute, logger)
	poolManager := NewConnectionPoolManager(logger)
	queue := NewRequestQueue(config.QueueSize, config.BatchSize, config.MaxWorkers, config.BatchTimeout, logger)

	// Initialize provider handlers
	handlers := make(map[AIProvider]AIProviderHandler)
	handlers[ProviderOpenAI] = NewOpenAIHandler(logger, config.RetryConfig)
	handlers[ProviderGoogle] = NewGoogleHandler(logger, config.RetryConfig)

	// Setup Gin router
	if config.LogLevel == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	gateway := &AIGateway{
		config:      config,
		cache:       cache,
		poolManager: poolManager,
		queue:       queue,
		handlers:    handlers,
		logger:      logger,
		startTime:   time.Now(),
	}

	gateway.setupRoutes()
	return gateway
}

// loadConfig loads configuration from environment variables
func loadConfig() ServiceConfig {
	config := ServiceConfig{
		Port:              8081, // Different from file service port
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		MaxWorkers:        getEnvInt("MAX_WORKERS", runtime.NumCPU()*2),
		QueueSize:         getEnvInt("QUEUE_SIZE", 1000),
		CacheSize:         getEnvInt("CACHE_SIZE", 10000),
		CacheTTL:          time.Duration(getEnvInt("CACHE_TTL_MINUTES", 30)) * time.Minute,
		BatchSize:         getEnvInt("BATCH_SIZE", 10),
		BatchTimeout:      time.Duration(getEnvInt("BATCH_TIMEOUT_MS", 1000)) * time.Millisecond,
		ConnectionTimeout: time.Duration(getEnvInt("CONNECTION_TIMEOUT_SEC", 30)) * time.Second,
		RequestTimeout:    time.Duration(getEnvInt("REQUEST_TIMEOUT_SEC", 60)) * time.Second,
		RetryConfig: RetryConfig{
			MaxRetries:      getEnvInt("MAX_RETRIES", 3),
			InitialDelay:    time.Duration(getEnvInt("INITIAL_DELAY_MS", 1000)) * time.Millisecond,
			MaxDelay:        time.Duration(getEnvInt("MAX_DELAY_MS", 30000)) * time.Millisecond,
			BackoffFactor:   2.0,
			RetryableErrors: []string{"timeout", "connection", "429", "502", "503", "504"},
		},
		RateLimits: map[AIProvider]RateLimitConfig{
			ProviderOpenAI: {
				RequestsPerSecond: getEnvInt("OPENAI_RPS", 50),
				BurstSize:         getEnvInt("OPENAI_BURST", 100),
				WindowDuration:    time.Minute,
			},
			ProviderGoogle: {
				RequestsPerSecond: getEnvInt("GOOGLE_RPS", 30),
				BurstSize:         getEnvInt("GOOGLE_BURST", 60),
				WindowDuration:    time.Minute,
			},
		},
		Providers: map[AIProvider]ProviderConfig{
			ProviderOpenAI: {
				APIKey:         getEnv("OPENAI_API_KEY", ""),
				BaseURL:        getEnv("OPENAI_BASE_URL", "https://api.openai.com"),
				MaxConnections: getEnvInt("OPENAI_MAX_CONNS", 20),
				RequestTimeout: time.Duration(getEnvInt("OPENAI_TIMEOUT_SEC", 60)) * time.Second,
				Enabled:        getEnv("OPENAI_API_KEY", "") != "",
			},
			ProviderGoogle: {
				APIKey:         getEnv("GOOGLE_AI_API_KEY", ""),
				BaseURL:        getEnv("GOOGLE_BASE_URL", "https://generativelanguage.googleapis.com"),
				MaxConnections: getEnvInt("GOOGLE_MAX_CONNS", 20),
				RequestTimeout: time.Duration(getEnvInt("GOOGLE_TIMEOUT_SEC", 60)) * time.Second,
				Enabled:        getEnv("GOOGLE_AI_API_KEY", "") != "",
			},
		},
	}

	// Override port if specified
	if port := getEnvInt("AI_GATEWAY_PORT", 0); port > 0 {
		config.Port = port
	}

	return config
}

// setupRoutes configures HTTP routes
func (gw *AIGateway) setupRoutes() {
	gw.router = gin.New()

	// Middleware
	gw.router.Use(gin.Logger())
	gw.router.Use(gin.Recovery())
	gw.router.Use(gw.corsMiddleware())
	gw.router.Use(gw.authMiddleware())

	// Health endpoints
	gw.router.GET("/health", gw.healthHandler)
	gw.router.GET("/metrics", gw.metricsHandler)

	// AI request endpoints
	v1 := gw.router.Group("/v1")
	{
		v1.POST("/chat", gw.chatHandler)
		v1.POST("/batch", gw.batchHandler)
		v1.GET("/models", gw.modelsHandler)
	}

	// Admin endpoints
	admin := gw.router.Group("/admin")
	{
		admin.GET("/stats", gw.statsHandler)
		admin.GET("/cache", gw.cacheStatsHandler)
		admin.DELETE("/cache", gw.clearCacheHandler)
		admin.GET("/queue", gw.queueStatsHandler)
		admin.POST("/config", gw.updateConfigHandler)
	}
}

// Start starts the AI Gateway service
func (gw *AIGateway) Start() error {
	gw.logger.Info("Starting AI Gateway service")

	// Initialize connection pools
	for provider, config := range gw.config.Providers {
		if config.Enabled {
			rateLimitConfig := gw.config.RateLimits[provider]
			if err := gw.poolManager.AddPool(provider, config, rateLimitConfig); err != nil {
				return fmt.Errorf("failed to add connection pool for %s: %w", provider, err)
			}
		}
	}

	// Start request queue
	gw.queue.Start(gw.processBatch)

	// Start HTTP server
	gw.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", gw.config.Port),
		Handler: gw.router,
	}

	gw.logger.WithFields(logrus.Fields{
		"port":        gw.config.Port,
		"workers":     gw.config.MaxWorkers,
		"queue_size":  gw.config.QueueSize,
		"cache_ttl":   gw.config.CacheTTL,
		"batch_size":  gw.config.BatchSize,
		"providers":   len(gw.config.Providers),
	}).Info("AI Gateway started successfully")

	return gw.server.ListenAndServe()
}

// chatHandler handles individual chat requests
func (gw *AIGateway) chatHandler(c *gin.Context) {
	var req AIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:     "Invalid request format",
			Code:      "INVALID_REQUEST",
			Details:   err.Error(),
			Timestamp: time.Now(),
		})
		return
	}

	// Generate request ID if not provided
	if req.ID == "" {
		req.ID = fmt.Sprintf("req_%d", time.Now().UnixNano())
	}
	req.Timestamp = time.Now()

	// Check cache first
	if cached, found := gw.cache.Get(req); found {
		gw.logger.WithField("request_id", req.ID).Debug("Returning cached response")
		c.JSON(http.StatusOK, cached)
		return
	}

	// Validate provider
	if !gw.config.Providers[req.Provider].Enabled {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:     fmt.Sprintf("Provider %s is not enabled", req.Provider),
			Code:      "PROVIDER_DISABLED",
			RequestID: req.ID,
			Timestamp: time.Now(),
		})
		return
	}

	// Process request
	priority := req.Priority
	if priority == 0 {
		priority = 3 // Default priority
	}

	// For high priority requests, process immediately
	if priority >= 4 {
		response, err := gw.processRequest(c.Request.Context(), req)
		if err != nil {
			gw.logger.WithError(err).Error("High priority request failed")
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Error:     "Request processing failed",
				Code:      "PROCESSING_ERROR",
				Details:   err.Error(),
				RequestID: req.ID,
				Timestamp: time.Now(),
			})
			return
		}

		// Cache successful response
		gw.cache.Set(req, *response)
		c.JSON(http.StatusOK, response)
		return
	}

	// Enqueue request for batch processing
	if err := gw.queue.Enqueue(req, priority); err != nil {
		c.JSON(http.StatusServiceUnavailable, ErrorResponse{
			Error:     "Queue is full",
			Code:      "QUEUE_FULL",
			Details:   err.Error(),
			RequestID: req.ID,
			Timestamp: time.Now(),
		})
		return
	}

	// For queued requests, return immediately with status
	c.JSON(http.StatusAccepted, map[string]interface{}{
		"request_id": req.ID,
		"status":     "queued",
		"message":    "Request queued for processing",
		"timestamp":  time.Now(),
	})
}

// batchHandler handles batch requests
func (gw *AIGateway) batchHandler(c *gin.Context) {
	var batchReq BatchRequest
	if err := c.ShouldBindJSON(&batchReq); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:     "Invalid batch request format",
			Code:      "INVALID_BATCH_REQUEST",
			Details:   err.Error(),
			Timestamp: time.Now(),
		})
		return
	}

	if batchReq.ID == "" {
		batchReq.ID = fmt.Sprintf("batch_%d", time.Now().UnixNano())
	}
	batchReq.Timestamp = time.Now()

	responses, err := gw.processBatch(batchReq.Requests)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:     "Batch processing failed",
			Code:      "BATCH_ERROR",
			Details:   err.Error(),
			RequestID: batchReq.ID,
			Timestamp: time.Now(),
		})
		return
	}

	batchResp := BatchResponse{
		ID:             batchReq.ID,
		Responses:      responses,
		ProcessingTime: time.Since(batchReq.Timestamp),
		SuccessCount:   len(responses),
		Timestamp:      time.Now(),
	}

	c.JSON(http.StatusOK, batchResp)
}

// processRequest processes a single AI request
func (gw *AIGateway) processRequest(ctx context.Context, req AIRequest) (*AIResponse, error) {
	handler, exists := gw.handlers[req.Provider]
	if !exists {
		return nil, fmt.Errorf("no handler for provider: %s", req.Provider)
	}

	pool, err := gw.poolManager.GetPool(req.Provider)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection pool: %w", err)
	}

	return handler.ProcessRequest(ctx, req, pool)
}

// processBatch processes multiple AI requests
func (gw *AIGateway) processBatch(requests []AIRequest) ([]AIResponse, error) {
	if len(requests) == 0 {
		return []AIResponse{}, nil
	}

	// Group requests by provider
	providerGroups := make(map[AIProvider][]AIRequest)
	for _, req := range requests {
		providerGroups[req.Provider] = append(providerGroups[req.Provider], req)
	}

	var allResponses []AIResponse
	ctx := context.Background()

	// Process each provider group
	for provider, providerRequests := range providerGroups {
		handler, exists := gw.handlers[provider]
		if !exists {
			gw.logger.WithField("provider", provider).Error("No handler for provider")
			continue
		}

		pool, err := gw.poolManager.GetPool(provider)
		if err != nil {
			gw.logger.WithError(err).WithField("provider", provider).Error("Failed to get connection pool")
			continue
		}

		responses, err := handler.ProcessBatch(ctx, providerRequests, pool)
		if err != nil {
			gw.logger.WithError(err).WithField("provider", provider).Error("Batch processing failed")
			continue
		}

		// Cache successful responses
		for i, req := range providerRequests {
			if i < len(responses) {
				gw.cache.Set(req, responses[i])
			}
		}

		allResponses = append(allResponses, responses...)
	}

	return allResponses, nil
}

// healthHandler returns service health status
func (gw *AIGateway) healthHandler(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check provider health
	healthResults := gw.poolManager.HealthCheckAll(ctx)
	providers := make(map[AIProvider]bool)
	var errors []string

	for provider, err := range healthResults {
		if err != nil {
			providers[provider] = false
			errors = append(errors, fmt.Sprintf("%s: %s", provider, err.Error()))
		} else {
			providers[provider] = true
		}
	}

	status := "healthy"
	if len(errors) > 0 {
		status = "degraded"
	}

	health := HealthStatus{
		Status:    status,
		Timestamp: time.Now(),
		Version:   "1.0.0",
		Uptime:    time.Since(gw.startTime),
		Stats:     gw.getGatewayStats(),
		Providers: providers,
		Errors:    errors,
	}

	c.JSON(http.StatusOK, health)
}

// metricsHandler returns Prometheus-style metrics
func (gw *AIGateway) metricsHandler(c *gin.Context) {
	stats := gw.getGatewayStats()
	
	metrics := fmt.Sprintf(`# HELP ai_gateway_requests_total Total number of requests
# TYPE ai_gateway_requests_total counter
ai_gateway_requests_total %d

# HELP ai_gateway_cache_hit_rate Cache hit rate
# TYPE ai_gateway_cache_hit_rate gauge
ai_gateway_cache_hit_rate %f

# HELP ai_gateway_queue_length Current queue length
# TYPE ai_gateway_queue_length gauge
ai_gateway_queue_length %d

# HELP ai_gateway_active_workers Current active workers
# TYPE ai_gateway_active_workers gauge
ai_gateway_active_workers %d

# HELP ai_gateway_uptime_seconds Service uptime in seconds
# TYPE ai_gateway_uptime_seconds gauge
ai_gateway_uptime_seconds %f
`,
		stats.TotalRequests,
		stats.CacheHitRate,
		stats.QueueLength,
		stats.ActiveWorkers,
		stats.Uptime.Seconds(),
	)

	c.Header("Content-Type", "text/plain")
	c.String(http.StatusOK, metrics)
}

// getGatewayStats returns current gateway statistics
func (gw *AIGateway) getGatewayStats() GatewayStats {
	cacheStats := gw.cache.GetStats()
	queueStats := gw.queue.GetStats()
	connectionStats := gw.poolManager.GetAllStats()

	return GatewayStats{
		Uptime:            time.Since(gw.startTime),
		TotalRequests:     queueStats.TotalProcessed,
		CacheHitRate:      cacheStats["hit_rate"].(float64),
		AvgProcessingTime: float64(queueStats.AvgWaitTime.Milliseconds()),
		QueueLength:       queueStats.CurrentSize,
		ActiveWorkers:     queueStats.ActiveWorkers,
		ConnectionPools:   connectionStats,
		ErrorRate:         float64(queueStats.TotalErrors) / float64(queueStats.TotalEnqueued),
		RequestsPerSecond: float64(queueStats.TotalProcessed) / time.Since(gw.startTime).Seconds(),
		MemoryUsage:       cacheStats["memory_usage"].(int64),
	}
}

// Middleware functions
func (gw *AIGateway) corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Authorization, Content-Type, X-Requested-With")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func (gw *AIGateway) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simple API key auth (in production, use proper JWT or OAuth)
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			apiKey = c.Query("api_key")
		}

		// For development, allow requests without API key
		if apiKey == "" && gw.config.LogLevel == "debug" {
			c.Next()
			return
		}

		// Validate API key (implement your logic here)
		expectedKey := getEnv("API_KEY", "ai-gateway-dev-key")
		if apiKey != expectedKey {
			c.JSON(http.StatusUnauthorized, ErrorResponse{
				Error:     "Invalid API key",
				Code:      "UNAUTHORIZED",
				Timestamp: time.Now(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Additional handlers
func (gw *AIGateway) statsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gw.getGatewayStats())
}

func (gw *AIGateway) cacheStatsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gw.cache.GetStats())
}

func (gw *AIGateway) clearCacheHandler(c *gin.Context) {
	gw.cache.Clear()
	c.JSON(http.StatusOK, map[string]string{"message": "Cache cleared"})
}

func (gw *AIGateway) queueStatsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gw.queue.GetStats())
}

func (gw *AIGateway) updateConfigHandler(c *gin.Context) {
	// Implement configuration updates (restart required for some changes)
	c.JSON(http.StatusNotImplemented, map[string]string{"message": "Configuration updates not implemented"})
}

func (gw *AIGateway) modelsHandler(c *gin.Context) {
	models := map[string]interface{}{
		"openai": []map[string]interface{}{
			{"id": "gpt-4o", "name": "GPT-4o", "description": "Most capable model"},
			{"id": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "Fast and efficient"},
		},
		"google": []map[string]interface{}{
			{"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "description": "Advanced reasoning"},
			{"id": "gemini-2.0-flash-exp", "name": "Gemini 2.0 Flash", "description": "Ultra-fast responses"},
		},
	}
	c.JSON(http.StatusOK, models)
}

// Utility functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// Shutdown gracefully shuts down the service
func (gw *AIGateway) Shutdown(ctx context.Context) error {
	gw.logger.Info("Shutting down AI Gateway")

	// Stop accepting new requests
	if err := gw.server.Shutdown(ctx); err != nil {
		return err
	}

	// Drain the queue
	if err := gw.queue.Drain(ctx); err != nil {
		gw.logger.WithError(err).Warn("Failed to drain queue completely")
	}

	// Stop queue
	gw.queue.Stop()

	// Shutdown connection pools
	if err := gw.poolManager.Shutdown(ctx); err != nil {
		return err
	}

	gw.logger.Info("AI Gateway shut down successfully")
	return nil
}

// main function
func main() {
	gateway := NewAIGateway()

	// Handle graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := gateway.Shutdown(ctx); err != nil {
			gateway.logger.WithError(err).Error("Failed to shutdown gracefully")
		}
		os.Exit(0)
	}()

	// Start the gateway
	if err := gateway.Start(); err != nil && err != http.ErrServerClosed {
		gateway.logger.WithError(err).Fatal("Failed to start AI Gateway")
	}
}