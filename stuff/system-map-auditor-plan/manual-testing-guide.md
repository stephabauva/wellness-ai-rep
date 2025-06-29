# System Map Auditor - Manual Testing Guide

This document provides step-by-step instructions for manually testing each phase of the System Map Auditor implementation using terminal commands.

## Prerequisites

Before testing any phase, ensure you have:

```bash
# 1. Install the System Map Auditor (after implementation)
npm install -g system-map-auditor

# 2. Verify installation
system-map-auditor --version

# 3. Navigate to your project root
cd /path/to/your/project

# 4. Ensure you have system maps in place
ls -la .system-maps/
```

---

## Phase 1: Core Infrastructure Testing (Days 1-3)

### Day 1: CLI Foundation Testing

**Test 1: Basic CLI Commands**
```bash
# Test help command
system-map-auditor --help

# Test version command
system-map-auditor --version

# Test configuration loading
system-map-auditor --config --dry-run
```

**Expected Output:**
- Help message with all available commands
- Version number display
- Configuration validation without errors

**Test 2: Configuration System**
```bash
# Test default configuration
system-map-auditor --show-config

# Test custom configuration
echo '{
  "validation": {
    "components": {
      "checkExistence": true,
      "validateDependencies": false
    }
  }
}' > test-config.json

system-map-auditor --config test-config.json --show-config
```

**Expected Output:**
- Default configuration displayed in JSON format
- Custom configuration loaded and merged correctly

### Day 2: System Map Parser Testing

**Test 3: System Map Parsing**
```bash
# Test parsing with verbose output
system-map-auditor --parse-only --verbose

# Test specific system map
system-map-auditor --parse-only --map=.system-maps/chat.map.json --verbose

# Test federated map parsing ($ref resolution)
system-map-auditor --parse-only --map=.system-maps/root.map.json --debug
```

**Expected Output:**
- Successful parsing of all system maps
- Component and API extraction logs
- Dependency graph construction messages

**Test 4: Codebase Scanner**
```bash
# Test component discovery
system-map-auditor --scan-only --component-patterns="client/src/components/**/*.tsx"

# Test API endpoint discovery
system-map-auditor --scan-only --api-patterns="server/routes/**/*.ts"

# Test full codebase scan
system-map-auditor --scan-only --verbose
```

**Expected Output:**
- List of discovered components
- List of discovered API endpoints
- File paths and component names

### Day 3: Basic Validation Testing

**Test 5: Component Validation**
```bash
# Test component existence validation
system-map-auditor --validate-components --verbose

# Test specific feature validation
system-map-auditor -f chat --validate-components

# Test with detailed error output
system-map-auditor --validate-components --format=json
```

**Expected Output:**
- Validation results for each component
- Missing component errors (if any)
- JSON format validation report

**Test 6: API Validation**
```bash
# Test API endpoint validation
system-map-auditor --validate-apis --verbose

# Test specific API validation
system-map-auditor --validate-apis --filter="*/api/chat/*"

# Test with suggestions
system-map-auditor --validate-apis --show-suggestions
```

**Expected Output:**
- API endpoint validation results
- Handler file verification
- Suggested fixes for missing endpoints

---

## Phase 2: Advanced Validation Testing (Days 4-6)

### Day 4: Flow Validation Testing

**Test 7: User Flow Validation**
```bash
# Test user flow consistency
system-map-auditor --validate-flows --verbose

# Test specific feature flow
system-map-auditor -f health --validate-flows

# Test flow-to-component mapping
system-map-auditor --validate-flows --show-flow-mapping
```

**Expected Output:**
- Flow step validation results
- Component capability matching
- Flow consistency reports

**Test 8: Cross-Reference Validation**
```bash
# Test cross-feature references
system-map-auditor --validate-cross-refs --verbose

# Test shared component validation
system-map-auditor --validate-cross-refs --shared-only

# Test integration points
system-map-auditor --validate-integration-points
```

**Expected Output:**
- Cross-reference validation results
- Shared component usage reports
- Integration point verification

### Day 5: Dependency Analysis Testing

**Test 9: Circular Dependency Detection**
```bash
# Test circular dependency detection
system-map-auditor --detect-circular --verbose

# Test with dependency visualization
system-map-auditor --detect-circular --visualize --format=markdown

# Test dependency depth analysis
system-map-auditor --analyze-dependency-depth --max-depth=5
```

**Expected Output:**
- Circular dependency detection results
- Dependency paths visualization
- Depth analysis reports

**Test 10: Performance Analysis**
```bash
# Test performance impact analysis
system-map-auditor --analyze-performance --verbose

# Test bundle size impact
system-map-auditor --analyze-bundle-impact

# Test critical path analysis
system-map-auditor --analyze-critical-paths
```

**Expected Output:**
- Performance impact reports
- Bundle size analysis
- Critical dependency paths

### Day 6: Reporting System Testing

**Test 11: Multi-Format Reporting**
```bash
# Test console reporting
system-map-auditor --full-audit --format=console --verbose

# Test JSON reporting
system-map-auditor --full-audit --format=json --output=audit-report.json

# Test Markdown reporting
system-map-auditor --full-audit --format=markdown --output=audit-report.md
```

