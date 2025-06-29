
#!/bin/bash

# Enhanced Integration Tests - Phase 3
# Tests new cache validation, UI refresh validation, and integration evidence features

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
    print_header "ENHANCED INTEGRATION TESTS"

    # Component-to-API Call Tracing Tests
    echo -e "${BLUE}Expected Output: Component-to-API call tracing validation:${NC}"
    echo -e "${YELLOW}  - 🔍 API CALL TRACING VALIDATION header${NC}"
    echo -e "${YELLOW}  - Component analysis: ChatSection, HealthDataSection, etc.${NC}"
    echo -e "${YELLOW}  - ✅ fetch() calls documented and verified${NC}"
    echo -e "${YELLOW}  - ✅ queryKey consistency validated${NC}"
    echo -e "${YELLOW}  - ❌ Missing API call mappings (if any)${NC}"
    echo -e "${YELLOW}  - Component-to-endpoint relationship verification${NC}"
    run_test "Validate API Call Tracing" "node system-map-auditor/dist/cli.js validate-api-call-tracing --quiet" 0

    echo -e "${BLUE}Expected Output: ChatSection specific API call validation:${NC}"
    echo -e "${YELLOW}  - 🎯 Focused validation on ChatSection component${NC}"
    echo -e "${YELLOW}  - API calls: POST /api/chat, GET /api/conversations${NC}"
    echo -e "${YELLOW}  - Hook usage: useChatMessages, useChatActions${NC}"
    echo -e "${YELLOW}  - Query key validation for chat-related endpoints${NC}"
    run_test "Validate API Call Tracing for Specific Component" "node system-map-auditor/dist/cli.js validate-api-call-tracing --component ChatSection --quiet" 0

    echo -e "${BLUE}Expected Output: API call tracing with cache invalidation:${NC}"
    echo -e "${YELLOW}  - 🔄 Cache invalidation verification after API operations${NC}"
    echo -e "${YELLOW}  - Query invalidation patterns documented${NC}"
    echo -e "${YELLOW}  - Cache refresh chains validated${NC}"
    echo -e "${YELLOW}  - Missing invalidations flagged as issues${NC}"
    run_test "Validate API Call Tracing with Cache Check" "node system-map-auditor/dist/cli.js validate-api-call-tracing --check-cache-invalidation --quiet" 0

    echo -e "${BLUE}Expected Output: API call tracing with error handling:${NC}"
    echo -e "${YELLOW}  - 🚨 Error handling pattern validation${NC}"
    echo -e "${YELLOW}  - Try-catch blocks and error states verified${NC}"
    echo -e "${YELLOW}  - Error UI component refresh validation${NC}"
    echo -e "${YELLOW}  - Failed request handling documented${NC}"
    run_test "Validate API Call Tracing with Error Handling" "node system-map-auditor/dist/cli.js validate-api-call-tracing --check-error-handling --quiet" 0

    # Cache Invalidation Chain Validation Tests
    echo -e "${BLUE}Expected Output: Cache dependencies validation:${NC}"
    echo -e "${YELLOW}  - 🔄 CACHE DEPENDENCY VALIDATION header${NC}"
    echo -e "${YELLOW}  - Complete cache dependency mapping${NC}"
    echo -e "${YELLOW}  - Invalidation chain verification from mutation to UI${NC}"
    echo -e "${YELLOW}  - Query key relationships documented${NC}"
    echo -e "${YELLOW}  - Missing dependencies flagged${NC}"
    run_test "Validate Cache Dependencies" "node system-map-auditor/dist/cli.js validate-cache-dependencies --quiet" 0

    echo -e "${BLUE}Expected Output: Cache dependencies with timing analysis:${NC}"
    echo -e "${YELLOW}  - ⏱️ Timing analysis for cache invalidation performance${NC}"
    echo -e "${YELLOW}  - Callback timing verification${NC}"
    echo -e "${YELLOW}  - Performance impact assessment${NC}"
    echo -e "${YELLOW}  - Optimization suggestions for slow invalidations${NC}"
    run_test "Validate Cache Dependencies with Timing" "node system-map-auditor/dist/cli.js validate-cache-dependencies --check-timing --quiet" 0

    echo -e "${BLUE}Expected Output: Cache invalidation chains end-to-end:${NC}"
    echo -e "${YELLOW}  - 🔗 End-to-end invalidation chain validation${NC}"
    echo -e "${YELLOW}  - Mutation → Cache → UI refresh flow verified${NC}"
    echo -e "${YELLOW}  - Complete chain integrity checks${NC}"
    echo -e "${YELLOW}  - Broken chains identified and reported${NC}"
    run_test "Validate Cache Invalidation Chains" "node system-map-auditor/dist/cli.js validate-cache-invalidation-chains --quiet" 0

    echo -e "${BLUE}Expected Output: Complete invalidation chain verification:${NC}"
    echo -e "${YELLOW}  - ✅ Completeness check ensuring no missing links${NC}"
    echo -e "${YELLOW}  - All expected invalidations present${NC}"
    echo -e "${YELLOW}  - Gap analysis for incomplete chains${NC}"
    echo -e "${YELLOW}  - Recommendations for missing invalidations${NC}"
    run_test "Validate Cache Invalidation Chains with Completeness" "node system-map-auditor/dist/cli.js validate-cache-invalidation-chains --check-completeness --quiet" 0

    echo -e "${BLUE}Expected Output: Query key consistency validation:${NC}"
    echo -e "${YELLOW}  - 🔑 Query key naming consistency across codebase${NC}"
    echo -e "${YELLOW}  - Hook and component query key synchronization${NC}"
    echo -e "${YELLOW}  - Naming convention compliance${NC}"
    echo -e "${YELLOW}  - Inconsistent keys flagged for correction${NC}"
    run_test "Validate Query Key Consistency" "node system-map-auditor/dist/cli.js validate-query-key-consistency --quiet" 0

    echo -e "${BLUE}Expected Output: Query key consistency with orphan detection:${NC}"
    echo -e "${YELLOW}  - 🔍 Orphaned invalidation detection${NC}"
    echo -e "${YELLOW}  - Unused query keys identified${NC}"
    echo -e "${YELLOW}  - Cleanup suggestions for orphaned keys${NC}"
    echo -e "${YELLOW}  - References to non-existent queries flagged${NC}"
    run_test "Validate Query Key Consistency with Orphan Check" "node system-map-auditor/dist/cli.js validate-query-key-consistency --check-orphans --quiet" 0

    # UI Refresh Dependency Validation Tests
    echo -e "${BLUE}Expected Output: UI refresh chains validation:${NC}"
    echo -e "${YELLOW}  - 🔄 UI REFRESH CHAIN VALIDATION header${NC}"
    echo -e "${YELLOW}  - Component refresh after successful API operations${NC}"
    echo -e "${YELLOW}  - UI dependency mapping verified${NC}"
    echo -e "${YELLOW}  - Missing refresh dependencies identified${NC}"
    run_test "Validate UI Refresh Chains" "node system-map-auditor/dist/cli.js validate-ui-refresh-chains --quiet" 0

    echo -e "${BLUE}Expected Output: UI refresh with loading states:${NC}"
    echo -e "${YELLOW}  - 🔄 Loading state pattern verification${NC}"
    echo -e "${YELLOW}  - Loading indicators properly connected${NC}"
    echo -e "${YELLOW}  - State management during async operations${NC}"
    echo -e "${YELLOW}  - Missing loading states flagged${NC}"
    run_test "Validate UI Refresh Chains with Loading States" "node system-map-auditor/dist/cli.js validate-ui-refresh-chains --check-loading-states --quiet" 0

    echo -e "${BLUE}Expected Output: UI refresh with error states:${NC}"
    echo -e "${YELLOW}  - 🚨 Error state pattern verification${NC}"
    echo -e "${YELLOW}  - Error UI components properly connected${NC}"
    echo -e "${YELLOW}  - Error handling and display validation${NC}"
    echo -e "${YELLOW}  - Missing error states flagged${NC}"
    run_test "Validate UI Refresh Chains with Error States" "node system-map-auditor/dist/cli.js validate-ui-refresh-chains --check-error-states --quiet" 0

    echo -e "${BLUE}Expected Output: Component data synchronization:${NC}"
    echo -e "${YELLOW}  - 🔄 Cross-component data synchronization validation${NC}"
    echo -e "${YELLOW}  - Shared state consistency checks${NC}"
    echo -e "${YELLOW}  - Data flow between related components${NC}"
    echo -e "${YELLOW}  - Synchronization gaps identified${NC}"
    run_test "Validate Component Data Sync" "node system-map-auditor/dist/cli.js validate-component-data-sync --quiet" 0

    echo -e "${BLUE}Expected Output: Component data sync with dependency graph:${NC}"
    echo -e "${YELLOW}  - 📊 Dependency graph visualization${NC}"
    echo -e "${YELLOW}  - Data flow mapping between components${NC}"
    echo -e "${YELLOW}  - Visual representation of dependencies${NC}"
    echo -e "${YELLOW}  - Graph analysis for optimization opportunities${NC}"
    run_test "Validate Component Data Sync with Dependency Graph" "node system-map-auditor/dist/cli.js validate-component-data-sync --build-dependency-graph --quiet" 0

    echo -e "${BLUE}Expected Output: UI consistency validation:${NC}"
    echo -e "${YELLOW}  - ✅ Overall UI consistency across related components${NC}"
    echo -e "${YELLOW}  - Data consistency after changes validated${NC}"
    echo -e "${YELLOW}  - UI state synchronization verified${NC}"
    echo -e "${YELLOW}  - Inconsistencies flagged for resolution${NC}"
    run_test "Validate UI Consistency" "node system-map-auditor/dist/cli.js validate-ui-consistency --quiet" 0

    echo -e "${BLUE}Expected Output: UI consistency with optimistic updates:${NC}"
    echo -e "${YELLOW}  - ⚡ Optimistic update pattern verification${NC}"
    echo -e "${YELLOW}  - Immediate UI updates before server confirmation${NC}"
    echo -e "${YELLOW}  - Rollback mechanisms validated${NC}"
    echo -e "${YELLOW}  - Optimistic patterns properly implemented${NC}"
    run_test "Validate UI Consistency with Optimistic Updates" "node system-map-auditor/dist/cli.js validate-ui-consistency --check-optimistic-updates --quiet" 0

    # Integration Evidence Requirements Tests
    echo -e "${BLUE}Expected Output: Integration evidence validation:${NC}"
    echo -e "${YELLOW}  - 📋 INTEGRATION EVIDENCE VALIDATION header${NC}"
    echo -e "${YELLOW}  - Features marked 'active' have proper evidence${NC}"
    echo -e "${YELLOW}  - Integration testing proof verified${NC}"
    echo -e "${YELLOW}  - End-to-end functionality confirmed${NC}"
    echo -e "${YELLOW}  - False 'active' status prevented${NC}"
    run_test "Validate Integration Evidence" "node system-map-auditor/dist/cli.js validate-integration-evidence --quiet" 0

    echo -e "${BLUE}Expected Output: Chat feature integration evidence:${NC}"
    echo -e "${YELLOW}  - 🎯 Chat feature specific evidence validation${NC}"
    echo -e "${YELLOW}  - Message sending/receiving functionality verified${NC}"
    echo -e "${YELLOW}  - API integration working end-to-end${NC}"
    echo -e "${YELLOW}  - UI components properly integrated${NC}"
    run_test "Validate Integration Evidence for Specific Feature" "node system-map-auditor/dist/cli.js validate-integration-evidence --feature chat --quiet" 0

    echo -e "${BLUE}Expected Output: Integration evidence with freshness check:${NC}"
    echo -e "${YELLOW}  - 📅 Evidence timestamp freshness verification${NC}"
    echo -e "${YELLOW}  - Recent integration testing within 30 days${NC}"
    echo -e "${YELLOW}  - Stale evidence flagged for update${NC}"
    echo -e "${YELLOW}  - Freshness requirements enforced${NC}"
    run_test "Validate Integration Evidence with Freshness Check" "node system-map-auditor/dist/cli.js validate-integration-evidence --check-freshness --quiet" 0

    echo -e "${BLUE}Expected Output: Strict end-to-end test evidence:${NC}"
    echo -e "${YELLOW}  - 🧪 End-to-end test evidence required${NC}"
    echo -e "${YELLOW}  - Complete user journey testing verified${NC}"
    echo -e "${YELLOW}  - Integration test proof mandatory${NC}"
    echo -e "${YELLOW}  - Missing E2E tests flagged as failures${NC}"
    run_test "Validate Integration Evidence with End-to-End Requirement" "node system-map-auditor/dist/cli.js validate-integration-evidence --require-end-to-end --quiet" 0

    echo -e "${BLUE}Expected Output: Feature integration status validation:${NC}"
    echo -e "${YELLOW}  - 📊 Feature status validation preventing false active markings${NC}"
    echo -e "${YELLOW}  - Status accuracy verified against actual implementation${NC}"
    echo -e "${YELLOW}  - 'Active' status requires complete functionality${NC}"
    echo -e "${YELLOW}  - Mismatched statuses corrected${NC}"
    run_test "Validate Feature Integration Status" "node system-map-auditor/dist/cli.js validate-feature-integration-status --quiet" 0

    echo -e "${BLUE}Expected Output: Health feature integration status:${NC}"
    echo -e "${YELLOW}  - 🏥 Health feature specific status validation${NC}"
    echo -e "${YELLOW}  - Health data operations verified${NC}"
    echo -e "${YELLOW}  - Integration with health services confirmed${NC}"
    echo -e "${YELLOW}  - Feature completeness assessed${NC}"
    run_test "Validate Feature Integration Status for Health Feature" "node system-map-auditor/dist/cli.js validate-feature-integration-status --feature health --quiet" 0

    echo -e "${BLUE}Expected Output: Integration status with detailed reporting:${NC}"
    echo -e "${YELLOW}  - 📊 Detailed status report generation${NC}"
    echo -e "${YELLOW}  - Comprehensive integration analysis${NC}"
    echo -e "${YELLOW}  - Feature-by-feature status breakdown${NC}"
    echo -e "${YELLOW}  - Actionable recommendations provided${NC}"
    run_test "Validate Feature Integration Status with Report Generation" "node system-map-auditor/dist/cli.js validate-feature-integration-status --generate-status-report --quiet" 0

    # Combined Enhanced Validation Tests
    echo -e "${BLUE}Expected Output: Comprehensive validation combining all enhanced features:${NC}"
    echo -e "${YELLOW}  - Complete validation pipeline covering all enhanced features${NC}"
    echo -e "${YELLOW}  - API call tracing + Cache validation + UI refresh + Integration evidence${NC}"
    echo -e "${YELLOW}  - Prevents 'Add Metrics' type issues through comprehensive checks${NC}"
    echo -e "${YELLOW}  - End-to-end integration verification${NC}"
    run_test "Validate Complete Integration (All Enhanced Features)" "node system-map-auditor/dist/cli.js validate-complete-integration --quiet" 0

    echo -e "${BLUE}Expected Output: Prevention of false active status:${NC}"
    echo -e "${YELLOW}  - Prevention of features being marked 'active' without proper functionality proof${NC}"
    echo -e "${YELLOW}  - Comprehensive status verification across all features${NC}"
    echo -e "${YELLOW}  - Evidence requirements enforced for active status${NC}"
    echo -e "${YELLOW}  - False positives eliminated through rigorous checks${NC}"
    run_test "Prevent False Active Status" "node system-map-auditor/dist/cli.js prevent-false-active-status --quiet" 0

    echo -e "${BLUE}Expected Output: React Query hook consistency validation:${NC}"
    echo -e "${YELLOW}  - React Query hook consistency validation across components${NC}"
    echo -e "${YELLOW}  - Hook usage pattern verification${NC}"
    echo -e "${YELLOW}  - Query key standardization checks${NC}"
    echo -e "${YELLOW}  - Hook dependency consistency validation${NC}"
    run_test "Validate Hook Consistency" "node system-map-auditor/dist/cli.js validate-hook-consistency --quiet" 0

    # Test Summary
    echo -e "\n${PURPLE}📊 Enhanced Integration Test Results${NC}"
    echo -e "${PURPLE}====================================${NC}"
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
        echo -e "\n${GREEN}🎉 All enhanced integration tests passed!${NC}"
        echo -e "${GREEN}Critical gaps from the implementation plan have been addressed:${NC}"
        echo -e "${GREEN}  ✅ Component-to-API Call Tracing${NC}"
        echo -e "${GREEN}  ✅ Cache Invalidation Chain Validation${NC}"
        echo -e "${GREEN}  ✅ UI Refresh Dependency Validation${NC}"
        echo -e "${GREEN}  ✅ Integration Evidence Requirements${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some enhanced integration tests failed.${NC}"
        exit 1
    fi
}

main "$@"
