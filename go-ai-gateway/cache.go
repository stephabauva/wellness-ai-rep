package main

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/patrickmn/go-cache"
	"github.com/sirupsen/logrus"
)

// CacheService handles response caching with intelligent TTL management
type CacheService struct {
	cache     *cache.Cache
	mutex     sync.RWMutex
	hitCount  int64
	missCount int64
	logger    *logrus.Logger
}

// NewCacheService creates a new cache service
func NewCacheService(defaultTTL, cleanupInterval time.Duration, logger *logrus.Logger) *CacheService {
	return &CacheService{
		cache:  cache.New(defaultTTL, cleanupInterval),
		logger: logger,
	}
}

// generateCacheKey creates a deterministic cache key from request parameters
func (cs *CacheService) generateCacheKey(req AIRequest) string {
	// Create a deterministic key based on critical request parameters
	keyData := struct {
		Provider    AIProvider    `json:"provider"`
		Model       string        `json:"model"`
		Messages    []ChatMessage `json:"messages"`
		Temperature float32       `json:"temperature"`
		MaxTokens   int           `json:"max_tokens"`
	}{
		Provider:    req.Provider,
		Model:       req.Model,
		Messages:    req.Messages,
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
	}

	jsonData, _ := json.Marshal(keyData)
	hash := md5.Sum(jsonData)
	return fmt.Sprintf("ai_req_%x", hash)
}

// Get retrieves a cached response
func (cs *CacheService) Get(req AIRequest) (*AIResponse, bool) {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	key := cs.generateCacheKey(req)
	
	if cached, found := cs.cache.Get(key); found {
		if entry, ok := cached.(*CacheEntry); ok {
			cs.hitCount++
			entry.HitCount++
			
			// Update the cache entry with new hit count
			cs.cache.Set(key, entry, entry.TTL)
			
			cs.logger.WithFields(logrus.Fields{
				"cache_key": key,
				"hit_count": entry.HitCount,
				"ttl":       entry.TTL,
			}).Debug("Cache hit")
			
			// Mark response as cache hit
			response := entry.Response
			response.CacheHit = true
			return &response, true
		}
	}

	cs.missCount++
	cs.logger.WithField("cache_key", key).Debug("Cache miss")
	return nil, false
}

// Set stores a response in cache with intelligent TTL
func (cs *CacheService) Set(req AIRequest, response AIResponse) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	key := cs.generateCacheKey(req)
	ttl := cs.calculateTTL(req, response)
	
	entry := &CacheEntry{
		Key:       key,
		Response:  response,
		Timestamp: time.Now(),
		TTL:       ttl,
		HitCount:  0,
		Size:      int64(len(response.Content)),
	}

	cs.cache.Set(key, entry, ttl)
	
	cs.logger.WithFields(logrus.Fields{
		"cache_key":    key,
		"ttl":          ttl,
		"response_size": entry.Size,
		"provider":     req.Provider,
		"model":        req.Model,
	}).Debug("Cached response")
}

// calculateTTL determines optimal TTL based on request characteristics
func (cs *CacheService) calculateTTL(req AIRequest, response AIResponse) time.Duration {
	baseTTL := 30 * time.Minute

	// Adjust TTL based on request type and characteristics
	switch {
	case len(req.Messages) == 1 && req.Messages[0].Role == "user":
		// Simple single messages can be cached longer
		baseTTL = 2 * time.Hour
		
	case len(req.Messages) > 10:
		// Long conversations should have shorter cache times
		baseTTL = 15 * time.Minute
		
	case req.Temperature > 0.7:
		// High temperature requests are more creative, cache less
		baseTTL = 10 * time.Minute
		
	case req.Temperature < 0.3:
		// Low temperature requests are more deterministic, cache longer
		baseTTL = 4 * time.Hour
		
	case len(req.Attachments) > 0:
		// Requests with attachments should be cached shorter
		baseTTL = 20 * time.Minute
	}

	// Adjust based on response characteristics
	if response.Usage.TotalTokens > 1000 {
		// Large responses should be cached longer to save costs
		baseTTL = baseTTL * 2
	}

	// Provider-specific adjustments
	switch req.Provider {
	case ProviderOpenAI:
		// OpenAI responses can be cached longer due to consistency
		baseTTL = baseTTL * 1.2
	case ProviderGoogle:
		// Google responses might vary more, shorter cache
		baseTTL = baseTTL * 0.8
	}

	return baseTTL
}