**Expected Output:**
- Console output with colors and formatting
- JSON file with structured results
- Markdown file with human-readable report

**Test 12: Progress and Metrics**
```bash
# Test progress reporting
system-map-auditor --full-audit --show-progress

# Test performance metrics
system-map-auditor --full-audit --show-metrics --timing

# Test detailed error reporting
system-map-auditor --full-audit --detailed-errors
```

**Expected Output:**
- Progress indicators during validation
- Performance timing metrics
- Detailed error descriptions with suggestions

---

## Phase 3: Integration Testing (Days 7-9)

### Day 7: CI/CD Integration Testing

**Test 13: Git Hook Simulation**
```bash
# Test pre-commit hook simulation
system-map-auditor --changed-features-only --fail-fast --simulate-git-hook

# Test changed files detection
git add .system-maps/chat.map.json
system-map-auditor --changed-features-only --verbose

# Test failure scenarios
system-map-auditor --full-audit --fail-fast --max-errors=1
```

**Expected Output:**
- Changed feature detection
- Fast failure on first error
- Git hook compatibility messages

**Test 14: Incremental Validation**
```bash
# Test incremental validation
system-map-auditor --incremental --verbose

# Test cache usage
system-map-auditor --incremental --cache-dir=./audit-cache --verbose

# Test cache invalidation
system-map-auditor --incremental --force-refresh --verbose
```

**Expected Output:**
- Incremental validation results
- Cache hit/miss statistics
- Performance improvements from caching

### Day 8: Advanced Analysis Testing

**Test 15: Dead Code Detection**
```bash
# Test dead code detection
system-map-auditor --detect-dead-code --verbose

# Test orphaned API detection
system-map-auditor --detect-orphaned-apis

# Test cleanup suggestions
system-map-auditor --suggest-cleanup --format=markdown
```

**Expected Output:**
- Unused component detection
- Orphaned API endpoint reports
- Cleanup action suggestions

**Test 16: Completeness Analysis**
```bash
# Test system map completeness
system-map-auditor --analyze-completeness --verbose

# Test coverage percentage
system-map-auditor --coverage-report --min-coverage=80

# Test missing feature detection
system-map-auditor --detect-missing-features
```

**Expected Output:**
- Completeness percentage scores
- Coverage reports
- Missing feature identification

### Day 9: Full Integration Testing

**Test 17: End-to-End Validation**
```bash
# Test complete audit pipeline
system-map-auditor --full-audit --all-validations --verbose

# Test with all output formats
system-map-auditor --full-audit --format=console,json,markdown --output-dir=./audit-results

# Test production mode
system-map-auditor --full-audit --production-mode --strict
```

**Expected Output:**
- Complete validation results
- Multiple output format files
- Production-ready validation reports

**Test 18: Stress Testing**
```bash
# Test parallel processing
system-map-auditor --full-audit --parallel --max-workers=4 --timing

# Test large codebase handling
system-map-auditor --full-audit --timeout=60000 --verbose

# Test memory usage
system-map-auditor --full-audit --monitor-memory --profile
```

**Expected Output:**
- Parallel processing performance
- Memory usage statistics
- Performance profiling data

---

## Troubleshooting Tests

### Error Handling Testing

**Test 19: Error Scenarios**
```bash
# Test missing system map
system-map-auditor --map=nonexistent.map.json

# Test invalid configuration
echo '{ invalid json }' > invalid-config.json
system-map-auditor --config invalid-config.json

# Test permission issues
chmod 000 .system-maps/
system-map-auditor --full-audit
chmod 755 .system-maps/
```

**Expected Output:**
- Graceful error handling
- Clear error messages
- Recovery suggestions

**Test 20: Edge Cases**
```bash
# Test empty system maps
echo '{}' > .system-maps/empty.map.json
system-map-auditor --map=.system-maps/empty.map.json

# Test very large system maps
system-map-auditor --full-audit --max-file-size=10mb

# Test corrupted system maps
echo '{ "components": [ { "name": "incomplete"' > .system-maps/corrupted.map.json
system-map-auditor --map=.system-maps/corrupted.map.json
```

**Expected Output:**
- Proper handling of edge cases
- Validation warnings for empty maps
- Error recovery for corrupted files

---

## Performance Benchmarks

### Performance Testing

**Test 21: Performance Benchmarks**
```bash
# Test execution time benchmarks
time system-map-auditor --full-audit --quiet

# Test memory usage benchmarks
system-map-auditor --full-audit --memory-limit=512mb --monitor-memory

# Test caching performance
system-map-auditor --full-audit --timing --cache-stats
```

**Expected Output:**
- Execution time < 30 seconds for typical project
- Memory usage < 500MB
- Cache hit rate > 80%

---

## Test Result Validation

### Success Criteria

For each test, verify:

1. **Functional Success**: Command executes without crashes
2. **Output Quality**: Results are accurate and actionable
3. **Performance**: Meets established benchmarks
4. **Error Handling**: Graceful failure with clear messages

### Common Issues and Solutions

