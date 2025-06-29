#!/bin/bash

# System Map Auditor - Complete Test Suite
# Tests all commands across all phases to ensure proper functionality

set -e  # Exit on any error

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
    local working_dir="${4:-.}"  # Default to root directory (current directory)

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "\n${BLUE}🔍 Testing: $test_name${NC}"
    echo -e "${YELLOW}Command: $command${NC}"
    echo -e "${PURPLE}Working Directory: $working_dir${NC}"

    # Change to working directory
    cd "$working_dir"

    # Run command and capture output (using the built CLI from system-map-auditor/dist)
    local full_command="node system-map-auditor/dist/$command"
    if [[ "$command" == node* ]]; then
        full_command="$command"  # Command already includes 'node'
    fi

    echo -e "\n${YELLOW}--- Command Output Start ---${NC}"
    if output=$(eval "$full_command" 2>&1); then
        actual_exit_code=0
        echo "$output"
    else
        actual_exit_code=$?
        echo "$output"
    fi
    echo -e "${YELLOW}--- Command Output End ---${NC}\n"

    # Check result
    if [ $actual_exit_code -eq $expected_exit_code ]; then
        echo -e "${GREEN}✅ PASS${NC}: Exit code $actual_exit_code (expected $expected_exit_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: Exit code $actual_exit_code (expected $expected_exit_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    # Add separator for readability
    echo -e "${PURPLE}$(printf '─%.0s' $(seq 1 80))${NC}"

    # Return to original directory
    cd - > /dev/null
}

# Function to build the auditor
build_auditor() {
    print_header "BUILDING SYSTEM MAP AUDITOR"

    echo -e "${YELLOW}Building TypeScript...${NC}"
    cd system-map-auditor

    if npm run build; then
        echo -e "${GREEN}✅ Build successful${NC}"
        cd ..
        return 0
    else
        echo -e "${RED}❌ Build failed${NC}"
        cd ..
        return 1
    fi
}

