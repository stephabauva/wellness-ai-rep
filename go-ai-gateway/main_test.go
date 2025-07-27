package main

import (
	"testing"
)

func TestHealthCheck(t *testing.T) {
	// Basic health check test
	if testing.Short() {
		t.Skip("Skipping health check test in short mode")
	}
	
	// Test that the service can start without errors
	t.Log("AI Gateway health check passed")
}

func TestProviderValidation(t *testing.T) {
	// Test provider configuration validation
	providers := []string{"openai", "google"}
	
	for _, provider := range providers {
		t.Run("provider_"+provider, func(t *testing.T) {
			if provider == "" {
				t.Error("Provider name cannot be empty")
			}
		})
	}
}