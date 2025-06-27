#!/bin/bash

# System Map Auditor - Phase 1 Automated Test Suite
# Tests all functionality from changelog/system-map-auditor/manual-testing-guide.md Phase 1

set -e  # Exit on any error

echo "🧪 System Map Auditor - Phase 1 Automated Test Suite"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result tracking
declare -a TEST_RESULTS=()

# Function to run a test and capture results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_behavior="$3"
    local expected_keywords="$4"  # Optional: keywords to check in output
    local failure_keywords="$5"  # Optional: keywords that indicate failure

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo -e "${BLUE}🧪 Test $TOTAL_TESTS: $test_name${NC}"
    echo "Command: $test_command"
    echo "Expected: $expected_behavior"
    echo "----------------------------------------"

    # Run the command with timeout and capture output
    local test_passed=false
    local exit_code=0

    # Use timeout command to prevent hanging
    if timeout 10s bash -c "$test_command" > /tmp/test_output_$TOTAL_TESTS.txt 2>&1; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Handle timeout case
    if [ $exit_code -eq 124 ]; then
        echo -e "${YELLOW}⚠️  TIMEOUT${NC}: Command timed out after 10 seconds"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $test_name (TIMEOUT)")
        echo "Output preview:"
        head -10 /tmp/test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
        echo "Full output saved to: /tmp/test_output_$TOTAL_TESTS.txt"
        return
    fi

    # Check for explicit failure keywords first
    if [ -n "$failure_keywords" ]; then
        IFS=',' read -ra FAIL_KEYWORDS <<< "$failure_keywords"
        for keyword in "${FAIL_KEYWORDS[@]}"; do
            if grep -qi "$keyword" /tmp/test_output_$TOTAL_TESTS.txt; then
                echo -e "${RED}❌ FAIL${NC}: Failure keyword detected: $keyword"
                FAILED_TESTS=$((FAILED_TESTS + 1))
                TEST_RESULTS+=("❌ $test_name (Error: $keyword)")
                echo "Output preview:"
                head -10 /tmp/test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
                echo "Exit code: $exit_code"
                echo "Full output saved to: /tmp/test_output_$TOTAL_TESTS.txt"
                return
            fi
        done
    fi

    # Check output content for expected keywords if provided
    if [ -n "$expected_keywords" ]; then
        local keywords_found=true
        IFS=',' read -ra KEYWORDS <<< "$expected_keywords"
        for keyword in "${KEYWORDS[@]}"; do
            if ! grep -qi "$keyword" /tmp/test_output_$TOTAL_TESTS.txt; then
                keywords_found=false
                echo "Missing keyword: $keyword"
                break
            fi
        done

        if [ "$keywords_found" = true ] && [ $exit_code -eq 0 ]; then
            test_passed=true
        fi
    else
        # For tests without specific keyword requirements, only pass if exit code is 0
        if [ $exit_code -eq 0 ]; then
            test_passed=true
        fi
    fi

    if [ "$test_passed" = true ]; then
        echo -e "${GREEN}✅ PASS${NC}: Expected output found"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("✅ $test_name")

        # Show first few lines of output
        echo "Output preview:"
        head -5 /tmp/test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
    else
        echo -e "${RED}❌ FAIL${NC}: Test failed (exit code: $exit_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $test_name")

        # Show error output
        echo "Output preview:"
        head -10 /tmp/test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
    fi

    echo "Exit code: $exit_code"
    echo "Full output saved to: /tmp/test_output_$TOTAL_TESTS.txt"
}

# Function to check if system-map-auditor is built
check_build() {
    if [ ! -f "system-map-auditor/dist/cli.js" ]; then
        echo -e "${YELLOW}⚠️  Building System Map Auditor...${NC}"
        cd system-map-auditor
        npm run build
        cd ..
        echo -e "${GREEN}✅ Build complete${NC}"
    else
        echo -e "${GREEN}✅ System Map Auditor already built${NC}"
    fi
}

# Create test configuration file
create_test_config() {
    echo -e "${YELLOW}📝 Creating test configuration file...${NC}"
    cat > test-config.json << 'EOF'
{
  "validation": {
    "components": {
      "checkExistence": true,
      "validateDependencies": false
    },
    "apis": {
      "validateEndpoints": true,
      "checkHandlerFiles": false
    }
  },
  "scanning": {
    "includePatterns": [
      "client/src/components/**/*.tsx"
    ]
  }
}
EOF
    echo -e "${GREEN}✅ Test configuration created${NC}"
}

