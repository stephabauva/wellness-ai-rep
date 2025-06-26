
# Database Health Diagnosis Plan
**Date:** January 21, 2025
**Status:** Planning

## Overview

The database health check is incorrectly reporting "0 tables, 0 indexes" despite the application functioning normally with successful data operations. This plan outlines the investigation and fix for the misleading health metrics.

## Problem Analysis

### Current Symptoms
- Health check reports: `Database health: connected, 0 tables, 0 indexes, performance: warning`
- Application functions normally (memories, conversations, health data all work)
- All API endpoints return data successfully
- Database operations complete without errors

### Root Cause Hypotheses
1. **Schema Context Issue**: Health check queries wrong schema or database
2. **Permission Problem**: Health check lacks permission to access information_schema
3. **Timing Issue**: Health check runs before schema synchronization
4. **Connection Context**: Health check uses different connection context than app

## Investigation Plan

### Phase 1: Schema Investigation (30 minutes)
- [ ] Verify database connection string in health check
- [ ] Check schema names available in target database
- [ ] Test information_schema queries with manual connection
- [ ] Compare health check connection with app connection

### Phase 2: Permission Audit (20 minutes)
- [ ] Test SELECT permissions on information_schema.tables
- [ ] Verify pg_indexes access permissions
- [ ] Check if health check uses same credentials as app

### Phase 3: Query Validation (20 minutes)
- [ ] Run health check queries manually against database
- [ ] Test with different schema names (public, default, etc.)
- [ ] Validate COUNT queries return correct results

## Implementation Strategy

### Option A: Fix Schema Context
```typescript
// Update checkDatabaseHealth() to use correct schema
const tables = await db.execute(sql`
  SELECT COUNT(*) as count 
  FROM information_schema.tables 
  WHERE table_schema = CURRENT_SCHEMA()
`);
```

### Option B: Use Drizzle's Schema Introspection
```typescript
// Leverage existing Drizzle connection for consistency
const tables = await db.execute(sql`
  SELECT COUNT(*) as count 
  FROM pg_tables 
  WHERE schemaname = 'public'
`);
```

### Option C: Add Fallback Verification
```typescript
// Test actual table access as fallback
try {
  await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
  // If this works, we know tables exist regardless of schema queries
} catch (error) {
  // Actually no tables
}
```

## Testing Approach

### Validation Steps
1. **Before Fix**: Capture current health check output
2. **Schema Verification**: Manually verify table count in database
3. **After Fix**: Confirm health check matches reality
4. **Edge Case Testing**: Test with empty database to ensure detection works

### Success Criteria
- [ ] Health check reports accurate table count (>10 expected)
- [ ] Index count matches actual indexes created (~26 expected)
- [ ] Performance status reflects actual database state
- [ ] No false positives in either direction

## Files to Modify

### Primary Changes
- `server/services/database-migration-service.ts` - Fix checkDatabaseHealth method
- Add better error logging for health check queries

### Testing
- `server/tests/database-performance.test.ts` - Add health check validation tests

## Risk Assessment

### Low Risk
- Health check is monitoring only, doesn't affect app functionality
- Changes are isolated to diagnostic code
- Easy to revert if issues arise

### Validation
- All existing database operations continue to work
- Health metrics become accurate without breaking app

## Expected Outcome

After implementation:
- Health check accurately reports ~13 tables, ~26 indexes
- Performance status reflects actual database performance
- Monitoring becomes reliable for production usage
- No impact on application functionality
