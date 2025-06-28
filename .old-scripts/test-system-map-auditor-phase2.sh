#!/bin/bash

# System Map Auditor - Phase 2 Automated Test Suite
# Tests all Phase 2 functionality: Flow Validation, Dependency Analysis, Enhanced Reporting

set -e  # Exit on any error

SCRIPT_START_TIME=$(date +%s)

echo "🧪 System Map Auditor - Phase 2 Automated Test Suite"
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
    if timeout 30s bash -c "$test_command" > /tmp/phase2_test_output_$TOTAL_TESTS.txt 2>&1; then
        exit_code=0
    else
        exit_code=$?
    fi

    # Handle timeout case
    if [ $exit_code -eq 124 ]; then
        echo -e "${YELLOW}⚠️  TIMEOUT${NC}: Command timed out after 30 seconds"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $test_name (TIMEOUT)")
        echo "Output preview:"
        head -10 /tmp/phase2_test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
        echo "Full output saved to: /tmp/phase2_test_output_$TOTAL_TESTS.txt"
        return
    fi

    # Check for explicit failure keywords first
    if [ -n "$failure_keywords" ]; then
        IFS=',' read -ra FAIL_KEYWORDS <<< "$failure_keywords"
        for keyword in "${FAIL_KEYWORDS[@]}"; do
            if grep -qi "$keyword" /tmp/phase2_test_output_$TOTAL_TESTS.txt; then
                echo -e "${RED}❌ FAIL${NC}: Failure keyword detected: $keyword"
                FAILED_TESTS=$((FAILED_TESTS + 1))
                TEST_RESULTS+=("❌ $test_name (Error: $keyword)")
                echo "Output preview:"
                head -10 /tmp/phase2_test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
                echo "Exit code: $exit_code"
                echo "Full output saved to: /tmp/phase2_test_output_$TOTAL_TESTS.txt"
                return
            fi
        done
    fi

    # Check output content for expected keywords if provided
    if [ -n "$expected_keywords" ]; then
        local keywords_found=true
        IFS=',' read -ra KEYWORDS <<< "$expected_keywords"
        for keyword in "${KEYWORDS[@]}"; do
            if ! grep -qi "$keyword" /tmp/phase2_test_output_$TOTAL_TESTS.txt; then
                keywords_found=false
                echo "Missing keyword: $keyword"
                break
            fi
        done

        # For help command, exit code 1 is normal - just check if keywords are found
        if [ "$keywords_found" = true ]; then
            if [[ "$test_command" == *"help"* ]] || [ $exit_code -eq 0 ]; then
                test_passed=true
            fi
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
        head -5 /tmp/phase2_test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
    else
        echo -e "${RED}❌ FAIL${NC}: Test failed (exit code: $exit_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("❌ $test_name")

        # Show error output
        echo "Output preview:"
        head -10 /tmp/phase2_test_output_$TOTAL_TESTS.txt | sed 's/^/  /'
    fi

    echo "Exit code: $exit_code"
    echo "Full output saved to: /tmp/phase2_test_output_$TOTAL_TESTS.txt"
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

echo ""
echo "📋 Phase 2 Test Coverage:"
echo "  • Day 4: Flow Validation (9 tests: validate-flows, cross-refs, integration-points)"
echo "  • Day 5: Dependency Analysis (12 tests: circular deps, depth analysis, performance)"
echo "  • Day 6: Enhanced Reporting (6 tests: detailed reports, markdown generation)"
echo "  • Total: 27 comprehensive Phase 2 tests"
echo ""

# Prerequisites
echo -e "${BLUE}🔧 Prerequisites Check${NC}"
check_build

echo ""
echo -e "${BLUE}🚀 Starting Phase 2 Tests...${NC}"

# =============================================================================
# DAY 4: FLOW VALIDATION TESTING
# =============================================================================

echo ""
echo -e "${YELLOW}📍 DAY 4: Flow Validation Tests${NC}"
echo "================================="

# Test 1: Basic flow validation
run_test \
    "Test 1: Basic Flow Validation" \
    "node system-map-auditor/dist/cli.js validate-flows" \
    "Validate all user flows against implementation" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 2: Feature-specific flow validation
run_test \
    "Test 2: Feature-Specific Flow Validation" \
    "node system-map-auditor/dist/cli.js validate-flows --feature chat" \
    "Validate flows for specific feature only" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 3: Flow validation with mapping display