echo ""
echo "📋 Phase 1 Test Coverage:"
echo "  • Day 1: CLI Foundation (3 sub-tests: 1.1-1.3)"
echo "  • Day 2: System Map Parser (6 sub-tests: 2.1-2.2, 3.1-3.3, 4.1-4.3)"
echo "  • Day 3: Basic Validation (6 sub-tests: 5.1-5.3, 6.1-6.3)"
echo "  • Additional Core Tests (6 tests: 7-12)"
echo "  • Total: 21 comprehensive sub-tests"
echo ""

# Prerequisites
echo -e "${BLUE}🔧 Prerequisites Check${NC}"
check_build
create_test_config

echo ""
echo -e "${BLUE}🚀 Starting Phase 1 Tests...${NC}"

# =============================================================================
# DAY 1: CLI FOUNDATION TESTING
# =============================================================================

echo ""
echo -e "${YELLOW}📍 DAY 1: CLI Foundation Tests${NC}"
echo "======================================"

# Test 1.1: Help command
run_test \
    "Test 1.1" \
    "node system-map-auditor/dist/cli.js help" \
    "Help message with all available commands" \
    "Usage,Options" \
    ""

# Test 1.2: Version command
run_test \
    "Test 1.2" \
    "node system-map-auditor/dist/cli.js version" \
    "Version number display" \
    "1.0.0" \
    "CLI Error,unknown option,Error:"

# Test 1.3: Configuration with dry-run
run_test \
    "Test 1.3" \
    "node system-map-auditor/dist/cli.js --dry-run show-config" \
    "Configuration validation without errors in dry-run mode" \
    "validation,scanning,reporting" \
    "CLI Error,unknown option,Error:"

# Test 2.1: Default configuration
run_test \
    "Test 2.1" \
    "node system-map-auditor/dist/cli.js show-config" \
    "Default configuration displayed in JSON format" \
    "validation,scanning,reporting" \
    "CLI Error,unknown option,Error:"

# Test 2.2: Custom configuration
run_test \
    "Test 2.2" \
    "node system-map-auditor/dist/cli.js --config test-config.json show-config" \
    "Custom configuration loaded and merged correctly" \
    "checkExistence,validateEndpoints" \
    "CLI Error,unknown option,Error:"

# =============================================================================
# DAY 2: SYSTEM MAP PARSER TESTING
# =============================================================================

echo ""
echo -e "${YELLOW}📍 DAY 2: System Map Parser Tests${NC}"
echo "====================================="

# Test 3.1: Parse with verbose output
run_test \
    "Test 3.1" \
    "node system-map-auditor/dist/cli.js --verbose parse-only" \
    "Successful parsing of all system maps with verbose output" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 3.2: Parse system maps quietly
run_test \
    "Test 3.2" \
    "node system-map-auditor/dist/cli.js --quiet parse-only" \
    "Parse system maps with quiet output" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 3.3: Parse with configuration file
run_test \
    "Test 3.3" \
    "node system-map-auditor/dist/cli.js --config test-config.json parse-only" \
    "Parse maps with custom configuration" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 4.1: Component discovery with scan-for-maps
run_test \
    "Test 4.1" \
    "node system-map-auditor/dist/cli.js scan-for-maps" \
    "Discover system map files in project" \
    ".system-maps" \
    "CLI Error,unknown option,Error:"

# Test 4.2: Parse only test
run_test \
    "Test 4.2" \
    "node system-map-auditor/dist/cli.js parse-only" \
    "Parse system maps without validation" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 4.3: Parse only with quiet flag
run_test \
    "Test 4.3" \
    "node system-map-auditor/dist/cli.js parse-only --quiet" \
    "Parse system maps quietly" \
    "" \
    "CLI Error,unknown option,Error:"

# =============================================================================
# DAY 3: BASIC VALIDATION TESTING
# =============================================================================

echo ""
echo -e "${YELLOW}📍 DAY 3: Basic Validation Tests${NC}"
echo "=================================="

# Test 5.1: Component existence validation
run_test \
    "Test 5.1" \
    "node system-map-auditor/dist/cli.js validate-components --verbose" \
    "Component existence validation with verbose output" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 5.2: Feature-specific component validation
run_test \
    "Test 5.2" \
    "node system-map-auditor/dist/cli.js audit-feature chat" \
    "Validate components for specific feature using audit-feature command" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 5.3: Full audit with JSON format
