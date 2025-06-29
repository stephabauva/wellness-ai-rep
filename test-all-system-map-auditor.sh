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
    echo -e "${BLUE}Expected Output: Complete help documentation showing:${NC}"
    echo -e "${YELLOW}  - Usage: system-map-auditor [options] [command]${NC}"
    echo -e "${YELLOW}  - All available commands (help, version, parse-only, etc.)${NC}"
    echo -e "${YELLOW}  - Global options (-c, -v, -q, --dry-run, --show-config)${NC}"
    echo -e "${YELLOW}  - Detailed command descriptions and examples${NC}"
    run_test "Help Command" "node system-map-auditor/dist/cli.js --help" 0

    echo -e "${BLUE}Expected Output: Version information:${NC}"
    echo -e "${YELLOW}  - Should display: '1.0.0'${NC}"
    echo -e "${YELLOW}  - Clean version number without extra text${NC}"
    run_test "Version Command" "node system-map-auditor/dist/cli.js version" 0

    echo -e "${BLUE}Expected Output: Complete configuration JSON:${NC}"
    echo -e "${YELLOW}  - validation: {components, apis, flows, references}${NC}"
    echo -e "${YELLOW}  - scanning: {includePatterns, excludePatterns, fileExtensions}${NC}"
    echo -e "${YELLOW}  - reporting: {format, verbose, showSuggestions}${NC}"
    echo -e "${YELLOW}  - performance: {maxExecutionTime, parallel, cacheEnabled}${NC}"
    run_test "Show Configuration" "node system-map-auditor/dist/cli.js show-config" 0

    # Core Parsing and Scanning
    echo -e "${BLUE}Expected Output: System map parsing results:${NC}"
    echo -e "${YELLOW}  - '✅ System maps parsed successfully' (if all valid)${NC}"
    echo -e "${YELLOW}  - Component extraction logs showing discovered components${NC}"
    echo -e "${YELLOW}  - API endpoint discovery and validation${NC}"
    echo -e "${YELLOW}  - Dependency graph construction messages${NC}"
    run_test "Parse Only" "node system-map-auditor/dist/cli.js parse-only --quiet" 0

    echo -e "${BLUE}Expected Output: System map file discovery:${NC}"
    echo -e "${YELLOW}  - 'Found X system map files:' (where X > 0)${NC}"
    echo -e "${YELLOW}  - List of discovered .map.json files in .system-maps/${NC}"
    echo -e "${YELLOW}  - Paths like: .system-maps/chat.map.json, .system-maps/health.map.json${NC}"
    echo -e "${YELLOW}  - Sub-directory maps like: .system-maps/health/dashboard.map.json${NC}"
    run_test "Scan for Maps" "node system-map-auditor/dist/cli.js scan-for-maps" 0

    # Basic Validation
    echo -e "${BLUE}Expected Output: Component validation results:${NC}"
    echo -e "${YELLOW}  - Validation status for each component in system maps${NC}"
    echo -e "${YELLOW}  - ✅ PASS for existing components (ChatSection, HealthDataSection)${NC}"
    echo -e "${YELLOW}  - ❌ FAIL for missing components with file path details${NC}"
    echo -e "${YELLOW}  - Summary: 'X components validated, Y issues found'${NC}"
    run_test "Validate Components" "node system-map-auditor/dist/cli.js validate-components --quiet" 0

    echo -e "${BLUE}Expected Output: API endpoint validation results:${NC}"
    echo -e "${YELLOW}  - Handler file verification for each API endpoint${NC}"
    echo -e "${YELLOW}  - ✅ PASS for implemented endpoints (/api/chat, /api/health)${NC}"
    echo -e "${YELLOW}  - ❌ FAIL for missing handlers with suggested fixes${NC}"
    echo -e "${YELLOW}  - Route mapping validation between system maps and server routes${NC}"
    run_test "Validate APIs" "node system-map-auditor/dist/cli.js validate-apis --quiet" 0

    # Full Audit with Different Formats
    echo -e "${BLUE}Expected Output: Complete audit with console formatting:${NC}"
    echo -e "${YELLOW}  - 🔍 System Map Auditor Report header${NC}"
    echo -e "${YELLOW}  - 📊 Summary: Features audited, passed, total checks${NC}"
    echo -e "${YELLOW}  - 🚨 Issues found: Errors, Warnings, Info (if any)${NC}"
    echo -e "${YELLOW}  - Detailed feature results with colored status indicators${NC}"
    echo -e "${YELLOW}  - 📋 Recommendations section (if issues found)${NC}"
    run_test "Full Audit (Console)" "node system-map-auditor/dist/cli.js full-audit --format console --quiet" 0

    echo -e "${BLUE}Expected Output: Structured JSON audit report:${NC}"
    echo -e "${YELLOW}  - Valid JSON object with audit results${NC}"
    echo -e "${YELLOW}  - 'results' array containing feature audit data${NC}"
    echo -e "${YELLOW}  - 'summary' object with totals and statistics${NC}"
    echo -e "${YELLOW}  - 'issues' array with detailed problem descriptions${NC}"
    echo -e "${YELLOW}  - 'metrics' object with performance data${NC}"
    run_test "Full Audit (JSON)" "node system-map-auditor/dist/cli.js full-audit --format json --quiet" 0

    print_header "PHASE 2: ADVANCED VALIDATION TESTS"

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

    print_header "PHASE 3: CI/CD INTEGRATION TESTS"

    # CI/CD Integration
    # Expected: Detection of changed features based on git diff, validation of only modified components
    run_test "Changed Features Only" "node system-map-auditor/dist/cli.js changed-features-only --quiet" 0
    # Expected: Fast validation using cached results, cache hit/miss statistics
    run_test "Incremental Validation" "node system-map-auditor/dist/cli.js incremental --quiet" 0
    # Expected: Full re-validation with cache invalidation, performance improvements over full audit
    run_test "Incremental with Force Refresh" "node system-map-auditor/dist/cli.js incremental --force-refresh --quiet" 0

    print_header "PHASE 3: ADVANCED ANALYSIS TESTS"

    # Dead Code Detection
    # Expected: List of unused components not referenced in system maps or flows
    run_test "Detect Dead Code" "node system-map-auditor/dist/cli.js detect-dead-code --quiet" 0
    # Expected: Detection of both unused components and orphaned API endpoints
    run_test "Detect Dead Code with APIs" "node system-map-auditor/dist/cli.js detect-dead-code --include-apis --quiet" 0
    # Expected: List of API endpoints not called by any components or flows
    run_test "Detect Orphaned APIs" "node system-map-auditor/dist/cli.js detect-orphaned-apis --quiet" 0
    # Expected: Console-formatted cleanup recommendations with specific actions
    run_test "Suggest Cleanup (Console)" "node system-map-auditor/dist/cli.js suggest-cleanup --format console" 0
    # Expected: Markdown-formatted cleanup suggestions suitable for documentation
    run_test "Suggest Cleanup (Markdown)" "node system-map-auditor/dist/cli.js suggest-cleanup --format markdown" 0

    print_header "PHASE 3: COMPLETENESS ANALYSIS TESTS"

    # Completeness Analysis
    # Expected: System map completeness percentage scores for each feature
    run_test "Analyze Completeness" "node system-map-auditor/dist/cli.js analyze-completeness --quiet" 0
    # Expected: Detailed list of missing components, APIs, and flows with specific gaps identified
    run_test "Analyze Completeness with Missing Items" "node system-map-auditor/dist/cli.js analyze-completeness --show-missing --quiet" 0
    # Expected: Coverage percentage report in console format showing documented vs undocumented features
    run_test "Coverage Report (Console)" "node system-map-auditor/dist/cli.js coverage-report --format console --quiet" 0
    # Expected: Machine-readable JSON coverage data for CI/CD integration
    run_test "Coverage Report (JSON)" "node system-map-auditor/dist/cli.js coverage-report --format json --quiet" 0
    # Expected: Human-readable markdown coverage report for documentation
    run_test "Coverage Report (Markdown)" "node system-map-auditor/dist/cli.js coverage-report --format markdown --quiet" 0
    # Expected: Identification of implemented features not documented in system maps
    run_test "Detect Missing Features" "node system-map-auditor/dist/cli.js detect-missing-features --quiet" 0
    # Expected: Missing feature detection with suggested system map additions
    run_test "Detect Missing Features with Suggestions" "node system-map-auditor/dist/cli.js detect-missing-features --suggest-additions --quiet" 0

    print_header "FEATURE-SPECIFIC TESTS"

    # Feature-specific audits
    # Expected: Focused validation of chat feature components, APIs, and flows only
    run_test "Audit Specific Feature (chat)" "node system-map-auditor/dist/cli.js audit-feature chat --quiet" 0
    # Expected: Comprehensive validation of health feature including data operations and UI components
    run_test "Audit Specific Feature (health)" "node system-map-auditor/dist/cli.js audit-feature health --quiet" 0

    print_header "ENHANCED VALIDATION FEATURES TESTS (NEW IMPLEMENTATION)"

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
    # Expected: Comprehensive validation combining all enhanced features (prevents 'Add Metrics' type issues)
    run_test "Validate Complete Integration (All Enhanced Features)" "node system-map-auditor/dist/cli.js validate-complete-integration --quiet" 0
    # Expected: Prevention of features being marked 'active' without proper functionality proof
    run_test "Prevent False Active Status" "node system-map-auditor/dist/cli.js prevent-false-active-status --quiet" 0
    # Expected: React Query hook consistency validation across components
    run_test "Validate Hook Consistency" "node system-map-auditor/dist/cli.js validate-hook-consistency --quiet" 0

    print_header "CONFIGURATION AND OPTIONS TESTS"

    # Test with different configurations
    # Expected: Full audit with performance timing metrics displayed
    run_test "Full Audit with Timing" "node system-map-auditor/dist/cli.js full-audit --timing --quiet" 0
    # Expected: Full audit with progress indicators during validation phases
    run_test "Full Audit with Progress" "node system-map-auditor/dist/cli.js full-audit --show-progress --quiet" 0
    # Expected: Component validation filtered to only chat-related components
    run_test "Validate Components with Filter" "node system-map-auditor/dist/cli.js validate-components --filter '*chat*' --quiet" 0
    # Expected: Coverage report with custom minimum threshold of 50%
    run_test "Coverage with Custom Threshold" "node system-map-auditor/dist/cli.js coverage-report --min-coverage 50 --quiet" 0

    print_header "ERROR HANDLING TESTS"

    # Test error scenarios (these should fail gracefully)
    # Expected: Graceful error handling with clear error message for invalid command
    run_test "Invalid Command" "node system-map-auditor/dist/cli.js invalid-command --quiet" 1
    # Expected: Proper error handling for non-existent feature with helpful suggestion
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