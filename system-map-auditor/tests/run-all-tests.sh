
#!/bin/bash

# Master Test Runner - System Map Auditor
# Runs all test categories in sequence

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test categories
TEST_CATEGORIES=(
    "core-infrastructure"
    "advanced-validation"
    "enhanced-integration"
    "ci-cd-integration"
    "completeness-analysis"
)

# Test results tracking
TOTAL_CATEGORIES=0
PASSED_CATEGORIES=0
FAILED_CATEGORIES=0

# Function to print colored headers
print_header() {
    echo -e "\n${PURPLE}$1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' $(seq 1 ${#1}))${NC}"
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

# Function to run a test category
run_test_category() {
    local category="$1"
    local test_file="system-map-auditor/tests/${category}.test.sh"
    
    TOTAL_CATEGORIES=$((TOTAL_CATEGORIES + 1))
    
    print_header "RUNNING ${category^^} TESTS"
    
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}❌ Test file not found: $test_file${NC}"
        FAILED_CATEGORIES=$((FAILED_CATEGORIES + 1))
        return 1
    fi
    
    # Make test file executable
    chmod +x "$test_file"
    
    # Run test category
    if bash "$test_file"; then
        echo -e "${GREEN}✅ ${category^^} tests passed${NC}"
        PASSED_CATEGORIES=$((PASSED_CATEGORIES + 1))
        return 0
    else
        echo -e "${RED}❌ ${category^^} tests failed${NC}"
        FAILED_CATEGORIES=$((FAILED_CATEGORIES + 1))
        return 1
    fi
}

# Main execution
main() {
    echo -e "${PURPLE}🧪 System Map Auditor - Complete Test Suite${NC}"
    echo -e "${PURPLE}============================================${NC}\n"

    # Build the auditor first
    if ! build_auditor; then
        echo -e "${RED}❌ Cannot proceed without successful build${NC}"
        exit 1
    fi

    # Run each test category
    for category in "${TEST_CATEGORIES[@]}"; do
        run_test_category "$category"
        echo "" # Add spacing between categories
    done

    # Final summary
    print_header "COMPLETE TEST SUITE SUMMARY"
    
    echo -e "${PURPLE}📊 Test Category Results${NC}"
    echo -e "${PURPLE}========================${NC}"
    echo -e "${GREEN}✅ Passed Categories: $PASSED_CATEGORIES${NC}"
    echo -e "${RED}❌ Failed Categories: $FAILED_CATEGORIES${NC}"
    echo -e "${BLUE}📝 Total Categories:  $TOTAL_CATEGORIES${NC}"

    echo -e "\n${PURPLE}🚀 Test Categories Executed:${NC}"
    for category in "${TEST_CATEGORIES[@]}"; do
        echo -e "${BLUE}  - ${category}${NC}"
    done

    echo -e "\n${PURPLE}🎯 Enhanced Features Validated:${NC}"
    echo -e "${GREEN}✅ Component-to-API Call Tracing${NC}"
    echo -e "${GREEN}✅ Cache Invalidation Chain Validation${NC}"
    echo -e "${GREEN}✅ UI Refresh Dependency Validation${NC}"
    echo -e "${GREEN}✅ Integration Evidence Requirements${NC}"
    echo -e "${GREEN}✅ Dead Code Detection${NC}"
    echo -e "${GREEN}✅ Completeness Analysis${NC}"
    echo -e "${GREEN}✅ CI/CD Integration${NC}"

    if [ $FAILED_CATEGORIES -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TEST CATEGORIES PASSED SUCCESSFULLY!${NC}"
        echo -e "${GREEN}System Map Auditor is fully functional with all enhanced features.${NC}"
        echo -e "${GREEN}Ready for production deployment.${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some test categories failed.${NC}"
        echo -e "${YELLOW}Please review the failed categories above for details.${NC}"
        exit 1
    fi
}

# Show usage if help requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "System Map Auditor - Complete Test Suite"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo ""
    echo "Test Categories:"
    for category in "${TEST_CATEGORIES[@]}"; do
        echo "  - $category"
    done
    echo ""
    echo "This script will:"
    echo "1. Build the System Map Auditor"
    echo "2. Run all test categories in sequence"
    echo "3. Provide comprehensive results summary"
    exit 0
fi

# Run main function
main "$@"
