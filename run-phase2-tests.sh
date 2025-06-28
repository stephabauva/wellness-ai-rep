#!/bin/bash

# Simple Phase 2 Test Runner - Direct execution of all Phase 2 commands
# Bypasses complex error handling to focus on functionality validation

set -e
cd system-map-auditor

echo "System Map Auditor Phase 2 - Complete Test Execution"
echo "====================================================="
echo

# Build first
echo "Building auditor..."
npm run build
echo "✅ Build complete"
echo

# Phase 2 Core Tests
echo "🔍 PHASE 2 CORE FUNCTIONALITY TESTS"
echo "======================================"

echo "1. Flow Validation:"
node dist/cli.js validate-flows
echo

echo "2. Cross-Reference Validation:"
node dist/cli.js validate-cross-refs  
echo

echo "3. Integration Point Validation:"
node dist/cli.js validate-integration-points
echo

echo "🔄 DEPENDENCY ANALYSIS TESTS"
echo "============================="

echo "4. Circular Dependency Detection:"
node dist/cli.js detect-circular
echo

echo "5. Dependency Depth Analysis:"
node dist/cli.js analyze-dependency-depth
echo

echo "6. Critical Path Analysis:"
node dist/cli.js analyze-critical-paths
echo

echo "⚡ PERFORMANCE ANALYSIS TESTS"
echo "============================"

echo "7. Performance Analysis:"
node dist/cli.js analyze-performance
echo

echo "📊 REPORTING TESTS"
echo "=================="

echo "8. Detailed Report Generation:"
node dist/cli.js generate-detailed-report
echo

echo "✅ All Phase 2 tests completed successfully!"
echo "System Map Auditor Phase 2 is fully operational."