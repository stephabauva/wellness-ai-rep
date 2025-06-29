# Metrics Management System Map Analysis

## Manual Analysis - Identified Flaws

I analyzed `.system-maps/health/metrics-management.map.json` and identified these critical flaws:

### 1. Cache Inconsistency
- **Issue**: Different cache keys used across components
- **Details**: 
  - `useHealthVisibilitySettings` uses: `query:healthVisibilitySettings` (line 142)
  - `KeyMetricsOverview` uses: `query:/api/health-consent/visibility` (line 157)
  - `AddMetricsModal` invalidates: `query:/api/health-consent/visibility` (line 122)
- **Impact**: Cache invalidation won't trigger UI updates properly

### 2. Incomplete Cache Invalidation Chain
- **Issue**: `RemoveMetricsModal` only invalidates its own query cache
- **Details**: Line 131 states "Invalidates only its own query cache, not dependent component queries"
- **Missing**: Should invalidate `useHealthVisibilitySettings` hook cache (line 101)

### 3. Broken Feature Status
- **Issue**: `remove-metrics` feature marked as "broken" (line 25)
- **Known Issues**: 
  - "UI components don't refresh after successful metric removal" (line 28)
  - "Cache invalidation incomplete" (line 29)

### 4. Missing Component Definition
- **Issue**: `HealthMetricsCard` referenced but not defined
- **Details**: Referenced in lines 99, 182 but no definition in `components` section

### 5. Handler File Mismatch
- **Issue**: API endpoints reference outdated handler files
- **Details**: Lines 165, 173 reference `server/routes.ts` but actual implementation is in modular route files

### 6. Integration Gaps
- **Issue**: Cache invalidation chain incomplete (line 93)
- **Details**: Missing invalidations for dependent component caches

## System Map Auditor Test Results

Now testing if the auditor detects these specific issues...