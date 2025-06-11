package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// AIProviderHandler handles AI provider specific logic
type AIProviderHandler interface {
	ProcessRequest(ctx context.Context, req AIRequest, pool *ConnectionPool) (*AIResponse, error)
	ProcessBatch(ctx context.Context, requests []AIRequest, pool *ConnectionPool) ([]AIResponse, error)
	ValidateRequest(req AIRequest) error
	GetModelLimits(model string) ModelLimits
}

// ModelLimits represents model-specific limits
type ModelLimits struct {
	MaxTokens       int     `json:"max_tokens"`
	MaxContextSize  int     `json:"max_context_size"`
	CostPerToken    float64 `json:"cost_per_token"`
	SupportsStream  bool    `json:"supports_stream"`
	SupportsImages  bool    `json:"supports_images"`
	SupportsFiles   bool    `json:"supports_files"`
}

// OpenAIHandler handles OpenAI API requests
type OpenAIHandler struct {
	logger *logrus.Logger
	config RetryConfig
}

// GoogleHandler handles Google AI API requests
type GoogleHandler struct {
	logger *logrus.Logger
	config RetryConfig
}

// NewOpenAIHandler creates a new OpenAI handler
func NewOpenAIHandler(logger *logrus.Logger, retryConfig RetryConfig) *OpenAIHandler {
	return &OpenAIHandler{
		logger: logger,
		config: retryConfig,
	}
}

// NewGoogleHandler creates a new Google AI handler
func NewGoogleHandler(logger *logrus.Logger, retryConfig RetryConfig) *GoogleHandler {
	return &GoogleHandler{
		logger: logger,
		config: retryConfig,
	}
}

// ProcessRequest processes a single OpenAI request
func (h *OpenAIHandler) ProcessRequest(ctx context.Context, req AIRequest, pool *ConnectionPool) (*AIResponse, error) {
	h.logger.WithFields(logrus.Fields{
		"request_id": req.ID,
		"model":      req.Model,
		"provider":   "openai",
	}).Debug("Processing OpenAI request")

	// Validate request
	if err := h.ValidateRequest(req); err != nil {
		return nil, fmt.Errorf("request validation failed: %w", err)
	}

	// Prepare OpenAI API request
	payload := h.buildOpenAIPayload(req)
	
	response, err := h.makeRequestWithRetry(ctx, pool, payload, req)
	if err != nil {
		return nil, err
	}

	return response, nil
}

// ProcessBatch processes multiple OpenAI requests
func (h *OpenAIHandler) ProcessBatch(ctx context.Context, requests []AIRequest, pool *ConnectionPool) ([]AIResponse, error) {
	h.logger.WithField("batch_size", len(requests)).Debug("Processing OpenAI batch")

	var responses []AIResponse
	var errors []error

	// Process requests concurrently with controlled concurrency
	semaphore := make(chan struct{}, 5) // Limit to 5 concurrent requests
	resultChan := make(chan struct {
		response *AIResponse
		err      error
		index    int
	}, len(requests))

	// Launch goroutines for each request
	for i, req := range requests {
		go func(index int, request AIRequest) {
			semaphore <- struct{}{} // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			resp, err := h.ProcessRequest(ctx, request, pool)
			resultChan <- struct {
				response *AIResponse
				err      error
				index    int
			}{resp, err, index}
		}(i, req)
	}

	// Collect results
	results := make([]*AIResponse, len(requests))
	for i := 0; i < len(requests); i++ {
		result := <-resultChan
		if result.err != nil {
			errors = append(errors, result.err)
			h.logger.WithError(result.err).Error("Batch request failed")
		} else {
			results[result.index] = result.response
		}
	}

	// Convert results to response slice, skipping failed requests
	for _, result := range results {
		if result != nil {
			responses = append(responses, *result)
		}
	}

	if len(errors) > 0 && len(responses) == 0 {
		return nil, fmt.Errorf("all batch requests failed, first error: %w", errors[0])
	}

	h.logger.WithFields(logrus.Fields{
		"total_requests": len(requests),
		"successful":     len(responses),
		"failed":         len(errors),
	}).Debug("Batch processing completed")

	return responses, nil
}

// buildOpenAIPayload creates OpenAI API payload
func (h *OpenAIHandler) buildOpenAIPayload(req AIRequest) map[string]interface{} {
	payload := map[string]interface{}{
		"model":    req.Model,
		"messages": req.Messages,
	}

	if req.Temperature > 0 {
		payload["temperature"] = req.Temperature
	}
	if req.MaxTokens > 0 {
		payload["max_tokens"] = req.MaxTokens
	}
	if req.Stream {
		payload["stream"] = true
	}

	return payload
}

