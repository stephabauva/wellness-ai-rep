#!/bin/bash

# Start Go Memory Service
# This script starts the high-performance Go memory service for Tier 3 optimizations

set -e

echo "Starting Go Memory Service..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed. Please install Go to run the memory service."
    exit 1
fi

# Set environment variables if not already set
export GO_MEMORY_SERVICE_PORT=${GO_MEMORY_SERVICE_PORT:-3001}
export GO_MEMORY_SERVICE_ENABLED=${GO_MEMORY_SERVICE_ENABLED:-true}

# Change to the go-memory-service directory
cd "$(dirname "$0")"

echo "Building Go Memory Service..."
go build -o memory-service .

if [ $? -ne 0 ]; then
    echo "Error: Failed to build Go Memory Service"
    exit 1
fi

echo "Go Memory Service built successfully"
echo "Starting service on port $GO_MEMORY_SERVICE_PORT..."

# Start the service
./memory-service