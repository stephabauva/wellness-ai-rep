
#!/bin/bash

# Advanced Validation Tests - Phase 2
# Tests flow validation, cross-references, and dependency analysis

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
    print_header "ADVANCED VALIDATION TESTS"

    # Flow Validation
    echo -e "${BLUE}Expected Output: User flow validation results:${NC}"
    echo -e "${YELLOW}  - 🔄 FLOW VALIDATION RESULTS header${NC}"
    echo -e "${YELLOW}  - ✓ Flow: send-message (Steps: 4, Valid: 4/4)${NC}"
    echo -e "${YELLOW}  - ✓ Flow: health-data-import (Steps: 6, Valid: 6/6)${NC}"
    echo -e "${YELLOW}  - Component capability matching verification${NC}"
    echo -e "${YELLOW}  - Flow consistency reports with step-by-step validation${NC}"
    run_test "Validate Flows" "node system-map-auditor/dist/cli.js validate-flows --quiet" 0

    echo -e "${BLUE}Expected Output: Cross-reference validation:${NC}"
    echo -e "${YELLOW}  - Shared component usage analysis${NC}"
    echo -e "${YELLOW}  - Cross-feature dependency verification${NC}"
    echo -e "${YELLOW}  - Reference consistency checks between system maps${NC}"
    echo -e "${YELLOW}  - Reports on components used across multiple features${NC}"
    run_test "Validate Cross References" "node system-map-auditor/dist/cli.js validate-cross-refs --quiet" 0

    echo -e "${BLUE}Expected Output: Integration point verification:${NC}"
    echo -e "${YELLOW}  - Integration points between features and components${NC}"
    echo -e "${YELLOW}  - External integration validation (APIs, services)${NC}"
    echo -e "${YELLOW}  - Connection verification reports${NC}"
    echo -e "${YELLOW}  - Status of each integration point (verified/failed)${NC}"
    run_test "Validate Integration Points" "node system-map-auditor/dist/cli.js validate-integration-points --quiet" 0

    # Dependency Analysis
    echo -e "${BLUE}Expected Output: Circular dependency detection:${NC}"
    echo -e "${YELLOW}  - 🔄 CIRCULAR DEPENDENCY ANALYSIS header${NC}"
    echo -e "${YELLOW}  - ✅ No circular dependencies detected! (if clean)${NC}"
    echo -e "${YELLOW}  - OR: Found X circular dependencies with detailed paths${NC}"
    echo -e "${YELLOW}  - Dependency visualization and fix suggestions${NC}"
    run_test "Detect Circular Dependencies" "node system-map-auditor/dist/cli.js detect-circular --quiet" 0

    echo -e "${BLUE}Expected Output: Dependency depth analysis:${NC}"
    echo -e "${YELLOW}  - Dependency chain depth reports for each component${NC}"
    echo -e "${YELLOW}  - Maximum depth levels identified${NC}"
    echo -e "${YELLOW}  - Components exceeding depth thresholds${NC}"
    echo -e "${YELLOW}  - Recommendations for depth reduction${NC}"
    run_test "Analyze Dependency Depth" "node system-map-auditor/dist/cli.js analyze-dependency-depth --quiet" 0

    echo -e "${BLUE}Expected Output: Performance impact analysis:${NC}"
    echo -e "${YELLOW}  - ⚡ PERFORMANCE ANALYSIS header${NC}"
    echo -e "${YELLOW}  - 📦 Bundle Size Metrics (Total, Unused, Efficiency %)${NC}"
    echo -e "${YELLOW}  - 🏋️ Largest Components with size breakdown${NC}"
    echo -e "${YELLOW}  - 🚀 Loading Performance metrics${NC}"
    echo -e "${YELLOW}  - 🧮 Complexity Analysis (cognitive, cyclomatic, technical debt)${NC}"
    run_test "Analyze Performance" "node system-map-auditor/dist/cli.js analyze-performance --quiet" 0

    echo -e "${BLUE}Expected Output: Critical dependency paths:${NC}"
    echo -e "${YELLOW}  - Critical paths that could affect system stability${NC}"
    echo -e "${YELLOW}  - Path length analysis with recommendations${NC}"
    echo -e "${YELLOW}  - Bottleneck identification in dependency chains${NC}"
    echo -e "${YELLOW}  - Risk assessment for each critical path${NC}"
    run_test "Analyze Critical Paths" "node system-map-auditor/dist/cli.js analyze-critical-paths --quiet" 0

    # Enhanced Reporting
    echo -e "${BLUE}Expected Output: Detailed markdown report:${NC}"
    echo -e "${YELLOW}  - Human-readable markdown format${NC}"
    echo -e "${YELLOW}  - System architecture summary with headers and sections${NC}"
    echo -e "${YELLOW}  - Feature breakdown with status indicators${NC}"
    echo -e "${YELLOW}  - Issue summaries with severity levels${NC}"
    echo -e "${YELLOW}  - Recommendations and next steps${NC}"
    run_test "Generate Detailed Report (Markdown)" "node system-map-auditor/dist/cli.js generate-detailed-report --format markdown --quiet" 0

    echo -e "${BLUE}Expected Output: Detailed JSON report:${NC}"
    echo -e "${YELLOW}  - Structured JSON suitable for automation${NC}"
    echo -e "${YELLOW}  - Complete audit data with nested objects${NC}"
    echo -e "${YELLOW}  - Performance metrics and statistics${NC}"
    echo -e "${YELLOW}  - Machine-readable format for CI/CD integration${NC}"
    run_test "Generate Detailed Report (JSON)" "node system-map-auditor/dist/cli.js generate-detailed-report --format json --quiet" 0

    # Feature-specific audits
    echo -e "${BLUE}Expected Output: Chat feature validation:${NC}"
    echo -e "${YELLOW}  - Focused validation of chat feature components, APIs, and flows only${NC}"
    echo -e "${YELLOW}  - ChatSection component verification${NC}"
    echo -e "${YELLOW}  - Chat API endpoints validation${NC}"
    echo -e "${YELLOW}  - Message flow consistency checks${NC}"
    run_test "Audit Specific Feature (chat)" "node system-map-auditor/dist/cli.js audit-feature chat --quiet" 0

    echo -e "${BLUE}Expected Output: Health feature validation:${NC}"
    echo -e "${YELLOW}  - Comprehensive validation of health feature including data operations and UI components${NC}"
    echo -e "${YELLOW}  - HealthDataSection component verification${NC}"
    echo -e "${YELLOW}  - Health API endpoints validation${NC}"
    echo -e "${YELLOW}  - Health data import flow validation${NC}"
    run_test "Audit Specific Feature (health)" "node system-map-auditor/dist/cli.js audit-feature health --quiet" 0

    echo -e "${BLUE}Expected Output: Graceful error for non-existent feature:${NC}"
    echo -e "${YELLOW}  - Proper error handling for non-existent feature with helpful suggestion${NC}"
    echo -e "${YELLOW}  - Clear error message indicating feature not found${NC}"
    echo -e "${YELLOW}  - List of available features for reference${NC}"
    run_test "Audit Non-existent Feature" "node system-map-auditor/dist/cli.js audit-feature nonexistent-feature --quiet" 1

    # Advanced Cache Validation
    echo -e "${BLUE}Expected Output: Advanced cache pattern analysis:${NC}"
    echo -e "${YELLOW}  - Deep cache pattern analysis across complex system maps${NC}"
    echo -e "${YELLOW}  - Cross-component cache dependency verification${NC}"
    echo -e "${YELLOW}  - Cache invalidation chain completeness${NC}"
    echo -e "${YELLOW}  - Advanced cache inconsistency detection${NC}"
    run_test "Advanced Cache Consistency Validation" "node system-map-auditor/dist/cli.js validate-cache-consistency --quiet" 0

    # Test Summary
    echo -e "\n${PURPLE}📊 Advanced Validation Test Results${NC}"
    echo -e "${PURPLE}=================================${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📝 Total:  $TOTAL_TESTS${NC}"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All advanced validation tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some advanced validation tests failed.${NC}"
        exit 1
    fi
}

main "$@"
