package main

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"golang.org/x/time/rate"
)

// ConnectionPool manages HTTP connections to AI providers
type ConnectionPool struct {
	provider       AIProvider
	config         ProviderConfig
	client         *http.Client
	rateLimiter    *rate.Limiter
	mutex          sync.RWMutex
	stats          ConnectionPoolStats
	logger         *logrus.Logger
	activeRequests map[string]*http.Request
	lastUsed       time.Time
	isHealthy      bool
	healthCheckURL string
}

// ConnectionPoolManager manages multiple connection pools
type ConnectionPoolManager struct {
	pools  map[AIProvider]*ConnectionPool
	mutex  sync.RWMutex
	logger *logrus.Logger
}

// NewConnectionPoolManager creates a new connection pool manager
func NewConnectionPoolManager(logger *logrus.Logger) *ConnectionPoolManager {
	return &ConnectionPoolManager{
		pools:  make(map[AIProvider]*ConnectionPool),
		logger: logger,
	}
}

// NewConnectionPool creates a new connection pool for a provider
func NewConnectionPool(provider AIProvider, config ProviderConfig, rateLimitConfig RateLimitConfig, logger *logrus.Logger) *ConnectionPool {
	// Create custom HTTP transport with connection pooling
	transport := &http.Transport{
		MaxIdleConns:        config.MaxConnections,
		MaxIdleConnsPerHost: config.MaxConnections,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		DisableKeepAlives:   false,
	}

	// Create HTTP client with timeouts
	client := &http.Client{
		Transport: transport,
		Timeout:   config.RequestTimeout,
	}

	// Create rate limiter
	rateLimiter := rate.NewLimiter(rate.Limit(rateLimitConfig.RequestsPerSecond), rateLimitConfig.BurstSize)

	// Set health check URL based on provider
	var healthCheckURL string
	switch provider {
	case ProviderOpenAI:
		healthCheckURL = config.BaseURL + "/models"
	case ProviderGoogle:
		healthCheckURL = config.BaseURL + "/v1/models"
	default:
		healthCheckURL = config.BaseURL + "/health"
	}

	pool := &ConnectionPool{
		provider:       provider,
		config:         config,
		client:         client,
		rateLimiter:    rateLimiter,
		logger:         logger,
		activeRequests: make(map[string]*http.Request),
		lastUsed:       time.Now(),
		isHealthy:      true,
		healthCheckURL: healthCheckURL,
		stats: ConnectionPoolStats{
			Provider:    provider,
			MaxConns:    config.MaxConnections,
			IdleConns:   0,
			ActiveConns: 0,
		},
	}

	return pool
}

// AddPool adds a connection pool for a provider
func (cpm *ConnectionPoolManager) AddPool(provider AIProvider, config ProviderConfig, rateLimitConfig RateLimitConfig) error {
	cpm.mutex.Lock()
	defer cpm.mutex.Unlock()

	if !config.Enabled {
		cpm.logger.WithField("provider", provider).Info("Provider disabled, skipping pool creation")
		return nil
	}

	pool := NewConnectionPool(provider, config, rateLimitConfig, cpm.logger)
	cpm.pools[provider] = pool

	cpm.logger.WithFields(logrus.Fields{
		"provider":        provider,
		"max_connections": config.MaxConnections,
		"base_url":        config.BaseURL,
	}).Info("Connection pool created")

	return nil
}

// GetPool retrieves a connection pool for a provider
func (cpm *ConnectionPoolManager) GetPool(provider AIProvider) (*ConnectionPool, error) {
	cpm.mutex.RLock()
	defer cpm.mutex.RUnlock()

	pool, exists := cpm.pools[provider]
	if !exists {
		return nil, fmt.Errorf("connection pool not found for provider: %s", provider)
	}

	if !pool.isHealthy {
		return nil, fmt.Errorf("connection pool for provider %s is unhealthy", provider)
	}

	return pool, nil
}

// MakeRequest makes an HTTP request using the connection pool
func (cp *ConnectionPool) MakeRequest(ctx context.Context, req *http.Request) (*http.Response, error) {
	// Wait for rate limiter
	if err := cp.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit wait failed: %w", err)
	}

	cp.mutex.Lock()
	requestID := fmt.Sprintf("%s-%d", req.URL.Path, time.Now().UnixNano())
	cp.activeRequests[requestID] = req
	cp.stats.ActiveConns = len(cp.activeRequests)
	cp.stats.TotalRequests++
	cp.lastUsed = time.Now()
	cp.mutex.Unlock()

	startTime := time.Now()

	// Make the request
	resp, err := cp.client.Do(req.WithContext(ctx))

	// Update statistics
	cp.mutex.Lock()
	delete(cp.activeRequests, requestID)
	cp.stats.ActiveConns = len(cp.activeRequests)
	
	duration := time.Since(startTime)
	
	if err != nil {
		cp.stats.FailedReqs++
		cp.logger.WithFields(logrus.Fields{
			"provider":    cp.provider,
			"error":       err.Error(),
			"duration_ms": duration.Milliseconds(),
		}).Error("Request failed")
	} else {
		cp.stats.SuccessfulReqs++
		
		// Update average response time
		totalSuccessful := cp.stats.SuccessfulReqs
		cp.stats.AvgResponseTime = ((cp.stats.AvgResponseTime * float64(totalSuccessful-1)) + float64(duration.Milliseconds())) / float64(totalSuccessful)
		
		cp.logger.WithFields(logrus.Fields{
			"provider":    cp.provider,
			"status_code": resp.StatusCode,
			"duration_ms": duration.Milliseconds(),
		}).Debug("Request completed")
	}
	cp.mutex.Unlock()

	return resp, err
}