run_test \
    "Test 3: Flow Validation with Mapping" \
    "node system-map-auditor/dist/cli.js validate-flows --show-flow-mapping" \
    "Show component capability mapping during validation" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 4: Quiet flow validation
run_test \
    "Test 4: Quiet Flow Validation" \
    "node system-map-auditor/dist/cli.js validate-flows --quiet" \
    "Run flow validation with minimal output" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 5: Cross-reference validation
run_test \
    "Test 5: Cross-Reference Validation" \
    "node system-map-auditor/dist/cli.js validate-cross-refs" \
    "Validate cross-feature component references" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 6: Shared-only cross-reference validation
run_test \
    "Test 6: Shared Components Cross-Reference" \
    "node system-map-auditor/dist/cli.js validate-cross-refs --shared-only" \
    "Validate only shared components across features" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 7: Integration points validation
run_test \
    "Test 7: Integration Points Validation" \
    "node system-map-auditor/dist/cli.js validate-integration-points" \
    "Validate external integration points" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 8: Integration points with connection verification
run_test \
    "Test 8: Integration Points with Connection Test" \
    "node system-map-auditor/dist/cli.js validate-integration-points --verify-connections" \
    "Test actual external connections during validation" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 9: Quiet integration points validation
run_test \
    "Test 9: Quiet Integration Points" \
    "node system-map-auditor/dist/cli.js validate-integration-points --quiet" \
    "Run integration validation with minimal output" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# =============================================================================
# DAY 5: DEPENDENCY ANALYSIS TESTING
# =============================================================================

echo ""
echo -e "${YELLOW}📍 DAY 5: Dependency Analysis Tests${NC}"
echo "====================================="

# Test 10: Circular dependency detection
run_test \
    "Test 10: Circular Dependency Detection" \
    "node system-map-auditor/dist/cli.js detect-circular" \
    "Detect circular dependencies in system maps" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 11: Circular dependencies with visualization
run_test \
    "Test 11: Circular Dependencies with Visualization" \
    "node system-map-auditor/dist/cli.js detect-circular --visualize" \
    "Generate dependency visualization for circular deps" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 12: Circular dependencies JSON format
run_test \
    "Test 12: Circular Dependencies JSON Output" \
    "node system-map-auditor/dist/cli.js detect-circular --format=json" \
    "Output circular dependencies in JSON format" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 13: Circular dependencies markdown format
run_test \
    "Test 13: Circular Dependencies Markdown Output" \
    "node system-map-auditor/dist/cli.js detect-circular --format=markdown" \
    "Output circular dependencies in Markdown format" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 14: Dependency depth analysis
run_test \
    "Test 14: Dependency Depth Analysis" \
    "node system-map-auditor/dist/cli.js analyze-dependency-depth" \
    "Analyze dependency depth for all components" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 15: Specific component dependency depth
run_test \
    "Test 15: Specific Component Dependency Depth" \
    "node system-map-auditor/dist/cli.js analyze-dependency-depth --component ChatSection" \
    "Analyze dependency depth for specific component" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 16: Dependency depth with custom threshold
run_test \
    "Test 16: Dependency Depth Custom Threshold" \
    "node system-map-auditor/dist/cli.js analyze-dependency-depth --max-depth 3" \
    "Analyze dependencies with custom depth threshold" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 17: Performance analysis
run_test \
    "Test 17: Performance Analysis" \
    "node system-map-auditor/dist/cli.js analyze-performance" \
    "Analyze performance impact of dependencies" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 18: Performance analysis with bundle details
run_test \
    "Test 18: Performance Analysis with Bundle Details" \
    "node system-map-auditor/dist/cli.js analyze-performance --show-bundle-analysis" \
    "Include bundle size analysis in performance report" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 19: Performance analysis with loading metrics
run_test \
    "Test 19: Performance Analysis with Loading Metrics" \
    "node system-map-auditor/dist/cli.js analyze-performance --show-loading-metrics" \
    "Include loading performance metrics" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 20: Critical paths analysis
run_test \
    "Test 20: Critical Paths Analysis" \
    "node system-map-auditor/dist/cli.js analyze-critical-paths" \
    "Analyze critical dependency paths" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 21: Critical paths with custom length
run_test \
    "Test 21: Critical Paths Custom Length" \
    "node system-map-auditor/dist/cli.js analyze-critical-paths --max-length 5" \
    "Analyze critical paths with custom length limit" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# =============================================================================
