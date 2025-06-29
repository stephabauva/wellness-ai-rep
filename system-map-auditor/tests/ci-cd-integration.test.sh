
#!/bin/bash

# CI/CD Integration Tests - Phase 3
# Tests incremental validation, changed features detection, and CI/CD workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print colored headers
print_header() {
    echo -e "\n${PURPLE}$1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' $(seq 1 ${#1}))${NC}"
}

# Function to run test and check exit code
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_exit_code="${3:-0}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "\n${BLUE}🔍 Testing: $test_name${NC}"
    echo -e "${YELLOW}Command: $command${NC}"

    echo -e "\n${YELLOW}--- Command Output Start ---${NC}"
    if output=$(eval "$command" 2>&1); then
        actual_exit_code=0
        echo "$output"
    else
        actual_exit_code=$?
        echo "$output"
    fi
    echo -e "${YELLOW}--- Command Output End ---${NC}\n"

    if [ $actual_exit_code -eq $expected_exit_code ]; then
        echo -e "${GREEN}✅ PASS${NC}: Exit code $actual_exit_code (expected $expected_exit_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: Exit code $actual_exit_code (expected $expected_exit_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    echo -e "${PURPLE}$(printf '─%.0s' $(seq 1 80))${NC}"
}

main() {
    print_header "CI/CD INTEGRATION TESTS"

    # CI/CD Integration
    echo -e "${BLUE}Expected Output: Changed features detection:${NC}"
    echo -e "${YELLOW}  - Detection of changed features based on git diff${NC}"
    echo -e "${YELLOW}  - Validation of only modified components${NC}"
    echo -e "${YELLOW}  - List of changed system map files${NC}"
    echo -e "${YELLOW}  - Focused validation on changed features only${NC}"
    run_test "Changed Features Only" "node system-map-auditor/dist/cli.js changed-features-only --quiet" 0
    
    echo -e "${BLUE}Expected Output: Incremental validation with caching:${NC}"
    echo -e "${YELLOW}  - Fast validation using cached results${NC}"
    echo -e "${YELLOW}  - Cache hit/miss statistics${NC}"
    echo -e "${YELLOW}  - Performance improvements over full audit${NC}"
    echo -e "${YELLOW}  - Incremental processing status${NC}"
    run_test "Incremental Validation" "node system-map-auditor/dist/cli.js incremental --quiet" 0
    
    echo -e "${BLUE}Expected Output: Incremental validation with cache refresh:${NC}"
    echo -e "${YELLOW}  - Full re-validation with cache invalidation${NC}"
    echo -e "${YELLOW}  - Cache refresh status and performance metrics${NC}"
    echo -e "${YELLOW}  - Fresh analysis results${NC}"
    echo -e "${YELLOW}  - Improved accuracy over cached results${NC}"
    run_test "Incremental with Force Refresh" "node system-map-auditor/dist/cli.js incremental --force-refresh --quiet" 0

    # Configuration and Options Tests
    echo -e "${BLUE}Expected Output: Full audit with performance timing:${NC}"
    echo -e "${YELLOW}  - Full audit with performance timing metrics displayed${NC}"
    echo -e "${YELLOW}  - Execution time breakdown by phase${NC}"
    echo -e "${YELLOW}  - Performance bottleneck identification${NC}"
    echo -e "${YELLOW}  - Timing statistics for optimization${NC}"
    run_test "Full Audit with Timing" "node system-map-auditor/dist/cli.js full-audit --timing --quiet" 0
    
    echo -e "${BLUE}Expected Output: Full audit with progress indicators:${NC}"
    echo -e "${YELLOW}  - Full audit with progress indicators during validation phases${NC}"
    echo -e "${YELLOW}  - Real-time progress updates${NC}"
    echo -e "${YELLOW}  - Phase completion status${NC}"
    echo -e "${YELLOW}  - Visual progress bars or percentage indicators${NC}"
    run_test "Full Audit with Progress" "node system-map-auditor/dist/cli.js full-audit --show-progress --quiet" 0
    
    echo -e "${BLUE}Expected Output: Filtered component validation:${NC}"
    echo -e "${YELLOW}  - Component validation filtered to only chat-related components${NC}"
    echo -e "${YELLOW}  - Selective validation based on filter pattern${NC}"
    echo -e "${YELLOW}  - Reduced scope validation results${NC}"
    echo -e "${YELLOW}  - Pattern matching confirmation${NC}"
    run_test "Validate Components with Filter" "node system-map-auditor/dist/cli.js validate-components --filter '*chat*' --quiet" 0
    
    echo -e "${BLUE}Expected Output: Coverage report with custom threshold:${NC}"
    echo -e "${YELLOW}  - Coverage report with custom minimum threshold of 50%${NC}"
    echo -e "${YELLOW}  - Threshold compliance checking${NC}"
    echo -e "${YELLOW}  - Pass/fail status based on coverage level${NC}"
    echo -e "${YELLOW}  - Coverage percentage vs threshold comparison${NC}"
    run_test "Coverage with Custom Threshold" "node system-map-auditor/dist/cli.js coverage-report --min-coverage 50 --quiet" 0

    # Test Summary
    echo -e "\n${PURPLE}📊 CI/CD Integration Test Results${NC}"
    echo -e "${PURPLE}=================================${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📝 Total:  $TOTAL_TESTS${NC}"

    echo -e "\n${PURPLE}🚀 CI/CD Features Tested:${NC}"
    echo -e "${GREEN}✅ Changed Features Detection${NC}"
    echo -e "${GREEN}✅ Incremental Validation${NC}"
    echo -e "${GREEN}✅ Performance Timing${NC}"
    echo -e "${GREEN}✅ Progress Indicators${NC}"
    echo -e "${GREEN}✅ Filtered Validation${NC}"
    echo -e "${GREEN}✅ Custom Thresholds${NC}"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All CI/CD integration tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some CI/CD integration tests failed.${NC}"
        exit 1
    fi
}

main "$@"