// makeRequestWithRetry makes HTTP request with automatic retry logic
func (h *OpenAIHandler) makeRequestWithRetry(ctx context.Context, pool *ConnectionPool, payload map[string]interface{}, req AIRequest) (*AIResponse, error) {
	var lastErr error
	
	for attempt := 0; attempt <= h.config.MaxRetries; attempt++ {
		if attempt > 0 {
			// Calculate backoff delay
			delay := h.calculateBackoffDelay(attempt)
			h.logger.WithFields(logrus.Fields{
				"attempt": attempt,
				"delay":   delay,
				"request_id": req.ID,
			}).Info("Retrying request after delay")
			
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		response, err := h.makeHTTPRequest(ctx, pool, payload, req)
		if err != nil {
			lastErr = err
			
			// Check if error is retryable
			if !h.isRetryableError(err) {
				h.logger.WithError(err).Debug("Error is not retryable, stopping")
				break
			}
			
			h.logger.WithFields(logrus.Fields{
				"attempt": attempt + 1,
				"error":   err.Error(),
				"request_id": req.ID,
			}).Warn("Request failed, will retry")
			continue
		}

		// Success
		response.RetryAttempt = attempt
		return response, nil
	}

	return nil, fmt.Errorf("request failed after %d attempts: %w", h.config.MaxRetries+1, lastErr)
}

// makeHTTPRequest makes the actual HTTP request to OpenAI
func (h *OpenAIHandler) makeHTTPRequest(ctx context.Context, pool *ConnectionPool, payload map[string]interface{}, req AIRequest) (*AIResponse, error) {
	startTime := time.Now()

	// Marshal payload
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", pool.config.BaseURL+"/v1/chat/completions", bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+pool.config.APIKey)

	// Make request through connection pool
	resp, err := pool.MakeRequest(ctx, httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for API errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	// Parse OpenAI response
	var openAIResp struct {
		ID      string `json:"id"`
		Object  string `json:"object"`
		Created int64  `json:"created"`
		Model   string `json:"model"`
		Choices []struct {
			Index   int `json:"index"`
			Message struct {
				Role    string `json:"role"`
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return nil, fmt.Errorf("failed to parse OpenAI response: %w", err)
	}

	// Build response
	response := &AIResponse{
		ID:             openAIResp.ID,
		RequestID:      req.ID,
		Provider:       ProviderOpenAI,
		Model:          openAIResp.Model,
		ProcessingTime: time.Since(startTime),
		Timestamp:      time.Now(),
		Usage: TokenUsage{
			PromptTokens:     openAIResp.Usage.PromptTokens,
			CompletionTokens: openAIResp.Usage.CompletionTokens,
			TotalTokens:      openAIResp.Usage.TotalTokens,
		},
	}

	if len(openAIResp.Choices) > 0 {
		response.Content = openAIResp.Choices[0].Message.Content
		response.FinishReason = openAIResp.Choices[0].FinishReason
	}

	return response, nil
}

// ProcessRequest processes a single Google AI request
func (h *GoogleHandler) ProcessRequest(ctx context.Context, req AIRequest, pool *ConnectionPool) (*AIResponse, error) {
	h.logger.WithFields(logrus.Fields{
		"request_id": req.ID,
		"model":      req.Model,
		"provider":   "google",
	}).Debug("Processing Google AI request")

	// Validate request
	if err := h.ValidateRequest(req); err != nil {
		return nil, fmt.Errorf("request validation failed: %w", err)
	}

	// Prepare Google AI API request
	payload := h.buildGooglePayload(req)
	
	response, err := h.makeRequestWithRetry(ctx, pool, payload, req)
	if err != nil {
		return nil, err
	}

	return response, nil
}

// ProcessBatch processes multiple Google AI requests
func (h *GoogleHandler) ProcessBatch(ctx context.Context, requests []AIRequest, pool *ConnectionPool) ([]AIResponse, error) {
	h.logger.WithField("batch_size", len(requests)).Debug("Processing Google AI batch")

	var responses []AIResponse
	
	// Google AI doesn't have native batch API, so process sequentially with rate limiting
	for i, req := range requests {
		response, err := h.ProcessRequest(ctx, req, pool)
		if err != nil {
			h.logger.WithFields(logrus.Fields{
				"request_index": i,
				"request_id":    req.ID,
				"error":         err.Error(),
			}).Error("Batch request failed")
			continue
		}
		
		responses = append(responses, *response)
		
		// Add small delay between requests to respect rate limits
		if i < len(requests)-1 {
			time.Sleep(100 * time.Millisecond)
		}
	}

	return responses, nil
}

// buildGooglePayload creates Google AI API payload
func (h *GoogleHandler) buildGooglePayload(req AIRequest) map[string]interface{} {
	// Convert messages to Google format
	var contents []map[string]interface{}
	
	for _, msg := range req.Messages {
		role := msg.Role
		if role == "assistant" {
			role = "model"
		}
		
		content := map[string]interface{}{
			"role": role,
			"parts": []map[string]interface{}{
				{"text": msg.Content},
			},
		}
		contents = append(contents, content)
	}

	payload := map[string]interface{}{
		"contents": contents,
	}

	// Add generation config if specified
	if req.Temperature > 0 || req.MaxTokens > 0 {
		generationConfig := make(map[string]interface{})
		
		if req.Temperature > 0 {
			generationConfig["temperature"] = req.Temperature
		}
		if req.MaxTokens > 0 {
			generationConfig["maxOutputTokens"] = req.MaxTokens
		}
		
		payload["generationConfig"] = generationConfig
	}

	return payload
}

// makeRequestWithRetry makes HTTP request with automatic retry logic for Google
func (h *GoogleHandler) makeRequestWithRetry(ctx context.Context, pool *ConnectionPool, payload map[string]interface{}, req AIRequest) (*AIResponse, error) {
	var lastErr error
	
	for attempt := 0; attempt <= h.config.MaxRetries; attempt++ {
		if attempt > 0 {
			delay := h.calculateBackoffDelay(attempt)
			h.logger.WithFields(logrus.Fields{
				"attempt": attempt,
				"delay":   delay,
				"request_id": req.ID,
			}).Info("Retrying Google AI request after delay")
			
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		response, err := h.makeHTTPRequest(ctx, pool, payload, req)
		if err != nil {
			lastErr = err
			
			if !h.isRetryableError(err) {
				break
			}
			
			continue
		}

		response.RetryAttempt = attempt
		return response, nil
	}

	return nil, fmt.Errorf("Google AI request failed after %d attempts: %w", h.config.MaxRetries+1, lastErr)
}

// makeHTTPRequest makes the actual HTTP request to Google AI
func (h *GoogleHandler) makeHTTPRequest(ctx context.Context, pool *ConnectionPool, payload map[string]interface{}, req AIRequest) (*AIResponse, error) {
	startTime := time.Now()

	// Marshal payload
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Build URL with model and API key
	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", 
		pool.config.BaseURL, req.Model, pool.config.APIKey)

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Make request through connection pool
	resp, err := pool.MakeRequest(ctx, httpReq)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for API errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Google AI API error %d: %s", resp.StatusCode, string(body))
	}

	// Parse Google AI response
	var googleResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
				Role string `json:"role"`
			} `json:"content"`
			FinishReason string `json:"finishReason"`
		} `json:"candidates"`
		UsageMetadata struct {
			PromptTokenCount     int `json:"promptTokenCount"`
			CandidatesTokenCount int `json:"candidatesTokenCount"`
			TotalTokenCount      int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}

	if err := json.Unmarshal(body, &googleResp); err != nil {
		return nil, fmt.Errorf("failed to parse Google AI response: %w", err)
	}

	// Build response
	response := &AIResponse{
		ID:             req.ID + "_google",
		RequestID:      req.ID,
		Provider:       ProviderGoogle,
		Model:          req.Model,
		ProcessingTime: time.Since(startTime),
		Timestamp:      time.Now(),
		Usage: TokenUsage{
			PromptTokens:     googleResp.UsageMetadata.PromptTokenCount,
			CompletionTokens: googleResp.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      googleResp.UsageMetadata.TotalTokenCount,
		},
	}

	if len(googleResp.Candidates) > 0 && len(googleResp.Candidates[0].Content.Parts) > 0 {
		response.Content = googleResp.Candidates[0].Content.Parts[0].Text
		response.FinishReason = googleResp.Candidates[0].FinishReason
	}

	return response, nil
}

// calculateBackoffDelay calculates exponential backoff delay
func (h *OpenAIHandler) calculateBackoffDelay(attempt int) time.Duration {
	delay := float64(h.config.InitialDelay) * math.Pow(h.config.BackoffFactor, float64(attempt-1))
	maxDelay := float64(h.config.MaxDelay)
	
	if delay > maxDelay {
		delay = maxDelay
	}
	
	return time.Duration(delay)
}

// calculateBackoffDelay calculates exponential backoff delay for Google
func (h *GoogleHandler) calculateBackoffDelay(attempt int) time.Duration {
	delay := float64(h.config.InitialDelay) * math.Pow(h.config.BackoffFactor, float64(attempt-1))
	maxDelay := float64(h.config.MaxDelay)
	
	if delay > maxDelay {
		delay = maxDelay
	}
	
	return time.Duration(delay)
}

// isRetryableError checks if an error is retryable
func (h *OpenAIHandler) isRetryableError(err error) bool {
	errStr := err.Error()
	
	// Check against configured retryable errors
	for _, retryableErr := range h.config.RetryableErrors {
		if strings.Contains(errStr, retryableErr) {
			return true
		}
	}
	
	// Default retryable conditions
	return strings.Contains(errStr, "timeout") ||
		   strings.Contains(errStr, "connection") ||
		   strings.Contains(errStr, "429") ||
		   strings.Contains(errStr, "502") ||
		   strings.Contains(errStr, "503") ||
		   strings.Contains(errStr, "504")
}

// isRetryableError checks if an error is retryable for Google
func (h *GoogleHandler) isRetryableError(err error) bool {
	errStr := err.Error()
	
	for _, retryableErr := range h.config.RetryableErrors {
		if strings.Contains(errStr, retryableErr) {
			return true
		}
	}
	
	return strings.Contains(errStr, "timeout") ||
		   strings.Contains(errStr, "connection") ||
		   strings.Contains(errStr, "429") ||
		   strings.Contains(errStr, "502") ||
		   strings.Contains(errStr, "503") ||
		   strings.Contains(errStr, "504")
}

// ValidateRequest validates OpenAI request
func (h *OpenAIHandler) ValidateRequest(req AIRequest) error {
	if req.Model == "" {
		return fmt.Errorf("model is required")
	}
	if len(req.Messages) == 0 {
		return fmt.Errorf("messages are required")
	}
	
	limits := h.GetModelLimits(req.Model)
	if req.MaxTokens > limits.MaxTokens {
		return fmt.Errorf("max_tokens (%d) exceeds model limit (%d)", req.MaxTokens, limits.MaxTokens)
	}
	
	return nil
}

// ValidateRequest validates Google AI request
func (h *GoogleHandler) ValidateRequest(req AIRequest) error {
	if req.Model == "" {
		return fmt.Errorf("model is required")
	}
	if len(req.Messages) == 0 {
		return fmt.Errorf("messages are required")
	}
	
	return nil
}

// GetModelLimits returns OpenAI model limits
func (h *OpenAIHandler) GetModelLimits(model string) ModelLimits {
	switch model {
	case "gpt-4o":
		return ModelLimits{
			MaxTokens:      4096,
			MaxContextSize: 128000,
			CostPerToken:   0.000015,
			SupportsStream: true,
			SupportsImages: true,
			SupportsFiles:  true,
		}
	case "gpt-4o-mini":
		return ModelLimits{
			MaxTokens:      16384,
			MaxContextSize: 128000,
			CostPerToken:   0.000075,
			SupportsStream: true,
			SupportsImages: true,
			SupportsFiles:  false,
		}
	default:
		return ModelLimits{
			MaxTokens:      4096,
			MaxContextSize: 8192,
			CostPerToken:   0.00002,
			SupportsStream: true,
			SupportsImages: false,
			SupportsFiles:  false,
		}
	}
}

// GetModelLimits returns Google AI model limits
func (h *GoogleHandler) GetModelLimits(model string) ModelLimits {
	switch model {
	case "gemini-1.5-pro":
		return ModelLimits{
			MaxTokens:      8192,
			MaxContextSize: 2000000,
			CostPerToken:   0.000025,
			SupportsStream: true,
			SupportsImages: true,
			SupportsFiles:  true,
		}
	case "gemini-2.0-flash-exp":
		return ModelLimits{
			MaxTokens:      8192,
			MaxContextSize: 1000000,
			CostPerToken:   0.000001,
			SupportsStream: true,
			SupportsImages: true,
			SupportsFiles:  true,
		}
	default:
		return ModelLimits{
			MaxTokens:      2048,
			MaxContextSize: 32768,
			CostPerToken:   0.000005,
			SupportsStream: false,
			SupportsImages: false,
			SupportsFiles:  false,
		}
	}
}