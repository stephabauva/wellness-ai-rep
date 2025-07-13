# Phase 4: Remaining Work - Domain Boundary Enforcement

Phase 4 is from the plan dependency-optimization-plan.md

## Current Status
- **Target**: 80 → 5 cross-domain violations (94% reduction)
- **Current**: 80 → 15 cross-domain violations (81% reduction)
- **Remaining**: 10 violations to resolve

## Priority 1: Infrastructure Routing Abstraction (~10 violations)

### Problem
`server/routes/shared-dependencies.ts` directly imports domain services causing cross-domain violations.

### Files Needing Abstraction
- server/services/enhanced-memory-service.ts
- server/services/memory-relationship-engine.ts  
- server/services/performance-memory-core.ts
- server/services/memory-feature-flags.ts
- server/services/memory-performance-monitor.ts
- server/services/health-data-parser.ts
- server/services/health-data-deduplication.ts
- server/services/health-consent-service.ts
- server/services/go-file-service.ts
- server/services/enhanced-background-processor.ts

### Solution Approach
1. **Extend Service Registry Pattern**
   - Add domain-specific service getters to `server/services/service-registry.ts`
   - Create abstraction layer for routing dependencies
   - Replace direct imports with registry calls

2. **Implementation Steps**
   ```typescript
   // Add to service-registry.ts
   export function getMemoryServices() {
     return {
       enhancedMemoryService,
       memoryRelationshipEngine,
       performanceMemoryCore,
       memoryFeatureFlags,
       memoryPerformanceMonitor
     };
   }
   
   export function getHealthServices() {
     return {
       healthDataParser,
       healthDataDeduplication,
       healthConsentService
     };
   }
   ```

3. **Update shared-dependencies.ts**
   - Replace direct service imports with registry calls
   - Maintain backward compatibility during transition

### Expected Impact
- **Violation Reduction**: ~10 violations → ~5 violations
- **Estimated Time**: 2-3 hours

## Priority 2: Component Domain Classification (~5 violations)

### Problem
Components marked as "unknown/needs-classification" causing cross-domain violations.

### Components Needing Classification
1. `client/src/components/Sidebar.tsx` → classify as `app/navigation`
2. `client/src/components/SectionSkeleton.tsx` → classify as `shared/ui-components`
3. `client/src/components/MobileNav.tsx` → classify as `app/navigation`
4. `client/src/components/ConnectedDevicesSection.tsx` → classify as `health/devices`
5. Additional server files may need classification

### Solution Approach
1. **Update Domain Mappings**
   - Modify `dependency-tracker.js` domain classification logic
   - Add specific path mappings for unclassified components

2. **Implementation**
   ```javascript
   // Add to getDomainFromPath() in dependency-tracker.js
   if (normalizedPath.includes('client/src/components/Sidebar.tsx')) return 'app/navigation';
   if (normalizedPath.includes('client/src/components/SectionSkeleton.tsx')) return 'shared/ui-components';
   if (normalizedPath.includes('client/src/components/MobileNav.tsx')) return 'app/navigation';
   if (normalizedPath.includes('client/src/components/ConnectedDevicesSection.tsx')) return 'health/devices';
   ```

### Expected Impact
- **Violation Reduction**: ~5 violations → 0 violations
- **Estimated Time**: 30 minutes

## Validation Steps

### After Priority 1 Completion
```bash
node dependency-tracker.js
# Expected: ~5 violations remaining
```

### After Priority 2 Completion
```bash
node dependency-tracker.js
# Expected: 0-2 violations remaining (target achieved)
```

## Success Criteria
- ✅ Achieve 94% violation reduction (80 → 5 violations)
- ✅ Maintain production stability
- ✅ Preserve existing functionality
- ✅ Document all architectural changes

## Timeline
- **Priority 1**: 2-3 hours (High Impact)
- **Priority 2**: 30 minutes (Quick Win)
- **Total Remaining**: 2.5-3.5 hours

## Risk Mitigation
- Test service registry changes incrementally
- Maintain backward compatibility during transitions
- Validate system maps after each priority completion
- Run full dependency analysis after each change

## Phase 4 Completion Checklist
- [ ] Complete Priority 1: Infrastructure Routing Abstraction
- [ ] Complete Priority 2: Component Domain Classification
- [ ] Run final dependency analysis
- [ ] Update phase-4-status.md with completion
- [ ] Create final git commit
- [ ] Document architectural improvements