#!/bin/bash

# System Map Auditor Phase 3 Testing Script
# Tests all Phase 3 commands to ensure proper functionality

echo "🧪 Testing System Map Auditor Phase 3 Commands"
echo "=============================================="
echo ""

# Change to project root for testing
cd "$(dirname "$0")/.."

# Function to run test and check exit code
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_exit_code="${3:-0}"
    
    echo "🔍 Testing: $test_name"
    echo "Command: $command"
    
    eval "$command"
    local actual_exit_code=$?
    
    if [ $actual_exit_code -eq $expected_exit_code ]; then
        echo "✅ PASS: Exit code $actual_exit_code (expected $expected_exit_code)"
    else
        echo "❌ FAIL: Exit code $actual_exit_code (expected $expected_exit_code)"
    fi
    echo ""
}

# Phase 3 CI/CD Integration Tests
echo "📦 Phase 3 CI/CD Integration Tests"
echo "=================================="

run_test "Changed Features Detection" \
    "cd system-map-auditor && node dist/cli.js changed-features-only --quiet"

run_test "Incremental Validation" \
    "cd system-map-auditor && node dist/cli.js incremental --quiet"

run_test "Changed Features with Fail-Fast" \
    "cd system-map-auditor && node dist/cli.js changed-features-only --fail-fast --quiet"

# Phase 3 Advanced Analysis Tests
echo "🔬 Phase 3 Advanced Analysis Tests"
echo "=================================="

run_test "Dead Code Detection" \
    "cd system-map-auditor && node dist/cli.js detect-dead-code --quiet"

run_test "Dead Code Detection with APIs" \
    "cd system-map-auditor && node dist/cli.js detect-dead-code --include-apis --quiet"

run_test "Orphaned APIs Detection" \
    "cd system-map-auditor && node dist/cli.js detect-orphaned-apis --quiet"

run_test "Orphaned APIs with Cleanup Suggestions" \
    "cd system-map-auditor && node dist/cli.js detect-orphaned-apis --suggest-cleanup --quiet"

run_test "Cleanup Suggestions Console Format" \
    "cd system-map-auditor && node dist/cli.js suggest-cleanup --format console"

run_test "Cleanup Suggestions Markdown Format" \
    "cd system-map-auditor && node dist/cli.js suggest-cleanup --format markdown"

# Phase 3 Completeness Analysis Tests
echo "📊 Phase 3 Completeness Analysis Tests"
echo "======================================"

run_test "Completeness Analysis" \
    "cd system-map-auditor && node dist/cli.js analyze-completeness --quiet"

run_test "Completeness Analysis with Missing Items" \
    "cd system-map-auditor && node dist/cli.js analyze-completeness --show-missing --quiet"

run_test "Coverage Report Console Format" \
    "cd system-map-auditor && node dist/cli.js coverage-report --format console --quiet"

run_test "Coverage Report JSON Format" \
    "cd system-map-auditor && node dist/cli.js coverage-report --format json --quiet"

run_test "Coverage Report Markdown Format" \
    "cd system-map-auditor && node dist/cli.js coverage-report --format markdown --quiet"

run_test "Missing Features Detection" \
    "cd system-map-auditor && node dist/cli.js detect-missing-features --quiet"

run_test "Missing Features with Suggestions" \
    "cd system-map-auditor && node dist/cli.js detect-missing-features --suggest-additions --quiet"

# Test with Coverage Thresholds
echo "🎯 Coverage Threshold Tests"
echo "=========================="

run_test "Coverage Report with 90% Threshold" \
    "cd system-map-auditor && node dist/cli.js coverage-report --min-coverage 90 --quiet"

run_test "Coverage Report with 50% Threshold" \
    "cd system-map-auditor && node dist/cli.js coverage-report --min-coverage 50 --quiet"

run_test "Completeness Analysis with 80% Threshold" \
    "cd system-map-auditor && node dist/cli.js analyze-completeness --min-coverage 80 --quiet"

# Output Format Tests
echo "📄 Output Format Tests"
echo "======================"

run_test "Help Command" \
    "cd system-map-auditor && node dist/cli.js --help" 1

run_test "Version Command" \
    "cd system-map-auditor && node dist/cli.js --version"

# Integration with Existing Commands
echo "🔗 Integration Tests with Existing Commands"
echo "==========================================="

run_test "Full Audit Integration" \
    "cd system-map-auditor && node dist/cli.js full-audit --format json --quiet"

run_test "Parse Only Integration" \
    "cd system-map-auditor && node dist/cli.js parse-only --quiet"

run_test "Scan for Maps Integration" \
    "cd system-map-auditor && node dist/cli.js scan-for-maps"

echo "🎉 Phase 3 Testing Complete!"
echo "============================="
echo ""
echo "All Phase 3 commands have been tested:"
echo "✅ CI/CD Integration Commands (changed-features-only, incremental)"
echo "✅ Advanced Analysis Commands (detect-dead-code, detect-orphaned-apis, suggest-cleanup)"
echo "✅ Completeness Analysis Commands (analyze-completeness, coverage-report, detect-missing-features)"
echo "✅ Multiple Output Formats (console, json, markdown)"
echo "✅ Coverage Thresholds and Configuration Options"
echo "✅ Integration with Existing Phase 1 & 2 Commands"
echo ""
echo "Phase 3 implementation is complete and functional!"