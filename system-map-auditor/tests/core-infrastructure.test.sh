
#!/bin/bash

# Core Infrastructure Tests - Phase 1
# Tests basic CLI functionality, configuration, and parsing

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
    print_header "CORE INFRASTRUCTURE TESTS"

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

    # Error Handling Tests
    echo -e "${BLUE}Expected Output: Graceful error handling:${NC}"
    echo -e "${YELLOW}  - Clear error message for invalid command${NC}"
    echo -e "${YELLOW}  - Helpful suggestion for correct usage${NC}"
    echo -e "${YELLOW}  - Non-zero exit code indicating failure${NC}"
    run_test "Invalid Command" "node system-map-auditor/dist/cli.js invalid-command --quiet" 1

    # Test Summary
    echo -e "\n${PURPLE}📊 Core Infrastructure Test Results${NC}"
    echo -e "${PURPLE}=================================${NC}"
    echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
    echo -e "${BLUE}📝 Total:  $TOTAL_TESTS${NC}"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All core infrastructure tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some core infrastructure tests failed.${NC}"
        exit 1
    fi
}

main "$@"
