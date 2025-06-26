
# Memory Polling Fix Plan

## Problem Analysis

The console shows repeated calls to `/api/memories` every few seconds:
```
[MemoryService] Getting memories for user 1, category: undefined
[MemoryService] Retrieved 7 memories from database
2:05:45 AM [express] GET /api/memories 304 in 82ms
```

### Root Cause Identification

From analyzing `client/src/components/MemorySection.tsx`, the issue is **aggressive polling configuration**:

1. **Dual Query Polling**: Both `allMemories` and `filteredMemories` queries poll every 5 seconds
2. **Low Stale Time**: 1-second stale time forces constant refetching
3. **Aggressive Invalidation**: Manual cache invalidation after every mutation
4. **Window Focus Refetching**: Additional requests on window focus

## Critical Constraints Analysis

**I1 — Feature Isolation**: ✅ SAFE
- Memory polling is isolated to `MemorySection.tsx`
- Changes won't affect chat, health data, or file management
- No dependencies on other features for polling behavior

**I2 — Adaptive Re-evaluation**: ✅ CONSIDERED
- Single-component fix with clear scope
- No cascade effects to other systems
- Preserves all existing memory functionality

**Replit Constraints**: ✅ COMPLIANT
- No changes to Vite, WebSocket, or HMR
- No build system modifications
- Local component-level changes only

## Technical Solution

### Option 1: Smart Polling (RECOMMENDED)
**Pros**: Maintains real-time feel, reduces calls by 80%
**Cons**: Still some background polling
**Risk**: Low - isolated change

### Option 2: Event-Driven Updates
**Pros**: Zero unnecessary calls
**Cons**: Complex state management
**Risk**: Medium - requires broader changes

### Option 3: Manual Refresh Only
**Pros**: Zero background calls
**Cons**: Poor UX for collaborative usage
**Risk**: Low but UX impact

## Recommended Implementation

### Phase 1: Immediate Fix (Smart Polling)

**Target**: Reduce API calls from every 5 seconds to every 30 seconds, eliminate redundant invalidations.

```typescript
// Enhanced query configuration
const { data: allMemories = [], isLoading: allMemoriesLoading } = useQuery({
  queryKey: ["memories"],
  queryFn: async () => {
    const response = await fetch(`/api/memories`);
    if (!response.ok) throw new Error("Failed to fetch memories");
    return response.json();
  },
  refetchInterval: 30000, // 30 seconds instead of 5
  refetchOnWindowFocus: false, // Disable window focus refetch
  staleTime: 25000, // 25 seconds instead of 1 second
});
```

### Phase 2: Smart Invalidation

**Target**: Only invalidate cache when actual changes occur.

```typescript
// Replace aggressive invalidation
onSuccess: async () => {
  // Single targeted invalidation instead of multiple
  await queryClient.invalidateQueries({ queryKey: ["memories"] });
  
  // Remove redundant refetch calls
  // await queryClient.refetchQueries({ queryKey: ["memories"] });
  // await queryClient.refetchQueries();
  
  form.reset();
  setIsManualEntryOpen(false);
  toast({
    title: "Memory saved",
    description: "Your memory has been processed and saved successfully.",
  });
}
```

### Phase 3: Conditional Polling

**Target**: Only poll when memory section is active.

```typescript
// Add visibility-based polling
const [isSectionVisible, setIsSectionVisible] = useState(false);

const { data: allMemories = [] } = useQuery({
  queryKey: ["memories"],
  queryFn: fetchMemories,
  refetchInterval: isSectionVisible ? 30000 : false, // Only poll when visible
  enabled: isSectionVisible, // Only fetch when section is active
});
```

## Implementation Steps

### Step 1: Update Query Configuration
- Increase polling interval from 5s to 30s
- Increase stale time from 1s to 25s
- Disable window focus refetching
- Remove redundant refetch calls

### Step 2: Optimize Mutation Handlers
- Replace multiple invalidation calls with single targeted invalidation
- Remove redundant `refetchQueries` calls
- Keep only essential cache updates

### Step 3: Add Visibility Detection (Optional Enhancement)
- Implement intersection observer for section visibility
- Conditional polling based on user interaction
- Pause polling when section not in view

## Code Changes Required

### Primary File
- `client/src/components/MemorySection.tsx` - Query configuration updates

### No Changes Required
- Backend memory service (working correctly)
- Database queries (performing well)
- Memory processing logic (functioning properly)

## Safety Measures

### Pre-Implementation Checks
1. Verify current memory functionality works
2. Test manual memory addition/deletion
3. Confirm category filtering operates correctly

### Post-Implementation Validation
1. Monitor console for reduced API calls
2. Verify real-time updates still work
3. Test memory operations across different tabs
4. Confirm no UI lag or missing updates

### Rollback Plan
If issues arise:
1. Revert query configuration to original values
2. Re-enable aggressive polling temporarily
3. Investigate specific failure points
4. Implement gradual optimization

## Expected Results

### Performance Improvements
- **80% reduction** in unnecessary API calls
- **90% reduction** in console noise
- **Improved perceived performance** due to less background processing
- **Better battery life** on mobile devices

### User Experience
- ✅ Maintains real-time feel for memory updates
- ✅ Preserves all existing functionality
- ✅ Reduces server load and browser overhead
- ✅ No visible changes to user interface

## Risk Assessment: MINIMAL

**Technical Risk**: Very Low
- Single component modification
- No breaking changes to API contracts
- Preserves all existing functionality

**User Impact**: None
- No visible UI changes
- Same functionality maintained
- Better performance characteristics

**Rollback Difficulty**: Trivial
- Simple configuration value changes
- Easy to revert if needed
- No database or schema changes

## Conclusion

This plan provides a **safe, isolated fix** that dramatically reduces unnecessary API polling while maintaining all existing memory functionality. The solution respects all stability constraints and offers immediate performance benefits with minimal implementation risk.

**Recommendation**: Proceed with Phase 1 implementation immediately, followed by optional enhancements based on results.
