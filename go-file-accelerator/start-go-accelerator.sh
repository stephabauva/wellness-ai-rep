#!/bin/bash

# Go File Accelerator Service Startup Script
# This script starts the Go-based file acceleration service on port 5001

echo "Starting Go File Accelerator Service..."
echo "Service will run on port 5001"
echo "Endpoints:"
echo "  GET  /accelerate/health"
echo "  POST /accelerate/compress-large"
echo "  POST /accelerate/batch-process"
echo ""

cd "$(dirname "$0")"

# Check if Go is available
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed or not in PATH"
    exit 1
fi

# Initialize Go modules if needed
if [ ! -f "go.sum" ]; then
    echo "Initializing Go modules..."
    go mod tidy
fi

# Build and run the service
echo "Building and starting the accelerator service..."
go run main.go