# Main test execution
main() {
    echo -e "${PURPLE}🧪 System Map Auditor - Complete Test Suite${NC}"
    echo -e "${PURPLE}============================================${NC}\n"

    # Build the auditor first
    if ! build_auditor; then
        echo -e "${RED}❌ Cannot proceed without successful build${NC}"
        exit 1
    fi

    print_header "PHASE 1: CORE INFRASTRUCTURE TESTS"

    # Basic CLI Commands
    run_test "Help Command" "node system-map-auditor/dist/cli.js --help" 0
    run_test "Version Command" "node system-map-auditor/dist/cli.js version" 0
    run_test "Show Configuration" "node system-map-auditor/dist/cli.js show-config" 0

    # Core Parsing and Scanning
    run_test "Parse Only" "node system-map-auditor/dist/cli.js parse-only --quiet" 0
    run_test "Scan for Maps" "node system-map-auditor/dist/cli.js scan-for-maps" 0

    # Basic Validation
    run_test "Validate Components" "node system-map-auditor/dist/cli.js validate-components --quiet" 0
    run_test "Validate APIs" "node system-map-auditor/dist/cli.js validate-apis --quiet" 0

    # Full Audit with Different Formats
    run_test "Full Audit (Console)" "node system-map-auditor/dist/cli.js full-audit --format console --quiet" 0
    run_test "Full Audit (JSON)" "node system-map-auditor/dist/cli.js full-audit --format json --quiet" 0

    print_header "PHASE 2: ADVANCED VALIDATION TESTS"

    # Flow Validation
    run_test "Validate Flows" "node system-map-auditor/dist/cli.js validate-flows --quiet" 0
    run_test "Validate Cross References" "node system-map-auditor/dist/cli.js validate-cross-refs --quiet" 0
    run_test "Validate Integration Points" "node system-map-auditor/dist/cli.js validate-integration-points --quiet" 0

    # Dependency Analysis
    run_test "Detect Circular Dependencies" "node system-map-auditor/dist/cli.js detect-circular --quiet" 0
    run_test "Analyze Dependency Depth" "node system-map-auditor/dist/cli.js analyze-dependency-depth --quiet" 0
    run_test "Analyze Performance" "node system-map-auditor/dist/cli.js analyze-performance --quiet" 0
    run_test "Analyze Critical Paths" "node system-map-auditor/dist/cli.js analyze-critical-paths --quiet" 0

    # Enhanced Reporting
    run_test "Generate Detailed Report (Markdown)" "node system-map-auditor/dist/cli.js generate-detailed-report --format markdown --quiet" 0
    run_test "Generate Detailed Report (JSON)" "node system-map-auditor/dist/cli.js generate-detailed-report --format json --quiet" 0

    print_header "PHASE 3: CI/CD INTEGRATION TESTS"

    # CI/CD Integration
    run_test "Changed Features Only" "node system-map-auditor/dist/cli.js changed-features-only --quiet" 0
    run_test "Incremental Validation" "node system-map-auditor/dist/cli.js incremental --quiet" 0
    run_test "Incremental with Force Refresh" "node system-map-auditor/dist/cli.js incremental --force-refresh --quiet" 0

    print_header "PHASE 3: ADVANCED ANALYSIS TESTS"

    # Dead Code Detection
    run_test "Detect Dead Code" "node system-map-auditor/dist/cli.js detect-dead-code --quiet" 0
    run_test "Detect Dead Code with APIs" "node system-map-auditor/dist/cli.js detect-dead-code --include-apis --quiet" 0
    run_test "Detect Orphaned APIs" "node system-map-auditor/dist/cli.js detect-orphaned-apis --quiet" 0
    run_test "Suggest Cleanup (Console)" "node system-map-auditor/dist/cli.js suggest-cleanup --format console" 0
    run_test "Suggest Cleanup (Markdown)" "node system-map-auditor/dist/cli.js suggest-cleanup --format markdown" 0

    print_header "PHASE 3: COMPLETENESS ANALYSIS TESTS"

    # Completeness Analysis
    run_test "Analyze Completeness" "node system-map-auditor/dist/cli.js analyze-completeness --quiet" 0
    run_test "Analyze Completeness with Missing Items" "node system-map-auditor/dist/cli.js analyze-completeness --show-missing --quiet" 0
    run_test "Coverage Report (Console)" "node system-map-auditor/dist/cli.js coverage-report --format console --quiet" 0
    run_test "Coverage Report (JSON)" "node system-map-auditor/dist/cli.js coverage-report --format json --quiet" 0
    run_test "Coverage Report (Markdown)" "node system-map-auditor/dist/cli.js coverage-report --format markdown --quiet" 0
    run_test "Detect Missing Features" "node system-map-auditor/dist/cli.js detect-missing-features --quiet" 0
    run_test "Detect Missing Features with Suggestions" "node system-map-auditor/dist/cli.js detect-missing-features --suggest-additions --quiet" 0

    print_header "FEATURE-SPECIFIC TESTS"

    # Feature-specific audits
    run_test "Audit Specific Feature (chat)" "node system-map-auditor/dist/cli.js audit-feature chat --quiet" 0
    run_test "Audit Specific Feature (health)" "node system-map-auditor/dist/cli.js audit-feature health --quiet" 0

    print_header "ENHANCED VALIDATION FEATURES TESTS (NEW IMPLEMENTATION)"

    # Component-to-API Call Tracing Tests
    run_test "Validate API Call Tracing" "node system-map-auditor/dist/cli.js validate-api-call-tracing --quiet" 0
    run_test "Validate API Call Tracing for Specific Component" "node system-map-auditor/dist/cli.js validate-api-call-tracing --component ChatSection --quiet" 0
    run_test "Validate API Call Tracing with Cache Check" "node system-map-auditor/dist/cli.js validate-api-call-tracing --check-cache-invalidation --quiet" 0
    run_test "Validate API Call Tracing with Error Handling" "node system-map-auditor/dist/cli.js validate-api-call-tracing --check-error-handling --quiet" 0

    # Cache Invalidation Chain Validation Tests
    run_test "Validate Cache Dependencies" "node system-map-auditor/dist/cli.js validate-cache-dependencies --quiet" 0
    run_test "Validate Cache Dependencies with Timing" "node system-map-auditor/dist/cli.js validate-cache-dependencies --check-timing --quiet" 0
    run_test "Validate Cache Invalidation Chains" "node system-map-auditor/dist/cli.js validate-cache-invalidation-chains --quiet" 0
    run_test "Validate Cache Invalidation Chains with Completeness" "node system-map-auditor/dist/cli.js validate-cache-invalidation-chains --check-completeness --quiet" 0
    run_test "Validate Query Key Consistency" "node system-map-auditor/dist/cli.js validate-query-key-consistency --quiet" 0
    run_test "Validate Query Key Consistency with Orphan Check" "node system-map-auditor/dist/cli.js validate-query-key-consistency --check-orphans --quiet" 0

    # UI Refresh Dependency Validation Tests
    run_test "Validate UI Refresh Chains" "node system-map-auditor/dist/cli.js validate-ui-refresh-chains --quiet" 0
    run_test "Validate UI Refresh Chains with Loading States" "node system-map-auditor/dist/cli.js validate-ui-refresh-chains --check-loading-states --quiet" 0
    run_test "Validate UI Refresh Chains with Error States" "node system-map-auditor/dist/cli.js validate-ui-refresh-chains --check-error-states --quiet" 0
    run_test "Validate Component Data Sync" "node system-map-auditor/dist/cli.js validate-component-data-sync --quiet" 0
    run_test "Validate Component Data Sync with Dependency Graph" "node system-map-auditor/dist/cli.js validate-component-data-sync --build-dependency-graph --quiet" 0
    run_test "Validate UI Consistency" "node system-map-auditor/dist/cli.js validate-ui-consistency --quiet" 0
    run_test "Validate UI Consistency with Optimistic Updates" "node system-map-auditor/dist/cli.js validate-ui-consistency --check-optimistic-updates --quiet" 0

    # Integration Evidence Requirements Tests
    run_test "Validate Integration Evidence" "node system-map-auditor/dist/cli.js validate-integration-evidence --quiet" 0
    run_test "Validate Integration Evidence for Specific Feature" "node system-map-auditor/dist/cli.js validate-integration-evidence --feature chat --quiet" 0
    run_test "Validate Integration Evidence with Freshness Check" "node system-map-auditor/dist/cli.js validate-integration-evidence --check-freshness --quiet" 0
    run_test "Validate Integration Evidence with End-to-End Requirement" "node system-map-auditor/dist/cli.js validate-integration-evidence --require-end-to-end --quiet" 0
    run_test "Validate Feature Integration Status" "node system-map-auditor/dist/cli.js validate-feature-integration-status --quiet" 0
    run_test "Validate Feature Integration Status for Health Feature" "node system-map-auditor/dist/cli.js validate-feature-integration-status --feature health --quiet" 0
    run_test "Validate Feature Integration Status with Report Generation" "node system-map-auditor/dist/cli.js validate-feature-integration-status --generate-status-report --quiet" 0

    # Combined Enhanced Validation Tests
    run_test "Validate Complete Integration (All Enhanced Features)" "node system-map-auditor/dist/cli.js validate-complete-integration --quiet" 0
    run_test "Prevent False Active Status" "node system-map-auditor/dist/cli.js prevent-false-active-status --quiet" 0
    run_test "Validate Hook Consistency" "node system-map-auditor/dist/cli.js validate-hook-consistency --quiet" 0

    print_header "CONFIGURATION AND OPTIONS TESTS"

    # Test with different configurations
    run_test "Full Audit with Timing" "node system-map-auditor/dist/cli.js full-audit --timing --quiet" 0
    run_test "Full Audit with Progress" "node system-map-auditor/dist/cli.js full-audit --show-progress --quiet" 0
    run_test "Validate Components with Filter" "node system-map-auditor/dist/cli.js validate-components --filter '*chat*' --quiet" 0
    run_test "Coverage with Custom Threshold" "node system-map-auditor/dist/cli.js coverage-report --min-coverage 50 --quiet" 0

    print_header "ERROR HANDLING TESTS"

    # Test error scenarios (these should fail gracefully)
    run_test "Invalid Command" "node system-map-auditor/dist/cli.js invalid-command --quiet" 1
    run_test "Audit Non-existent Feature" "node system-map-auditor/dist/cli.js audit-feature nonexistent-feature --quiet" 1

    print_header "TEST SUMMARY"

    echo -e "\n${PURPLE}📊 Test Results Summary${NC}"
    echo -e "${PURPLE}======================${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📝 Total:  $TOTAL_TESTS${NC}"

    echo -e "\n${PURPLE}🚀 Enhanced Features Tested:${NC}"
    echo -e "${GREEN}✅ Component-to-API Call Tracing (4 tests)${NC}"
    echo -e "${GREEN}✅ Cache Invalidation Chain Validation (6 tests)${NC}"
    echo -e "${GREEN}✅ UI Refresh Dependency Validation (7 tests)${NC}"
    echo -e "${GREEN}✅ Integration Evidence Requirements (7 tests)${NC}"
    echo -e "${GREEN}✅ Combined Enhanced Validation (3 tests)${NC}"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}"
        echo -e "${GREEN}System Map Auditor is fully functional with all enhanced features.${NC}"
        echo -e "${GREEN}Critical gaps from the implementation plan have been addressed:${NC}"
        echo -e "${GREEN}  ✅ Component-to-API Call Tracing${NC}"
        echo -e "${GREEN}  ✅ Cache Invalidation Chain Validation${NC}"
        echo -e "${GREEN}  ✅ UI Refresh Dependency Validation${NC}"
        echo -e "${GREEN}  ✅ Integration Evidence Requirements${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed.${NC}"
        echo -e "${YELLOW}Please review the failed tests above for details.${NC}"
        exit 1
    fi
}

# Run the main function
main "$@"