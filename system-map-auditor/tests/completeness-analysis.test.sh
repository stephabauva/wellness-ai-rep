
#!/bin/bash

# Completeness Analysis Tests - Phase 3
# Tests dead code detection, coverage analysis, and cleanup suggestions

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
    print_header "COMPLETENESS ANALYSIS TESTS"

    # Dead Code Detection
    echo -e "${BLUE}Expected Output: Dead code detection results:${NC}"
    echo -e "${YELLOW}  - List of unused components not referenced in system maps or flows${NC}"
    echo -e "${YELLOW}  - Components found in codebase but not documented${NC}"
    echo -e "${YELLOW}  - Summary count of unused components${NC}"
    echo -e "${YELLOW}  - File paths of potentially dead code${NC}"
    run_test "Detect Dead Code" "node system-map-auditor/dist/cli.js detect-dead-code --quiet" 0
    
    echo -e "${BLUE}Expected Output: Dead code detection including APIs:${NC}"
    echo -e "${YELLOW}  - Detection of both unused components and orphaned API endpoints${NC}"
    echo -e "${YELLOW}  - Comprehensive analysis of unused code and endpoints${NC}"
    echo -e "${YELLOW}  - API endpoints not referenced in system maps${NC}"
    echo -e "${YELLOW}  - Combined cleanup recommendations${NC}"
    run_test "Detect Dead Code with APIs" "node system-map-auditor/dist/cli.js detect-dead-code --include-apis --quiet" 0
    
    echo -e "${BLUE}Expected Output: Orphaned API endpoints:${NC}"
    echo -e "${YELLOW}  - List of API endpoints not called by any components or flows${NC}"
    echo -e "${YELLOW}  - Endpoint paths and methods${NC}"
    echo -e "${YELLOW}  - Handler files without corresponding system map entries${NC}"
    echo -e "${YELLOW}  - Recommendations for documentation or removal${NC}"
    run_test "Detect Orphaned APIs" "node system-map-auditor/dist/cli.js detect-orphaned-apis --quiet" 0
    
    echo -e "${BLUE}Expected Output: Console cleanup recommendations:${NC}"
    echo -e "${YELLOW}  - Console-formatted cleanup recommendations with specific actions${NC}"
    echo -e "${YELLOW}  - Actionable cleanup steps${NC}"
    echo -e "${YELLOW}  - Priority-based cleanup suggestions${NC}"
    echo -e "${YELLOW}  - Impact assessment for each cleanup action${NC}"
    run_test "Suggest Cleanup (Console)" "node system-map-auditor/dist/cli.js suggest-cleanup --format console" 0
    
    echo -e "${BLUE}Expected Output: Markdown cleanup suggestions:${NC}"
    echo -e "${YELLOW}  - Markdown-formatted cleanup suggestions suitable for documentation${NC}"
    echo -e "${YELLOW}  - Structured format with headers and sections${NC}"
    echo -e "${YELLOW}  - Detailed explanations and rationale${NC}"
    echo -e "${YELLOW}  - Ready for inclusion in project documentation${NC}"
    run_test "Suggest Cleanup (Markdown)" "node system-map-auditor/dist/cli.js suggest-cleanup --format markdown" 0

    # Completeness Analysis
    echo -e "${BLUE}Expected Output: System map completeness analysis:${NC}"
    echo -e "${YELLOW}  - System map completeness percentage scores for each feature${NC}"
    echo -e "${YELLOW}  - Component coverage percentages${NC}"
    echo -e "${YELLOW}  - API endpoint coverage percentages${NC}"
    echo -e "${YELLOW}  - Overall documentation completeness score${NC}"
    run_test "Analyze Completeness" "node system-map-auditor/dist/cli.js analyze-completeness --quiet" 0
    
    echo -e "${BLUE}Expected Output: Completeness analysis with missing items:${NC}"
    echo -e "${YELLOW}  - Detailed list of missing components, APIs, and flows with specific gaps identified${NC}"
    echo -e "${YELLOW}  - Specific missing items by category${NC}"
    echo -e "${YELLOW}  - File paths and implementation details${NC}"
    echo -e "${YELLOW}  - Gap analysis with recommendations${NC}"
    run_test "Analyze Completeness with Missing Items" "node system-map-auditor/dist/cli.js analyze-completeness --show-missing --quiet" 0
    
    echo -e "${BLUE}Expected Output: Console coverage report:${NC}"
    echo -e "${YELLOW}  - Coverage percentage report in console format showing documented vs undocumented features${NC}"
    echo -e "${YELLOW}  - Color-coded coverage indicators${NC}"
    echo -e "${YELLOW}  - Feature-by-feature coverage breakdown${NC}"
    echo -e "${YELLOW}  - Summary statistics and recommendations${NC}"
    run_test "Coverage Report (Console)" "node system-map-auditor/dist/cli.js coverage-report --format console --quiet" 0
    
    echo -e "${BLUE}Expected Output: JSON coverage data:${NC}"
    echo -e "${YELLOW}  - Machine-readable JSON coverage data for CI/CD integration${NC}"
    echo -e "${YELLOW}  - Structured data suitable for automation${NC}"
    echo -e "${YELLOW}  - Metrics and statistics in JSON format${NC}"
    echo -e "${YELLOW}  - Integration-ready data format${NC}"
    run_test "Coverage Report (JSON)" "node system-map-auditor/dist/cli.js coverage-report --format json --quiet" 0
    
    echo -e "${BLUE}Expected Output: Markdown coverage report:${NC}"
    echo -e "${YELLOW}  - Human-readable markdown coverage report for documentation${NC}"
    echo -e "${YELLOW}  - Professional report format${NC}"
    echo -e "${YELLOW}  - Charts and visual elements${NC}"
    echo -e "${YELLOW}  - Ready for project documentation${NC}"
    run_test "Coverage Report (Markdown)" "node system-map-auditor/dist/cli.js coverage-report --format markdown --quiet" 0
    
    echo -e "${BLUE}Expected Output: Missing features detection:${NC}"
    echo -e "${YELLOW}  - Identification of implemented features not documented in system maps${NC}"
    echo -e "${YELLOW}  - Features detected in codebase but missing documentation${NC}"
    echo -e "${YELLOW}  - File pattern analysis for feature detection${NC}"
    echo -e "${YELLOW}  - Recommendations for documentation${NC}"
    run_test "Detect Missing Features" "node system-map-auditor/dist/cli.js detect-missing-features --quiet" 0
    
    echo -e "${BLUE}Expected Output: Missing features with suggestions:${NC}"
    echo -e "${YELLOW}  - Missing feature detection with suggested system map additions${NC}"
    echo -e "${YELLOW}  - Template suggestions for new system maps${NC}"
    echo -e "${YELLOW}  - Specific file creation recommendations${NC}"
    echo -e "${YELLOW}  - Documentation structure suggestions${NC}"
    run_test "Detect Missing Features with Suggestions" "node system-map-auditor/dist/cli.js detect-missing-features --suggest-additions --quiet" 0

    # Semantic Cache Validation in Completeness Context
    echo -e "${BLUE}Expected Output: Cache consistency completeness:${NC}"
    echo -e "${YELLOW}  - Cache pattern completeness across all system maps${NC}"
    echo -e "${YELLOW}  - Missing cache invalidation patterns identified${NC}"
    echo -e "${YELLOW}  - Component-cache relationship completeness${NC}"
    echo -e "${YELLOW}  - Cache key naming convention compliance${NC}"
    run_test "Validate Cache Consistency for Completeness" "node system-map-auditor/dist/cli.js validate-cache-consistency --quiet" 0

    # Test Summary
    echo -e "\n${PURPLE}📊 Completeness Analysis Test Results${NC}"
    echo -e "${PURPLE}====================================${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📝 Total:  $TOTAL_TESTS${NC}"

    echo -e "\n${PURPLE}🚀 Completeness Features Tested:${NC}"
    echo -e "${GREEN}✅ Dead Code Detection (5 tests)${NC}"
    echo -e "${GREEN}✅ Completeness Analysis (2 tests)${NC}"
    echo -e "${GREEN}✅ Coverage Reporting (3 tests)${NC}"
    echo -e "${GREEN}✅ Missing Feature Detection (2 tests)${NC}"
    echo -e "${GREEN}✅ Semantic Cache Validation (1 test)${NC}"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All completeness analysis tests passed!${NC}"
        echo -e "${GREEN}System map completeness and code quality validated successfully.${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some completeness analysis tests failed.${NC}"
        exit 1
    fi
}

main "$@"
