#!/bin/bash

# System Map Auditor - Run All Tests
# Executes all test phases in sequence

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 System Map Auditor - Complete Test Suite${NC}"
echo -e "${PURPLE}===========================================${NC}"

# Phase 1: Core Infrastructure
echo -e "\n${BLUE}📋 Phase 1: Core Infrastructure Tests${NC}"
chmod +x system-map-auditor/tests/core-infrastructure.test.sh
./system-map-auditor/tests/core-infrastructure.test.sh

# Phase 2: Advanced Validation
echo -e "\n${BLUE}📋 Phase 2: Advanced Validation Tests${NC}"
chmod +x system-map-auditor/tests/advanced-validation.test.sh
./system-map-auditor/tests/advanced-validation.test.sh

# Phase 3: Enhanced Integration
echo -e "\n${BLUE}📋 Phase 3: Enhanced Integration Tests${NC}"
chmod +x system-map-auditor/tests/enhanced-integration.test.sh
./system-map-auditor/tests/enhanced-integration.test.sh

# Phase 4: CI/CD Integration
echo -e "\n${BLUE}📋 Phase 4: CI/CD Integration Tests${NC}"
chmod +x system-map-auditor/tests/ci-cd-integration.test.sh
./system-map-auditor/tests/ci-cd-integration.test.sh

# Phase 5: Completeness Analysis
echo -e "\n${BLUE}📋 Phase 5: Completeness Analysis Tests${NC}"
chmod +x system-map-auditor/tests/completeness-analysis.test.sh
./system-map-auditor/tests/completeness-analysis.test.sh

# Phase 6: Semantic Cache Validation (New)
echo -e "\n${BLUE}📋 Phase 6: Semantic Cache Validation Tests${NC}"
chmod +x system-map-auditor/tests/semantic-cache-validation.test.sh
./system-map-auditor/tests/semantic-cache-validation.test.sh

echo -e "\n${GREEN}🎉 All test phases completed successfully!${NC}"
echo -e "${GREEN}✅ Core Infrastructure Tests${NC}"
echo -e "${GREEN}✅ Advanced Validation Tests${NC}"
echo -e "${GREEN}✅ Enhanced Integration Tests${NC}"
echo -e "${GREEN}✅ CI/CD Integration Tests${NC}"
echo -e "${GREEN}✅ Completeness Analysis Tests${NC}"
echo -e "${GREEN}✅ Semantic Cache Validation Tests (NEW)${NC}"