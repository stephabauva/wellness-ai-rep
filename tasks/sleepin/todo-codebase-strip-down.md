# Codebase Strip-Down Plan

## Executive Summary

After thorough analysis, the codebase is not as catastrophically bloated as initially reported (209 TypeScript files, not 18,433+). However, there are significant issues that need addressing:
- Critical functionality broken after recent refactoring
- Over-engineered memory services architecture
- Failed Go service integration
- Too many unimplemented features in UI
- Some files exceeding 300-line limit

## Current State Assessment

### Critical Issues
1. **Chat Functionality Broken**
   - Missing conversation IDs preventing history display
   - React hook errors when clicking past conversations
   - Extensive duplicate logging
   - Background queue overflow (14+ tasks)

2. **Go Service Integration Failed**
   - File accelerator returning 503 errors
   - Health check issues across services
   - No proper fallback handling

3. **Over-Engineering**
   - 6 memory service implementations with overlapping functionality
   - 30+ settings options with only 8 essential
   - Complex background processing causing queue overflow

### Actual Codebase Metrics
- **Total TypeScript files**: 209 (excluding node_modules)
- **Server routes**: Successfully modularized from 3,823 lines to 1,808 lines across 7 files
- **Files exceeding 300 lines**: 2 route files (325 and 339 lines)
- **Memory services**: 74KB+ of complex code across multiple files
- **Dependencies**: 100+ npm packages (many from UI component libraries)

## Phase 1: Critical Bug Fixes (Days 1-3)

### Task 1.1: Fix Broken Chat Functionality
- [x] Debug missing conversation ID issue in chat-routes.ts
- [x] Fix React hook errors in ConversationHistory component
- [x] Resolve duplicate logging in memory service
- [x] Fix background queue overflow (implement proper circuit breaker)
- [x] Ensure audio transcriptions persist in input field

### Task 1.2: Fix Go Service Integration
- [ ] Debug go-file-accelerator 503 errors
- [ ] Implement proper health checks with timeouts
- [ ] Add graceful fallback to TypeScript processing
- [ ] Fix service startup logic for large files

### Task 1.3: Stabilize Core Functionality
- [ ] Fix health dashboard metrics deletion
- [ ] Resolve file upload "0 valid records" issue
- [ ] Fix memory page categorization inconsistencies
- [ ] Ensure file manager category selection works

## Phase 2: Code Simplification (Days 4-7)

### Task 2.1: Consolidate Memory Services
- [ ] Analyze usage of 6 memory service files
- [ ] Create unified memory service combining essential features
- [ ] Remove unused advanced features (performance cores, web workers)
- [ ] Simplify background processing to prevent queue overflow
- [ ] Update all imports to use consolidated service

### Task 2.2: Refactor Large Files
- [ ] Split file-routes.ts (325 lines) into smaller modules
- [ ] Split health-routes.ts (339 lines) into smaller modules
- [ ] Ensure all files stay under 300 lines
- [ ] Maintain functionality during refactoring

### Task 2.3: Remove Unused Code
- [ ] Delete unused performance monitoring hooks (if truly unused)
- [ ] Remove unimplemented settings options
- [ ] Clean up duplicate error handling patterns
- [ ] Remove mock data and test fixtures from production code

## Phase 3: Architecture Optimization (Days 8-10)

### Task 3.1: Streamline Settings
- [ ] Reduce settings from 30+ to 8 essential options:
  - Language (keep UI, remove backend until implemented)
  - Theme (fix dark mode)
  - AI Provider configuration
  - Privacy settings (simplified)
  - Account management
  - Data export
  - Critical performance settings only
  - Remove all unimplemented toggles

### Task 3.2: Optimize Frontend State
- [ ] Fix component re-renders on every message
- [ ] Implement proper React.memo usage
- [ ] Fix optimistic updates causing state conflicts
- [ ] Simplify state management architecture

### Task 3.3: Simplify User Flows
- [ ] Remove duplicate features across pages
- [ ] Consolidate file categorization logic
- [ ] Simplify memory creation flow
- [ ] Remove technical settings from user-facing UI

## Phase 4: Dependency Cleanup (Days 11-12)

### Task 4.1: Audit Dependencies
- [ ] Review 100+ npm packages
- [ ] Identify unused dependencies
- [ ] Consolidate UI component libraries (@radix-ui packages)
- [ ] Update package.json with only essential dependencies

### Task 4.2: Bundle Optimization
- [ ] Analyze bundle size
- [ ] Implement code splitting where beneficial
- [ ] Remove unused imports
- [ ] Optimize build configuration

## Phase 5: Go Migration Preparation (Days 13-15)

### Task 5.1: Evaluate Migration Feasibility
- [ ] Document all TypeScript service interfaces
- [ ] Create API compatibility matrix
- [ ] Design parallel runtime strategy
- [ ] Plan gradual migration approach

### Task 5.2: Prepare Migration Foundation
- [ ] Fix all critical bugs first
- [ ] Ensure clean service boundaries
- [ ] Document SSE/WebSocket requirements
- [ ] Create migration testing framework

## Success Criteria

1. **All critical functionality working**
   - Chat conversations properly tracked
   - Health data imports successful
   - Memory system functional
   - File management operational

2. **Code quality metrics met**
   - No files over 300 lines
   - No duplicate code patterns
   - All code integrated and used
   - Clean dependency tree

3. **Performance targets**
   - No background queue overflow
   - Smooth UI without excessive re-renders
   - Fast file processing with Go services
   - Reduced memory footprint

## Risk Mitigation

1. **Backup Strategy**
   - Create git branch before each phase
   - Test thoroughly after each change
   - Maintain rollback capability

2. **Testing Approach**
   - Run existing Vitest suite after each change
   - Manual testing of critical user flows
   - Performance testing for memory operations

3. **Go Service Fallbacks**
   - Always maintain TypeScript fallback
   - Graceful degradation for service failures
   - Clear error messages for debugging

## Review Process

After each phase:
1. Run full test suite
2. Manual test all user flows
3. Check performance metrics
4. Verify no regression in functionality
5. Update system maps if architecture changes

## Final Notes

The codebase is not as bloated as initially reported, but does suffer from:
- Recent refactoring that broke core functionality
- Over-engineered solutions for simple problems
- Too many unimplemented features
- Poor Go service integration

Focus should be on fixing critical bugs first, then simplifying architecture, rather than a complete rewrite. The TypeScript to Go migration should only proceed after stabilizing the current system.