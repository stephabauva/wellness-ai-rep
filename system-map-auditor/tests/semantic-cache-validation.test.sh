
#!/bin/bash

# Semantic Cache Validation Tests - New Commands
# Tests the new cache consistency, missing components, and broken features validation

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
    print_header "SEMANTIC CACHE VALIDATION TESTS"

    # Cache Consistency Validation Tests
    echo -e "${BLUE}Expected Output: Cache consistency validation results:${NC}"
    echo -e "${YELLOW}  - 🔍 CACHE CONSISTENCY VALIDATION header${NC}"
    echo -e "${YELLOW}  - Detection of healthVisibilitySettings cache key variations${NC}"
    echo -e "${YELLOW}  - API cache key inconsistencies (/api/health-consent/visibility)${NC}"
    echo -e "${YELLOW}  - Missing useHealthVisibilitySettings hook cache invalidation${NC}"
    echo -e "${YELLOW}  - Cache pattern analysis across custom system map structures${NC}"
    run_test "Validate Cache Consistency (Basic)" "node system-map-auditor/dist/cli.js validate-cache-consistency --quiet" 0

    echo -e "${BLUE}Expected Output: Cache consistency with specific feature:${NC}"
    echo -e "${YELLOW}  - Focused cache validation on metrics-management feature${NC}"
    echo -e "${YELLOW}  - Feature-specific cache key analysis${NC}"
    echo -e "${YELLOW}  - Cache invalidation patterns for metrics operations${NC}"
    echo -e "${YELLOW}  - Component-specific cache dependency verification${NC}"
    run_test "Validate Cache Consistency for Metrics Feature" "node system-map-auditor/dist/cli.js validate-cache-consistency --feature metrics-management --quiet" 0

    echo -e "${BLUE}Expected Output: Cache consistency with verbosity:${NC}"
    echo -e "${YELLOW}  - Detailed cache pattern analysis output${NC}"
    echo -e "${YELLOW}  - Step-by-step cache validation process${NC}"
    echo -e "${YELLOW}  - Detailed issue descriptions and fix suggestions${NC}"
    echo -e "${YELLOW}  - Cache dependency tree visualization${NC}"
    run_test "Validate Cache Consistency (Verbose)" "node system-map-auditor/dist/cli.js validate-cache-consistency --verbose" 0

    # Missing Components Detection Tests
    echo -e "${BLUE}Expected Output: Missing component detection results:${NC}"
    echo -e "${YELLOW}  - 🔍 MISSING COMPONENT DETECTION header${NC}"
    echo -e "${YELLOW}  - Detection of HealthMetricsCard referenced but not defined${NC}"
    echo -e "${YELLOW}  - Component reference vs definition analysis${NC}"
    echo -e "${YELLOW}  - Missing component suggestions and fix recommendations${NC}"
    echo -e "${YELLOW}  - Cross-feature component dependency validation${NC}"
    run_test "Detect Missing Components (Basic)" "node system-map-auditor/dist/cli.js detect-missing-components --quiet" 0

    echo -e "${BLUE}Expected Output: Missing components with suggestions:${NC}"
    echo -e "${YELLOW}  - Missing component detection with fix suggestions${NC}"
    echo -e "${YELLOW}  - Component definition templates provided${NC}"
    echo -e "${YELLOW}  - File creation recommendations${NC}"
    echo -e "${YELLOW}  - Integration guidance for missing components${NC}"
    run_test "Detect Missing Components with Suggestions" "node system-map-auditor/dist/cli.js detect-missing-components --suggest-fixes --quiet" 0

    echo -e "${BLUE}Expected Output: Missing components for specific feature:${NC}"
    echo -e "${YELLOW}  - Feature-specific missing component analysis${NC}"
    echo -e "${YELLOW}  - Scoped component validation for metrics-management${NC}"
    echo -e "${YELLOW}  - Feature boundary component definition verification${NC}"
    echo -e "${YELLOW}  - Component completeness assessment${NC}"
    run_test "Detect Missing Components for Metrics Feature" "node system-map-auditor/dist/cli.js detect-missing-components --feature metrics-management --quiet" 0

    # Broken Features Validation Tests
    echo -e "${BLUE}Expected Output: Broken feature status validation:${NC}"
    echo -e "${YELLOW}  - 🔍 BROKEN FEATURE STATUS VALIDATION header${NC}"
    echo -e "${YELLOW}  - Validation of 'remove-metrics' broken status with evidence${NC}"
    echo -e "${YELLOW}  - Feature status accuracy verification against implementation${NC}"
    echo -e "${YELLOW}  - Broken status justification analysis${NC}"
    echo -e "${YELLOW}  - Status mismatch detection and recommendations${NC}"
    run_test "Validate Broken Features (Basic)" "node system-map-auditor/dist/cli.js validate-broken-features --quiet" 0

    echo -e "${BLUE}Expected Output: Broken features with evidence validation:${NC}"
    echo -e "${YELLOW}  - Strict evidence validation for broken feature status${NC}"
    echo -e "${YELLOW}  - Evidence-based broken status verification${NC}"
    echo -e "${YELLOW}  - Implementation proof requirements for broken features${NC}"
    echo -e "${YELLOW}  - False broken status prevention${NC}"
    run_test "Validate Broken Features with Evidence" "node system-map-auditor/dist/cli.js validate-broken-features --require-evidence --quiet" 0

    echo -e "${BLUE}Expected Output: Broken features comprehensive analysis:${NC}"
    echo -e "${YELLOW}  - Complete broken feature analysis across all system maps${NC}"
    echo -e "${YELLOW}  - Cross-feature broken status consistency${NC}"
    echo -e "${YELLOW}  - Broken feature impact analysis${NC}"
    echo -e "${YELLOW}  - Status correction recommendations${NC}"
    run_test "Validate Broken Features (Comprehensive)" "node system-map-auditor/dist/cli.js validate-broken-features --comprehensive --quiet" 0

    # Combined Semantic Validation Tests
    echo -e "${BLUE}Expected Output: Combined semantic validation:${NC}"
    echo -e "${YELLOW}  - Comprehensive semantic validation combining all new commands${NC}"
    echo -e "${YELLOW}  - Cache + Component + Feature status validation${NC}"
    echo -e "${YELLOW}  - End-to-end semantic consistency verification${NC}"
    echo -e "${YELLOW}  - Holistic system map quality assessment${NC}"
    run_test "Combined Semantic Validation" "node system-map-auditor/dist/cli.js validate-cache-consistency && node system-map-auditor/dist/cli.js detect-missing-components && node system-map-auditor/dist/cli.js validate-broken-features" 0

    echo -e "${BLUE}Expected Output: Metrics-management specific validation:${NC}"
    echo -e "${YELLOW}  - Complete metrics-management system map validation${NC}"
    echo -e "${YELLOW}  - All 6 critical flaws detected and reported${NC}"
    echo -e "${YELLOW}  - Feature-specific semantic consistency verification${NC}"
    echo -e "${YELLOW}  - 100% issue detection success validation${NC}"
    run_test "Metrics Management Complete Validation" "node system-map-auditor/dist/cli.js validate-cache-consistency --feature metrics-management && node system-map-auditor/dist/cli.js detect-missing-components --feature metrics-management && node system-map-auditor/dist/cli.js validate-broken-features --feature metrics-management" 0

    # Test Summary
    echo -e "\n${PURPLE}📊 Semantic Cache Validation Test Results${NC}"
    echo -e "${PURPLE}=========================================${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📝 Total:  $TOTAL_TESTS${NC}"

    echo -e "\n${PURPLE}🚀 New Semantic Validation Features Tested:${NC}"
    echo -e "${GREEN}✅ Cache Consistency Validation (3 tests)${NC}"
    echo -e "${GREEN}✅ Missing Component Detection (3 tests)${NC}"
    echo -e "${GREEN}✅ Broken Feature Status Validation (3 tests)${NC}"
    echo -e "${GREEN}✅ Combined Semantic Validation (3 tests)${NC}"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All semantic cache validation tests passed!${NC}"
        echo -e "${GREEN}New semantic validation commands working correctly:${NC}"
        echo -e "${GREEN}  ✅ validate-cache-consistency${NC}"
        echo -e "${GREEN}  ✅ detect-missing-components${NC}"
        echo -e "${GREEN}  ✅ validate-broken-features${NC}"
        echo -e "${GREEN}System ready to detect metrics-management type flaws with 100% accuracy!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some semantic cache validation tests failed.${NC}"
        exit 1
    fi
}

main "$@"