// Delete removes a cached entry
func (cs *CacheService) Delete(req AIRequest) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	key := cs.generateCacheKey(req)
	cs.cache.Delete(key)
	
	cs.logger.WithField("cache_key", key).Debug("Deleted cache entry")
}

// Clear removes all cached entries
func (cs *CacheService) Clear() {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	cs.cache.Flush()
	cs.hitCount = 0
	cs.missCount = 0
	
	cs.logger.Info("Cache cleared")
}

// GetStats returns cache statistics
func (cs *CacheService) GetStats() map[string]interface{} {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	totalRequests := cs.hitCount + cs.missCount
	hitRate := 0.0
	if totalRequests > 0 {
		hitRate = float64(cs.hitCount) / float64(totalRequests)
	}

	return map[string]interface{}{
		"hit_count":       cs.hitCount,
		"miss_count":      cs.missCount,
		"total_requests":  totalRequests,
		"hit_rate":        hitRate,
		"cache_size":      cs.cache.ItemCount(),
		"memory_usage":    cs.estimateMemoryUsage(),
	}
}

// estimateMemoryUsage provides rough memory usage estimate
func (cs *CacheService) estimateMemoryUsage() int64 {
	var totalSize int64
	
	for _, item := range cs.cache.Items() {
		if entry, ok := item.Object.(*CacheEntry); ok {
			totalSize += entry.Size
		}
	}
	
	return totalSize
}

// GetTopHits returns most frequently accessed cache entries
func (cs *CacheService) GetTopHits(limit int) []CacheEntry {
	cs.mutex.RLock()
	defer cs.mutex.RUnlock()

	var entries []CacheEntry
	
	for _, item := range cs.cache.Items() {
		if entry, ok := item.Object.(*CacheEntry); ok {
			entries = append(entries, *entry)
		}
	}

	// Sort by hit count (simple bubble sort for small datasets)
	for i := 0; i < len(entries)-1; i++ {
		for j := 0; j < len(entries)-i-1; j++ {
			if entries[j].HitCount < entries[j+1].HitCount {
				entries[j], entries[j+1] = entries[j+1], entries[j]
			}
		}
	}

	if limit > len(entries) {
		limit = len(entries)
	}
	
	return entries[:limit]
}

// CleanupExpired removes expired entries and returns count
func (cs *CacheService) CleanupExpired() int {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	initialCount := cs.cache.ItemCount()
	cs.cache.DeleteExpired()
	finalCount := cs.cache.ItemCount()
	
	cleaned := initialCount - finalCount
	
	if cleaned > 0 {
		cs.logger.WithField("cleaned_count", cleaned).Info("Cleaned expired cache entries")
	}
	
	return cleaned
}

// SetTTL updates TTL for a specific cache entry
func (cs *CacheService) SetTTL(req AIRequest, newTTL time.Duration) bool {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	key := cs.generateCacheKey(req)
	
	if cached, found := cs.cache.Get(key); found {
		if entry, ok := cached.(*CacheEntry); ok {
			entry.TTL = newTTL
			cs.cache.Set(key, entry, newTTL)
			
			cs.logger.WithFields(logrus.Fields{
				"cache_key": key,
				"new_ttl":   newTTL,
			}).Debug("Updated cache TTL")
			
			return true
		}
	}
	
	return false
}

// WarmUp pre-populates cache with common requests
func (cs *CacheService) WarmUp(commonRequests []AIRequest, responses []AIResponse) {
	cs.mutex.Lock()
	defer cs.mutex.Unlock()

	if len(commonRequests) != len(responses) {
		cs.logger.Error("Warmup failed: mismatched request/response counts")
		return
	}

	warmedCount := 0
	for i, req := range commonRequests {
		key := cs.generateCacheKey(req)
		ttl := cs.calculateTTL(req, responses[i])
		
		entry := &CacheEntry{
			Key:       key,
			Response:  responses[i],
			Timestamp: time.Now(),
			TTL:       ttl,
			HitCount:  0,
			Size:      int64(len(responses[i].Content)),
		}

		cs.cache.Set(key, entry, ttl)
		warmedCount++
	}

	cs.logger.WithField("warmed_count", warmedCount).Info("Cache warmed up")
}