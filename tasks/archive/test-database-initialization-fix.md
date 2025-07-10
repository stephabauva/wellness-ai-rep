
# Test Database Initialization Fix Plan

## Problem Summary
Tests fail when running `npx vitest` locally because:
1. Local environment requires async database initialization
2. `PreparedStatementsService` tries to create prepared statements before database is initialized
3. Test environment doesn't automatically initialize the database
4. `db` variable is `undefined` when service constructor runs

## Root Cause Analysis

### Environment Detection Flow
```
Test starts → Local environment detected → Requires async initializeDatabase()
BUT: PreparedStatementsService constructor runs immediately → db.select() fails
```

### The Problem Chain
1. **Test Import**: `prepared-statements-service.ts` imported
2. **Service Creation**: Constructor tries to create prepared statements
3. **Database Access**: Uses `db.select()` but `db` is `undefined`
4. **Failure**: "Cannot read properties of undefined (reading 'select')"

## Solution Strategy

### Phase 1: Test Environment Database Mocking (Immediate Fix)
**Priority**: HIGH
**Risk**: LOW
**Timeline**: 1-2 hours

#### Changes Required:
1. **Update test setup** to properly mock database before imports
2. **Create test-specific database mock** that doesn't require real connections
3. **Fix existing test files** to use proper mocking patterns

#### Files to Modify:
- `server/tests/database-performance.test.ts`
- `server/services/prepared-statements-service.ts` (add null checks)
- Add new `server/tests/mocks/database.mock.ts`

### Phase 2: Lazy Database Service Initialization (Long-term Fix)
**Priority**: MEDIUM
**Risk**: MEDIUM
**Timeline**: 2-3 hours

#### Changes Required:
1. **Refactor PreparedStatementsService** to use lazy initialization
2. **Add database readiness checks** before creating prepared statements
3. **Implement proper async initialization** in test environment

## Implementation Plan

### Step 1: Create Database Mock for Tests
```typescript
// server/tests/mocks/database.mock.ts
export function createTestDatabaseMock() {
  // Mock that mimics drizzle query builder
}
```

### Step 2: Fix Test Setup
```typescript
// In test files, ensure mocks are set up BEFORE imports
vi.mock('../db', () => ({
  db: createTestDatabaseMock(),
  pool: { end: vi.fn() }
}));
```

### Step 3: Add Null Checks to Service
```typescript
// In PreparedStatementsService constructor
if (!db) {
  console.warn('Database not initialized, deferring prepared statement creation');
  return;
}
```

### Step 4: Implement Lazy Initialization
```typescript
// Add method to initialize prepared statements when database is ready
private async ensurePreparedStatements() {
  if (!this.preparedStatements && db) {
    this.initializePreparedStatements();
  }
}
```

## Testing Strategy

### Validation Steps:
1. **Local Test Run**: `npx vitest` should pass without database errors
2. **Replit Test Run**: Tests should still work in Replit environment
3. **Service Functionality**: Ensure prepared statements work when database is available
4. **Error Handling**: Verify graceful degradation when database unavailable

### Test Cases to Add:
- Database initialization timing
- Service behavior with/without database
- Mock validation for all database operations
- Environment-specific initialization paths

## Risk Mitigation

### Low Risk Changes:
- Adding mocks for test environment
- Adding null checks to prevent crashes
- Improving error messages

### Medium Risk Changes:
- Refactoring service initialization patterns
- Changing when prepared statements are created

### Rollback Plan:
- Keep original service logic as fallback
- Use feature flags for new initialization pattern
- Maintain backward compatibility

## Success Criteria

### Immediate Goals:
- [ ] All tests pass locally with `npx vitest`
- [ ] No "Cannot read properties of undefined" errors
- [ ] Tests pass in both local and Replit environments

### Long-term Goals:
- [ ] Prepared statements service works reliably across environments
- [ ] Clean separation between test and production database logic
- [ ] Improved error handling for database initialization failures

## Implementation Order

1. **Create database mock** (30 min)
2. **Fix existing test file** (30 min)
3. **Add null checks to service** (30 min)
4. **Test locally and on Replit** (30 min)
5. **Implement lazy initialization** (1-2 hours)
6. **Add comprehensive tests** (1 hour)

## Notes

- Focus on making tests pass first, optimize later
- Ensure changes don't break existing Replit functionality
- Consider this a template for other service initialization issues
- Document the pattern for future database-dependent services
