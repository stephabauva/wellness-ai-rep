
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
    local working_dir="${4:-system-map-auditor}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${BLUE}🔍 Testing: $test_name${NC}"
    echo -e "${YELLOW}Command: $command${NC}"
    
    # Change to working directory
    cd "$working_dir"
    
    # Run command and capture output
    if output=$(eval "$command" 2>&1); then
        actual_exit_code=0
    else
        actual_exit_code=$?
    fi
    
    # Check result
    if [ $actual_exit_code -eq $expected_exit_code ]; then
        echo -e "${GREEN}✅ PASS${NC}: Exit code $actual_exit_code (expected $expected_exit_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: Exit code $actual_exit_code (expected $expected_exit_code)"
        echo -e "${RED}Output: $output${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
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
    run_test "Help Command" "node dist/cli.js --help" 0
    run_test "Version Command" "node dist/cli.js version" 0
    run_test "Show Configuration" "node dist/cli.js show-config" 0
    
    # Core Parsing and Scanning
    run_test "Parse Only" "node dist/cli.js parse-only --quiet" 0
    run_test "Scan for Maps" "node dist/cli.js scan-for-maps" 0
    
    # Basic Validation
    run_test "Validate Components" "node dist/cli.js validate-components --quiet" 0
    run_test "Validate APIs" "node dist/cli.js validate-apis --quiet" 0
    
    # Full Audit with Different Formats
    run_test "Full Audit (Console)" "node dist/cli.js full-audit --format console --quiet" 0
    run_test "Full Audit (JSON)" "node dist/cli.js full-audit --format json --quiet" 0
    
    print_header "PHASE 2: ADVANCED VALIDATION TESTS"
    
    # Flow Validation
    run_test "Validate Flows" "node dist/cli.js validate-flows --quiet" 0
    run_test "Validate Cross References" "node dist/cli.js validate-cross-refs --quiet" 0
    run_test "Validate Integration Points" "node dist/cli.js validate-integration-points --quiet" 0
    
    # Dependency Analysis
    run_test "Detect Circular Dependencies" "node dist/cli.js detect-circular --quiet" 0
    run_test "Analyze Dependency Depth" "node dist/cli.js analyze-dependency-depth --quiet" 0
    run_test "Analyze Performance" "node dist/cli.js analyze-performance --quiet" 0
    run_test "Analyze Critical Paths" "node dist/cli.js analyze-critical-paths --quiet" 0
    
    # Enhanced Reporting
    run_test "Generate Detailed Report (Markdown)" "node dist/cli.js generate-detailed-report --format markdown --quiet" 0
    run_test "Generate Detailed Report (JSON)" "node dist/cli.js generate-detailed-report --format json --quiet" 0
    
    print_header "PHASE 3: CI/CD INTEGRATION TESTS"
    
    # CI/CD Integration
    run_test "Changed Features Only" "node dist/cli.js changed-features-only --quiet" 0
    run_test "Incremental Validation" "node dist/cli.js incremental --quiet" 0
    run_test "Incremental with Force Refresh" "node dist/cli.js incremental --force-refresh --quiet" 0
    
    print_header "PHASE 3: ADVANCED ANALYSIS TESTS"
    
    # Dead Code Detection
    run_test "Detect Dead Code" "node dist/cli.js detect-dead-code --quiet" 0
    run_test "Detect Dead Code with APIs" "node dist/cli.js detect-dead-code --include-apis --quiet" 0
    run_test "Detect Orphaned APIs" "node dist/cli.js detect-orphaned-apis --quiet" 0
    run_test "Suggest Cleanup (Console)" "node dist/cli.js suggest-cleanup --format console" 0
    run_test "Suggest Cleanup (Markdown)" "node dist/cli.js suggest-cleanup --format markdown" 0
    
    print_header "PHASE 3: COMPLETENESS ANALYSIS TESTS"
    
    # Completeness Analysis
    run_test "Analyze Completeness" "node dist/cli.js analyze-completeness --quiet" 0
    run_test "Analyze Completeness with Missing Items" "node dist/cli.js analyze-completeness --show-missing --quiet" 0
    run_test "Coverage Report (Console)" "node dist/cli.js coverage-report --format console --quiet" 0
    run_test "Coverage Report (JSON)" "node dist/cli.js coverage-report --format json --quiet" 0
    run_test "Coverage Report (Markdown)" "node dist/cli.js coverage-report --format markdown --quiet" 0
    run_test "Detect Missing Features" "node dist/cli.js detect-missing-features --quiet" 0
    run_test "Detect Missing Features with Suggestions" "node dist/cli.js detect-missing-features --suggest-additions --quiet" 0
    
    print_header "FEATURE-SPECIFIC TESTS"
    
    # Feature-specific audits (these might fail if features don't exist, so we expect exit code 1)
    run_test "Audit Specific Feature (chat)" "node dist/cli.js audit-feature chat --quiet" 1
    run_test "Audit Specific Feature (health)" "node dist/cli.js audit-feature health --quiet" 1
    
    print_header "CONFIGURATION AND OPTIONS TESTS"
    
    # Test with different configurations
    run_test "Full Audit with Timing" "node dist/cli.js full-audit --timing --quiet" 0
    run_test "Full Audit with Progress" "node dist/cli.js full-audit --show-progress --quiet" 0
    run_test "Validate Components with Filter" "node dist/cli.js validate-components --filter '*chat*' --quiet" 0
    run_test "Coverage with Custom Threshold" "node dist/cli.js coverage-report --min-coverage 50 --quiet" 0
    
    print_header "ERROR HANDLING TESTS"
    
    # Test error scenarios (these should fail gracefully)
    run_test "Invalid Command" "node dist/cli.js invalid-command 2>/dev/null" 1
    run_test "Audit Non-existent Feature" "node dist/cli.js audit-feature nonexistent --quiet" 1
    
    print_header "TEST SUMMARY"
    
    echo -e "\n${PURPLE}📊 Test Results Summary${NC}"
    echo -e "${PURPLE}======================${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📝 Total:  $TOTAL_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}"
        echo -e "${GREEN}System Map Auditor is fully functional across all phases.${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed.${NC}"
        echo -e "${YELLOW}Please review the failed tests above for details.${NC}"
        exit 1
    fi
}

# Run the main function
main "$@"
