package main

import (
	"time"
)

// AIProvider represents different AI providers
type AIProvider string

const (
	ProviderOpenAI AIProvider = "openai"
	ProviderGoogle AIProvider = "google"
)

// AIRequest represents an incoming AI request
type AIRequest struct {
	ID                    string            `json:"id"`
	Provider              AIProvider        `json:"provider"`
	Model                 string            `json:"model"`
	Messages              []ChatMessage     `json:"messages"`
	Stream                bool              `json:"stream,omitempty"`
	Temperature           float32           `json:"temperature,omitempty"`
	MaxTokens             int               `json:"max_tokens,omitempty"`
	UserID                int               `json:"user_id"`
	ConversationID        string            `json:"conversation_id"`
	CoachingMode          string            `json:"coaching_mode,omitempty"`
	Attachments           []Attachment      `json:"attachments,omitempty"`
	AutoModelSelection    bool              `json:"auto_model_selection,omitempty"`
	Metadata              map[string]interface{} `json:"metadata,omitempty"`
	Priority              int               `json:"priority,omitempty"` // 1-5, 5 being highest
	RetryCount            int               `json:"retry_count,omitempty"`
	Timestamp             time.Time         `json:"timestamp"`
}

// ChatMessage represents a single message in the conversation
type ChatMessage struct {
	Role    string `json:"role"`    // "user", "assistant", "system"
	Content string `json:"content"`
}

// Attachment represents file attachments
type Attachment struct {
	ID          string `json:"id"`
	FileName    string `json:"file_name"`
	FileType    string `json:"file_type"`
	FileSize    int64  `json:"file_size"`
	URL         string `json:"url,omitempty"`
	Data        []byte `json:"data,omitempty"`
}

// AIResponse represents the response from AI providers
type AIResponse struct {
	ID              string            `json:"id"`
	RequestID       string            `json:"request_id"`
	Provider        AIProvider        `json:"provider"`
	Model           string            `json:"model"`
	Content         string            `json:"content"`
	FinishReason    string            `json:"finish_reason,omitempty"`
	Usage           TokenUsage        `json:"usage,omitempty"`
	ProcessingTime  time.Duration     `json:"processing_time"`
	CacheHit        bool              `json:"cache_hit"`
	RetryAttempt    int               `json:"retry_attempt"`
	Timestamp       time.Time         `json:"timestamp"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// TokenUsage represents token usage statistics
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// BatchRequest represents a batch of AI requests
type BatchRequest struct {
	ID        string      `json:"id"`
	Requests  []AIRequest `json:"requests"`
	Priority  int         `json:"priority"`
	Timestamp time.Time   `json:"timestamp"`
}

// BatchResponse represents a batch response
type BatchResponse struct {
	ID              string        `json:"id"`
	Responses       []AIResponse  `json:"responses"`
	ProcessingTime  time.Duration `json:"processing_time"`
	SuccessCount    int           `json:"success_count"`
	ErrorCount      int           `json:"error_count"`
	Timestamp       time.Time     `json:"timestamp"`
}

// QueuedRequest represents a request in the processing queue
type QueuedRequest struct {
	Request   AIRequest `json:"request"`
	Priority  int       `json:"priority"`
	Timestamp time.Time `json:"timestamp"`
	Retries   int       `json:"retries"`
}

// ConnectionPoolStats represents connection pool statistics
type ConnectionPoolStats struct {
	Provider        AIProvider `json:"provider"`
	ActiveConns     int        `json:"active_connections"`
	IdleConns       int        `json:"idle_connections"`
	MaxConns        int        `json:"max_connections"`
	TotalRequests   int64      `json:"total_requests"`
	SuccessfulReqs  int64      `json:"successful_requests"`
	FailedReqs      int64      `json:"failed_requests"`
	AvgResponseTime float64    `json:"avg_response_time_ms"`
}

// GatewayStats represents overall gateway statistics
type GatewayStats struct {
	Uptime              time.Duration         `json:"uptime"`
	TotalRequests       int64                 `json:"total_requests"`
	CacheHitRate        float64               `json:"cache_hit_rate"`
	AvgProcessingTime   float64               `json:"avg_processing_time_ms"`
	QueueLength         int                   `json:"queue_length"`
	ActiveWorkers       int                   `json:"active_workers"`
	ConnectionPools     []ConnectionPoolStats `json:"connection_pools"`
	ErrorRate           float64               `json:"error_rate"`
	RequestsPerSecond   float64               `json:"requests_per_second"`
	MemoryUsage         int64                 `json:"memory_usage_bytes"`
}

// HealthStatus represents service health
type HealthStatus struct {
	Status      string                `json:"status"`
	Timestamp   time.Time             `json:"timestamp"`
	Version     string                `json:"version"`
	Uptime      time.Duration         `json:"uptime"`
	Stats       GatewayStats          `json:"stats"`
	Providers   map[AIProvider]bool   `json:"providers"`
	Errors      []string              `json:"errors,omitempty"`
}

// CacheEntry represents a cached response
type CacheEntry struct {
	Key        string      `json:"key"`
	Response   AIResponse  `json:"response"`
	Timestamp  time.Time   `json:"timestamp"`
	TTL        time.Duration `json:"ttl"`
	HitCount   int         `json:"hit_count"`
	Size       int64       `json:"size_bytes"`
}

// RetryConfig represents retry configuration
type RetryConfig struct {
	MaxRetries      int           `json:"max_retries"`
	InitialDelay    time.Duration `json:"initial_delay"`
	MaxDelay        time.Duration `json:"max_delay"`
	BackoffFactor   float64       `json:"backoff_factor"`
	RetryableErrors []string      `json:"retryable_errors"`
}

// RateLimitConfig represents rate limiting configuration
type RateLimitConfig struct {
	RequestsPerSecond int           `json:"requests_per_second"`
	BurstSize         int           `json:"burst_size"`
	WindowDuration    time.Duration `json:"window_duration"`
}

// ServiceConfig represents the gateway configuration
type ServiceConfig struct {
	Port              int                        `json:"port"`
	LogLevel          string                     `json:"log_level"`
	MaxWorkers        int                        `json:"max_workers"`
	QueueSize         int                        `json:"queue_size"`
	CacheSize         int                        `json:"cache_size"`
	CacheTTL          time.Duration              `json:"cache_ttl"`
	BatchSize         int                        `json:"batch_size"`
	BatchTimeout      time.Duration              `json:"batch_timeout"`
	ConnectionTimeout time.Duration              `json:"connection_timeout"`
	RequestTimeout    time.Duration              `json:"request_timeout"`
	RetryConfig       RetryConfig                `json:"retry_config"`
	RateLimits        map[AIProvider]RateLimitConfig `json:"rate_limits"`
	Providers         map[AIProvider]ProviderConfig  `json:"providers"`
}

// ProviderConfig represents provider-specific configuration
type ProviderConfig struct {
	APIKey          string        `json:"api_key"`
	BaseURL         string        `json:"base_url"`
	MaxConnections  int           `json:"max_connections"`
	RequestTimeout  time.Duration `json:"request_timeout"`
	Enabled         bool          `json:"enabled"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error     string            `json:"error"`
	Code      string            `json:"code"`
	Details   string            `json:"details,omitempty"`
	RequestID string            `json:"request_id,omitempty"`
	Timestamp time.Time         `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}