// HealthCheck performs a health check on the connection pool
func (cp *ConnectionPool) HealthCheck(ctx context.Context) error {
	if cp.healthCheckURL == "" {
		return nil // No health check configured
	}

	req, err := http.NewRequestWithContext(ctx, "GET", cp.healthCheckURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	// Add authentication if available
	if cp.config.APIKey != "" {
		switch cp.provider {
		case ProviderOpenAI:
			req.Header.Set("Authorization", "Bearer "+cp.config.APIKey)
		case ProviderGoogle:
			req.Header.Set("Authorization", "Bearer "+cp.config.APIKey)
		}
	}

	resp, err := cp.client.Do(req)
	if err != nil {
		cp.isHealthy = false
		return fmt.Errorf("health check request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		cp.isHealthy = true
		cp.logger.WithField("provider", cp.provider).Debug("Health check passed")
		return nil
	}

	cp.isHealthy = false
	return fmt.Errorf("health check failed with status: %d", resp.StatusCode)
}

// GetStats returns connection pool statistics
func (cp *ConnectionPool) GetStats() ConnectionPoolStats {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()

	stats := cp.stats
	stats.ActiveConns = len(cp.activeRequests)
	stats.IdleConns = cp.config.MaxConnections - stats.ActiveConns

	return stats
}

// IsHealthy returns the health status of the connection pool
func (cp *ConnectionPool) IsHealthy() bool {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()
	return cp.isHealthy
}

// Close closes the connection pool
func (cp *ConnectionPool) Close() {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	// Cancel active requests
	for _, req := range cp.activeRequests {
		if req.Context() != nil {
			// Context cancellation will be handled by the caller
		}
	}

	cp.activeRequests = make(map[string]*http.Request)
	cp.client.CloseIdleConnections()
	
	cp.logger.WithField("provider", cp.provider).Info("Connection pool closed")
}

// GetAllStats returns statistics for all pools
func (cpm *ConnectionPoolManager) GetAllStats() []ConnectionPoolStats {
	cpm.mutex.RLock()
	defer cpm.mutex.RUnlock()

	var stats []ConnectionPoolStats
	for _, pool := range cpm.pools {
		stats = append(stats, pool.GetStats())
	}

	return stats
}

// HealthCheckAll performs health checks on all pools
func (cpm *ConnectionPoolManager) HealthCheckAll(ctx context.Context) map[AIProvider]error {
	cpm.mutex.RLock()
	defer cpm.mutex.RUnlock()

	results := make(map[AIProvider]error)
	
	for provider, pool := range cpm.pools {
		if err := pool.HealthCheck(ctx); err != nil {
			results[provider] = err
			cpm.logger.WithFields(logrus.Fields{
				"provider": provider,
				"error":    err.Error(),
			}).Warn("Health check failed")
		} else {
			results[provider] = nil
		}
	}

	return results
}

// CleanupIdlePools removes unused connection pools
func (cpm *ConnectionPoolManager) CleanupIdlePools(idleThreshold time.Duration) int {
	cpm.mutex.Lock()
	defer cpm.mutex.Unlock()

	cleaned := 0
	now := time.Now()

	for provider, pool := range cpm.pools {
		if now.Sub(pool.lastUsed) > idleThreshold && pool.stats.ActiveConns == 0 {
			pool.Close()
			delete(cpm.pools, provider)
			cleaned++
			
			cpm.logger.WithFields(logrus.Fields{
				"provider":    provider,
				"idle_time":   now.Sub(pool.lastUsed),
				"threshold":   idleThreshold,
			}).Info("Cleaned up idle connection pool")
		}
	}

	return cleaned
}

// UpdateRateLimit updates the rate limit for a specific provider
func (cpm *ConnectionPoolManager) UpdateRateLimit(provider AIProvider, newLimit rate.Limit, newBurst int) error {
	cpm.mutex.Lock()
	defer cpm.mutex.Unlock()

	pool, exists := cpm.pools[provider]
	if !exists {
		return fmt.Errorf("provider %s not found", provider)
	}

	pool.rateLimiter.SetLimit(newLimit)
	pool.rateLimiter.SetBurst(newBurst)

	cpm.logger.WithFields(logrus.Fields{
		"provider":  provider,
		"new_limit": newLimit,
		"new_burst": newBurst,
	}).Info("Rate limit updated")

	return nil
}

// GetHealthyProviders returns a list of healthy providers
func (cpm *ConnectionPoolManager) GetHealthyProviders() []AIProvider {
	cpm.mutex.RLock()
	defer cpm.mutex.RUnlock()

	var healthy []AIProvider
	for provider, pool := range cpm.pools {
		if pool.IsHealthy() {
			healthy = append(healthy, provider)
		}
	}

	return healthy
}

// Shutdown gracefully shuts down all connection pools
func (cpm *ConnectionPoolManager) Shutdown(ctx context.Context) error {
	cpm.mutex.Lock()
	defer cpm.mutex.Unlock()

	cpm.logger.Info("Shutting down connection pool manager")

	for provider, pool := range cpm.pools {
		pool.Close()
		cpm.logger.WithField("provider", provider).Info("Connection pool shut down")
	}

	cpm.pools = make(map[AIProvider]*ConnectionPool)
	return nil
}