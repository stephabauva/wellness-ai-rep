# Todo: Godmode and Memory UI Real-time Updates

## Context & Investigation
- **Current state analysis**: 
  - Godmode monitors memory quality metrics using React Query with 5-minute cache
  - Memory deletion works but doesn't automatically update Godmode display
  - Memory overview uses tabs for category navigation
  - Both GODMODE and VITE_GODMODE exist for cross-platform compatibility
  - No WebSocket/real-time updates - relies on React Query cache invalidation

- **System map references checked**: 
  - Memory domain: client/src/components/MemorySection.tsx
  - Godmode: client/src/components/GodModeSection.tsx
  - Config: shared/config/god-mode.ts

- **Dependencies identified**:
  - Both components use same React Query key: `memory-overview`
  - Memory deletion invalidates queries but Godmode might not refetch
  - Tab navigation uses Radix UI components

## Scope
- Fix real-time updates between memory operations and Godmode display
- Remove tabs and make overview items directly clickable
- Consolidate GODMODE/VITE_GODMODE to single environment variable
- Improve mobile UX with instant UI updates

## Risk Assessment
- **Dependencies affected**: 
  - GodModeSection depends on memory-overview and memory-quality-metrics queries
  - MemorySection handles all memory CRUD operations
  - Shared React Query cache between components

- **Potential cascade effects**: 
  - Changing tab navigation affects entire memory browsing UX
  - Query key changes could break other components using same data

- **Cross-domain impacts**: Minimal - contained within memory and monitoring domains

- **WebSocket/HMR stability risks**: None - using existing React Query infrastructure

- **Database migration needs**: None

## Implementation Strategy
- Use React Query's cache invalidation more effectively
- Share query keys between components for automatic updates
- Convert tab navigation to clickable category cards
- Simplify environment variable usage

## Tasks

### Task 1: Fix Godmode real-time updates
- **Problem**: Deleting memories doesn't update Godmode metrics
- **Solution**: Ensure Godmode's queries are invalidated when memory operations occur
- **Files affected**:
  - client/src/components/MemorySection.tsx (lines 287-293, 317-320)
  - client/src/components/GodModeSection.tsx (add query invalidation support)

### Task 2: Fix memory overview refresh after deletion
- **Problem**: Memory overview counts don't update instantly after deletion
- **Solution**: Force immediate refetch of overview data after mutations
- **Files affected**:
  - client/src/components/MemorySection.tsx (lines 258-265, 287-293)

### Task 3: Replace tabs with clickable overview items
- **Problem**: Tab navigation is cumbersome on mobile
- **Solution**: Convert overview cards into clickable filters
- **Files affected**:
  - client/src/components/MemorySection.tsx (lines 531-569, 571-805)
  - Remove Tabs components and implement click handlers on category cards

### Task 4: Consolidate GODMODE environment variables
- **Problem**: Two environment variables for same feature
- **Solution**: Use only VITE_GODMODE everywhere since Vite handles cross-platform
- **Files affected**:
  - shared/config/god-mode.ts (lines 17-29)
  - .env files to remove GODMODE and keep only VITE_GODMODE

## Safety Checks
- [ ] HMR/WebSocket stability preserved
- [ ] No unused code or fallbacks
- [ ] No conflicts between components
- [ ] Production-ready (no TODOs, console.logs)
- [ ] System maps will be updated
- [ ] Dependency annotations added

## Testing Plan
- Delete single memory → verify Godmode metrics update
- Delete bulk memories → verify counts update everywhere
- Click category cards → verify filtering works
- Test on mobile viewport for UX improvements
- Verify VITE_GODMODE works in both dev and production

## Rollback Plan
If something breaks:
1. Revert changes to MemorySection.tsx
2. Restore original tab navigation
3. Re-add GODMODE env variable if needed
4. Clear React Query cache

## Review
[To be filled after completion]
- What worked
- What didn't
- Lessons learned