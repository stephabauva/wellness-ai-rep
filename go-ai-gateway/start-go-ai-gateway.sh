#!/bin/bash

# AI Gateway Service Startup Script
# This script builds and starts the Go AI Gateway microservice

set -e

echo "[AI Gateway] Starting Go AI Gateway Service..."

# Change to the go-ai-gateway directory
cd "$(dirname "$0")"

# Set default environment variables if not provided
export AI_GATEWAY_PORT=${AI_GATEWAY_PORT:-8081}
export LOG_LEVEL=${LOG_LEVEL:-info}
export MAX_WORKERS=${MAX_WORKERS:-8}
export QUEUE_SIZE=${QUEUE_SIZE:-1000}
export CACHE_TTL_MINUTES=${CACHE_TTL_MINUTES:-30}
export BATCH_SIZE=${BATCH_SIZE:-10}
export BATCH_TIMEOUT_MS=${BATCH_TIMEOUT_MS:-1000}
export API_KEY=${API_KEY:-ai-gateway-dev-key}

# OpenAI Configuration
export OPENAI_API_KEY=${OPENAI_API_KEY:-}
export OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://api.openai.com}
export OPENAI_MAX_CONNS=${OPENAI_MAX_CONNS:-20}
export OPENAI_RPS=${OPENAI_RPS:-50}
export OPENAI_TIMEOUT_SEC=${OPENAI_TIMEOUT_SEC:-60}

# Google AI Configuration
export GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY:-}
export GOOGLE_BASE_URL=${GOOGLE_BASE_URL:-https://generativelanguage.googleapis.com}
export GOOGLE_MAX_CONNS=${GOOGLE_MAX_CONNS:-20}
export GOOGLE_RPS=${GOOGLE_RPS:-30}
export GOOGLE_TIMEOUT_SEC=${GOOGLE_TIMEOUT_SEC:-60}

# Retry Configuration
export MAX_RETRIES=${MAX_RETRIES:-3}
export INITIAL_DELAY_MS=${INITIAL_DELAY_MS:-1000}
export MAX_DELAY_MS=${MAX_DELAY_MS:-30000}

# Connection Configuration
export CONNECTION_TIMEOUT_SEC=${CONNECTION_TIMEOUT_SEC:-30}
export REQUEST_TIMEOUT_SEC=${REQUEST_TIMEOUT_SEC:-60}

echo "[AI Gateway] Configuration:"
echo "  Port: $AI_GATEWAY_PORT"
echo "  Log Level: $LOG_LEVEL"
echo "  Workers: $MAX_WORKERS"
echo "  Queue Size: $QUEUE_SIZE"
echo "  Cache TTL: $CACHE_TTL_MINUTES minutes"
echo "  Batch Size: $BATCH_SIZE"
echo "  OpenAI Enabled: $([ -n "$OPENAI_API_KEY" ] && echo "Yes" || echo "No")"
echo "  Google AI Enabled: $([ -n "$GOOGLE_AI_API_KEY" ] && echo "Yes" || echo "No")"

# Build the service
echo "[AI Gateway] Building Go service..."
if ! go build -o ai-gateway . 2>/dev/null; then
    echo "[AI Gateway] Build failed. Checking Go installation..."
    if ! command -v go &> /dev/null; then
        echo "[AI Gateway] Go is not installed. Please install Go 1.21 or later."
        exit 1
    fi
    echo "[AI Gateway] Retrying build with verbose output..."
    go build -v -o ai-gateway .
fi

echo "[AI Gateway] Build successful. Starting service..."

# Start the service
exec ./ai-gateway