**Issue: "Command not found"**
```bash
# Solution: Check installation
npm list -g system-map-auditor
npm install -g system-map-auditor
```

**Issue: "No system maps found"**
```bash
# Solution: Verify system map directory
ls -la .system-maps/
system-map-auditor --scan-for-maps
```

**Issue: "Validation failed"**
```bash
# Solution: Use verbose mode for details
system-map-auditor --full-audit --verbose --debug
```

---

### Advanced Validation Examples

### Cache Validation Example Results
```bash
# Example of what cache validation should catch:
❌ Feature: add-metrics
   Status: ACTIVE (❌ INVALID - Missing Cache Evidence)

   Cache Issues:
   - Missing cache invalidation for query:healthVisibilitySettings
   - Component HealthDataSection doesn't refresh after API call
   - RemoveMetricsModal → KeyMetricsOverview refresh chain broken
   - Query key inconsistency: 'healthData' vs 'health-data'

   Recommendation: Change status to 'broken' until cache issues resolved
```

### UI Refresh Validation Example Results
```bash
# Example of what UI refresh validation should catch:
❌ Component: KeyMetricsOverview
   Data Source: query:healthVisibilitySettings

   UI Issues:
   - Component doesn't re-render after successful API mutations
   - Missing refresh dependency in system map
   - Cache invalidation doesn't trigger UI updates
   - Stale data displayed to user after changes

   Recommendation: Add proper refresh dependencies and cache invalidation
```

### Integration Evidence Example Results
```bash
# Example of what integration evidence validation should catch:
❌ Feature: add-metrics
   Status: ACTIVE (❌ REQUIRES EVIDENCE)

   Missing Evidence:
   - No end-to-end test file found
   - Component-API calls not documented in code
   - UI consistency not validated
   - Cache invalidation not tested

   Required Actions:
   1. Create integration test file
   2. Document actual API calls in components
   3. Validate UI refresh after API operations
   4. Test complete user flow functionality

   Cannot mark as 'active' until evidence provided
```

### Automated Test Execution

### Enhanced Batch Testing Script

Create a comprehensive test runner script:

```bash
#!/bin/bash
# save as test-system-map-auditor.sh

echo "🧪 System Map Auditor - Enhanced Test Suite"
echo "================================================"

# Phase 1 Tests
echo "📍 Phase 1: Core Infrastructure"
system-map-auditor --help > /dev/null && echo "✅ CLI Help" || echo "❌ CLI Help"
system-map-auditor --version > /dev/null && echo "✅ Version" || echo "❌ Version"
system-map-auditor --parse-only --quiet > /dev/null && echo "✅ Parsing" || echo "❌ Parsing"

# Phase 2 Tests
echo "📍 Phase 2: Advanced Validation"
system-map-auditor --validate-components --quiet > /dev/null && echo "✅ Components" || echo "❌ Components"
system-map-auditor --validate-flows --quiet > /dev/null && echo "✅ Flows" || echo "❌ Flows"
system-map-auditor --detect-circular --quiet > /dev/null && echo "✅ Dependencies" || echo "❌ Dependencies"

# Phase 3 Tests - New Cache & UI Validation
echo "📍 Phase 3: Enhanced Integration"
system-map-auditor --validate-cache-dependencies --quiet > /dev/null && echo "✅ Cache Dependencies" || echo "❌ Cache Dependencies"
system-map-auditor --validate-ui-refresh-chains --quiet > /dev/null && echo "✅ UI Refresh Chains" || echo "❌ UI Refresh Chains"
system-map-auditor --validate-integration-evidence --quiet > /dev/null && echo "✅ Integration Evidence" || echo "❌ Integration Evidence"
system-map-auditor --validate-hook-consistency --quiet > /dev/null && echo "✅ Hook Consistency" || echo "❌ Hook Consistency"
system-map-auditor --prevent-false-active-status --quiet > /dev/null && echo "✅ False Active Prevention" || echo "❌ False Active Prevention"

# Complete Integration Test
echo "📍 Complete Integration Test"
system-map-auditor --validate-complete-integration --quiet > /dev/null && echo "✅ Complete Integration" || echo "❌ Complete Integration"

echo "================================================"
echo "🏆 Enhanced Test Suite Complete"
```

**Usage:**
```bash
chmod +x test-system-map-auditor.sh
./test-system-map-auditor.sh
```

### Critical Issue Prevention Test
```bash
#!/bin/bash
# save as test-add-metrics-prevention.sh
# This test specifically validates that "Add Metrics" type issues are caught

echo "🔍 Testing Add Metrics Issue Prevention"
echo "======================================="

echo "Testing feature: add-metrics"
system-map-auditor --feature=add-metrics --validate-complete-integration --verbose

echo "Testing cache invalidation chains..."
system-map-auditor --validate-cache-invalidation-chains --domain=health --verbose

echo "Testing UI refresh dependencies..."
system-map-auditor --validate-ui-refresh-chains --feature=add-metrics --verbose

echo "Testing integration evidence..."
system-map-auditor --validate-integration-evidence --feature=add-metrics --strict

echo "======================================="
echo "🛡️ Add Metrics Prevention Test Complete"