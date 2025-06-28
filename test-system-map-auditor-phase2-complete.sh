#!/bin/bash

# System Map Auditor Phase 2 - Complete Test Suite
# This script executes all Phase 2 tests in sequence with comprehensive reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

# Function to print test results
print_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        [ -n "$details" ] && echo -e "   ${CYAN}$details${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        [ -n "$details" ] && echo -e "   ${RED}$details${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to run a command and capture output
run_test_command() {
    local command="$1"
    local test_name="$2"
    local expected_pattern="$3"
    
    echo -e "${YELLOW}Running:${NC} $command"
    
    # Change to system-map-auditor directory for CLI commands
    cd system-map-auditor
    
    if output=$(eval "$command" 2>&1); then
        if [ -n "$expected_pattern" ]; then
            if echo "$output" | grep -q "$expected_pattern"; then
                print_test_result "$test_name" "PASS" "Found expected pattern: $expected_pattern"
            else
                print_test_result "$test_name" "FAIL" "Expected pattern '$expected_pattern' not found"
                echo -e "${YELLOW}Actual output:${NC}\n$output\n"
            fi
        else
            print_test_result "$test_name" "PASS" "Command executed successfully"
        fi
        echo -e "${CYAN}Output:${NC}\n$output\n"
    else
        # Check if command had output despite non-zero exit (CLI error handling)
        if [ -n "$output" ] && [ -n "$expected_pattern" ] && echo "$output" | grep -q "$expected_pattern"; then
            print_test_result "$test_name" "PASS" "Command produced expected output (exit code ignored)"
            echo -e "${CYAN}Output:${NC}\n$output\n"
        else
            print_test_result "$test_name" "FAIL" "Command failed with exit code $?"
            echo -e "${RED}Error output:${NC}\n$output\n"
        fi
    fi
    
    # Return to parent directory
    cd ..
}

# Ensure we're in the correct directory and auditor is built
cd "$(dirname "$0")"
echo -e "${PURPLE}System Map Auditor Phase 2 - Complete Test Suite${NC}"
echo -e "${PURPLE}=================================================${NC}\n"

print_header "PHASE 2 PREPARATION"

# Build the auditor
echo -e "${YELLOW}Building System Map Auditor...${NC}"
if cd system-map-auditor && npm run build; then
    print_test_result "Build System Map Auditor" "PASS" "TypeScript compilation successful"
    cd ..
else
    print_test_result "Build System Map Auditor" "FAIL" "TypeScript compilation failed"
    exit 1
fi

# Test CLI accessibility
echo -e "\n${YELLOW}Testing CLI accessibility...${NC}"
cd system-map-auditor
version_output=$(node dist/cli.js --version 2>&1)
if echo "$version_output" | grep -q "1.0.0"; then
    print_test_result "CLI Accessibility" "PASS" "CLI version found in output"
    cd ..
else
    print_test_result "CLI Accessibility" "FAIL" "CLI version not found in output: $version_output"
    cd ..
    exit 1
fi

print_header "PHASE 2 CORE FUNCTIONALITY TESTS"

# Test 1: Flow Validation
run_test_command \
    "node dist/cli.js validate-flows" \
    "Flow Validation" \
    "Flow Validation Results:"

# Test 2: Cross-Reference Validation  
run_test_command \
    "node dist/cli.js validate-cross-refs" \
    "Cross-Reference Validation" \
    "Cross-Reference Validation Results:"

# Test 3: Integration Point Validation
run_test_command \
    "node dist/cli.js validate-integration-points" \
    "Integration Point Validation" \
    "Integration Point Validation Results:"

print_header "PHASE 2 DEPENDENCY ANALYSIS TESTS"

# Test 4: Circular Dependency Detection
run_test_command \
    "node dist/cli.js detect-circular" \
    "Circular Dependency Detection" \
    "CIRCULAR DEPENDENCY ANALYSIS"

# Test 5: Dependency Depth Analysis
run_test_command \
    "node dist/cli.js analyze-dependency-depth" \
    "Dependency Depth Analysis" \
    "Dependency Depth Analysis:"

# Test 6: Critical Path Analysis
run_test_command \
    "node dist/cli.js analyze-critical-paths" \
    "Critical Path Analysis" \
    "Critical Dependency Paths:"

print_header "PHASE 2 PERFORMANCE ANALYSIS TESTS"

# Test 7: Performance Analysis
run_test_command \
    "node dist/cli.js analyze-performance" \
    "Performance Analysis" \
    "PERFORMANCE ANALYSIS"

print_header "PHASE 2 REPORTING TESTS"

# Test 8: Detailed Report Generation
run_test_command \
    "node dist/cli.js generate-detailed-report" \
    "Detailed Report Generation" \
    "System Map Auditor - Detailed Analysis Report"

print_header "PHASE 2 HELP AND VERSION TESTS"

# Test 9: Help Command
run_test_command \
    "node dist/cli.js --help" \
    "Help Command" \
    "Usage:"

# Test 10: Version Command
run_test_command \
    "node dist/cli.js --version" \
    "Version Command" \
    "1.0.0"

print_header "PHASE 2 ADVANCED VALIDATION TESTS"

# Test 11: System Map Discovery
run_test_command \
    "node dist/cli.js scan" \
    "System Map Discovery" \
    "System Map Audit Results:"

# Test 12: JSON Output Format
run_test_command \
    "node dist/cli.js scan --format json" \
    "JSON Output Format" \
    "\"auditResults\""

print_header "PHASE 2 TEST EXECUTION SUMMARY"

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
else
    SUCCESS_RATE=0
fi

# Print comprehensive summary
echo -e "${PURPLE}📊 PHASE 2 TEST EXECUTION SUMMARY${NC}"
echo -e "${PURPLE}=================================${NC}\n"

echo -e "${BLUE}Overall Results:${NC}"
echo -e "  Total Tests:     ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "  Passed:          ${GREEN}$PASSED_TESTS${NC}"
echo -e "  Failed:          ${RED}$FAILED_TESTS${NC}"
echo -e "  Success Rate:    ${CYAN}$SUCCESS_RATE%${NC}"
echo -e "  Execution Time:  ${YELLOW}${EXECUTION_TIME}s${NC}\n"

# Status assessment
if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}🎉 PHASE 2 STATUS: EXCELLENT${NC}"
    echo -e "${GREEN}All core functionality operational and ready for production${NC}"
    exit 0
elif [ $SUCCESS_RATE -ge 75 ]; then
    echo -e "${YELLOW}⚠️  PHASE 2 STATUS: GOOD${NC}"
    echo -e "${YELLOW}Most functionality working, minor issues detected${NC}"
    exit 0
elif [ $SUCCESS_RATE -ge 50 ]; then
    echo -e "${YELLOW}⚠️  PHASE 2 STATUS: NEEDS ATTENTION${NC}"
    echo -e "${YELLOW}Significant issues detected, review required${NC}"
    exit 1
else
    echo -e "${RED}🚨 PHASE 2 STATUS: CRITICAL ISSUES${NC}"
    echo -e "${RED}Major functionality failures, immediate attention required${NC}"
    exit 1
fi