# DAY 6: ENHANCED REPORTING TESTING
# =============================================================================

echo ""
echo -e "${YELLOW}📍 DAY 6: Enhanced Reporting Tests${NC}"
echo "==================================="

# Test 22: Generate detailed markdown report
run_test \
    "Test 22: Detailed Markdown Report" \
    "node system-map-auditor/dist/cli.js generate-detailed-report --format=markdown" \
    "Generate comprehensive detailed audit report in Markdown" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 23: Generate detailed JSON report
run_test \
    "Test 23: Detailed JSON Report" \
    "node system-map-auditor/dist/cli.js generate-detailed-report --format=json" \
    "Generate comprehensive detailed audit report in JSON" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 24: Detailed report with performance analysis
run_test \
    "Test 24: Detailed Report with Performance" \
    "node system-map-auditor/dist/cli.js generate-detailed-report --include-performance" \
    "Include performance analysis in detailed report" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 25: Detailed report with recommendations
run_test \
    "Test 25: Detailed Report with Recommendations" \
    "node system-map-auditor/dist/cli.js generate-detailed-report --include-recommendations" \
    "Include optimization recommendations in report" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 26: Detailed report to file
run_test \
    "Test 26: Detailed Report to File" \
    "node system-map-auditor/dist/cli.js generate-detailed-report --output=/tmp/detailed-audit-report.md" \
    "Save detailed report to specific file" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# Test 27: Full detailed report with all options
run_test \
    "Test 27: Full Detailed Report All Options" \
    "node system-map-auditor/dist/cli.js generate-detailed-report --include-performance --include-recommendations --format=markdown" \
    "Generate complete detailed report with all features" \
    "" \
    "CLI Error,unknown option,TypeError,ReferenceError"

# =============================================================================
# TEST RESULTS SUMMARY
# =============================================================================

echo ""
echo ""
echo -e "${BLUE}📊 PHASE 2 TEST RESULTS SUMMARY${NC}"
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
ls -la /tmp/phase2_test_output_*.txt 2>/dev/null || echo "No output files generated"

echo ""
echo -e "${BLUE}🧹 Cleanup:${NC}"
echo "To view detailed test output: cat /tmp/phase2_test_output_[N].txt"
echo "To clean up test files: rm /tmp/phase2_test_output_*.txt"

# Performance metrics
echo ""
echo -e "${BLUE}⚡ Performance Metrics:${NC}"
SCRIPT_END_TIME=$(date +%s)
if [ -n "$SCRIPT_START_TIME" ]; then
    TOTAL_TIME=$((SCRIPT_END_TIME - SCRIPT_START_TIME))
    echo "Total execution time: ${TOTAL_TIME}s"
    AVG_TIME_PER_TEST=$((TOTAL_TIME / TOTAL_TESTS))
    echo "Average time per test: ${AVG_TIME_PER_TEST}s"
fi

# Feature completeness check
echo ""
echo -e "${BLUE}🔍 Phase 2 Feature Completeness:${NC}"
if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ Flow Validation: Operational"
    echo "✅ Dependency Analysis: Operational" 
    echo "✅ Enhanced Reporting: Operational"
    echo "✅ Phase 2 CLI Commands: All functional"
else
    echo "🔧 Flow Validation: Check failed tests"
    echo "🔧 Dependency Analysis: Check failed tests"
    echo "🔧 Enhanced Reporting: Check failed tests"
fi

# Final status
echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🏆 PHASE 2 IMPLEMENTATION STATUS: FULLY FUNCTIONAL${NC}"
    echo "✅ Flow Validation operational"
    echo "✅ Dependency Analysis working"
    echo "✅ Enhanced Reporting functional" 
    echo "✅ Advanced CLI commands available"
    echo "✅ Ready for production deployment"
else
    echo -e "${YELLOW}⚠️  PHASE 2 IMPLEMENTATION STATUS: NEEDS ATTENTION${NC}"
    echo "🔧 Review failed tests and fix issues"
    echo "📋 Check individual test outputs for details"
    echo "🔄 Phase 2 features may need debugging"
fi

echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Review any failed tests above"
echo "2. Check detailed outputs in /tmp/phase2_test_output_*.txt"
echo "3. Fix any issues found in Phase 2 implementation"
echo "4. Re-run tests to verify fixes"
echo "5. Deploy to production when all tests pass"

echo ""
echo -e "${GREEN}✨ Phase 2 Testing Complete!${NC}"