run_test \
    "Test 5.3" \
    "node system-map-auditor/dist/cli.js full-audit --format=json" \
    "Full audit with JSON output format" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 6.1: API endpoint validation
run_test \
    "Test 6.1" \
    "node system-map-auditor/dist/cli.js validate-apis --verbose" \
    "API endpoint validation with verbose output" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 6.2: API validation with filter
run_test \
    "Test 6.2" \
    "node system-map-auditor/dist/cli.js validate-apis --filter='chat'" \
    "Validate APIs with filter pattern" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 6.3: API validation with suggestions
run_test \
    "Test 6.3" \
    "node system-map-auditor/dist/cli.js validate-apis --show-suggestions" \
    "API validation with fix suggestions" \
    "" \
    "CLI Error,unknown option,Error:"

# =============================================================================
# ADDITIONAL PHASE 1 TESTS FROM MANUAL TESTING GUIDE
# =============================================================================

echo ""
echo -e "${YELLOW}📍 ADDITIONAL MANUAL TESTING GUIDE TESTS${NC}"
echo "=========================================="

# Test 7: System Map Discovery  
run_test \
    "Test 7" \
    "node system-map-auditor/dist/cli.js scan-for-maps" \
    "List of system map files found" \
    ".system-maps" \
    "CLI Error,unknown option,Error:"

# Test 8: Full Audit
run_test \
    "Test 8" \
    "node system-map-auditor/dist/cli.js full-audit --format=console" \
    "Complete validation of available features" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 9: Feature Audit
run_test \
    "Test 9" \
    "node system-map-auditor/dist/cli.js audit-feature chat" \
    "Specific feature audit results" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 10: Global show-config option
run_test \
    "Test 10" \
    "node system-map-auditor/dist/cli.js --show-config" \
    "Display configuration using global option" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 11: Dry run mode
run_test \
    "Test 11" \
    "node system-map-auditor/dist/cli.js --dry-run parse-only" \
    "Test dry run mode without making changes" \
    "" \
    "CLI Error,unknown option,Error:"

# Test 12: Quiet mode test
run_test \
    "Test 12" \
    "node system-map-auditor/dist/cli.js --quiet parse-only" \
    "Test quiet mode with minimal output" \
    "" \
    "CLI Error,unknown option,Error:"

# =============================================================================
# TEST RESULTS SUMMARY
# =============================================================================

echo ""
echo ""
echo -e "${BLUE}📊 PHASE 1 TEST RESULTS SUMMARY${NC}"
echo "=================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    SUCCESS_RATE=100
else
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
fi

echo "Success Rate: $SUCCESS_RATE%"

echo ""
echo -e "${BLUE}📋 Individual Test Results:${NC}"
echo "----------------------------"
for result in "${TEST_RESULTS[@]}"; do
    echo "$result"
done

echo ""
echo -e "${BLUE}📁 Test Output Files:${NC}"
echo "Generated output files in /tmp/:"
ls -la /tmp/test_output_*.txt 2>/dev/null || echo "No output files generated"

echo ""
echo -e "${BLUE}🧹 Cleanup:${NC}"
echo "To view detailed test output: cat /tmp/test_output_[N].txt"
echo "To clean up test files: rm /tmp/test_output_*.txt test-config.json"

# Performance metrics
echo ""
echo -e "${BLUE}⚡ Performance Metrics:${NC}"
SCRIPT_END_TIME=$(date +%s)
if [ -n "$SCRIPT_START_TIME" ]; then
    TOTAL_TIME=$((SCRIPT_END_TIME - SCRIPT_START_TIME))
    echo "Total execution time: ${TOTAL_TIME}s"
fi

# Final status
echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🏆 PHASE 1 IMPLEMENTATION STATUS: FULLY FUNCTIONAL${NC}"
    echo "✅ CLI Foundation operational"
    echo "✅ System Map Parser working"
    echo "✅ Basic Validation functional"
    echo "✅ Ready for Phase 2 implementation"
else
    echo -e "${YELLOW}⚠️  PHASE 1 IMPLEMENTATION STATUS: NEEDS ATTENTION${NC}"
    echo "🔧 Review failed tests and fix issues"
    echo "📋 Check individual test outputs for details"
fi

echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Review any failed tests above"
echo "2. Check detailed outputs in /tmp/test_output_*.txt"
echo "3. Fix any issues found"
echo "4. Re-run tests to verify fixes"
echo "5. Proceed to Phase 2 testing when all tests pass"

echo ""
echo -e "${GREEN}✨ Phase 1 Testing Complete!${NC}"