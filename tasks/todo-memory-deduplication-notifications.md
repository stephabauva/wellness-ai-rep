# Todo: Memory Deduplication Notification System

## Context & Investigation

### Current State Analysis
**Defense System Status**: ✅ All validation passed
- Port configuration: Valid (minor Go service warnings)
- Import validation: Clean (no malformed imports) 
- TypeScript compilation: 1 minor error in server/vite.ts (unrelated)
- Cross-domain dependencies: 2 acceptable violations
- UI components: 5 low-severity error handling issues
- File sizes: 42 oversized files (all low severity)

**Memory System Architecture**:
- **Deduplication Logic**: Already exists in `shared/services/memory/deduplication-helpers.ts`
- **Similarity Detection**: Uses semantic embeddings + fuzzy matching (threshold: 0.3)
- **Current Flow**: `MemoryForm.tsx` → `useMemoryActions.ts` → `/api/memories/manual` → background deduplication
- **Notification System**: Uses `shared/components/ui/use-toast.ts` with title/description/actions support
- **System Map**: `.system-maps/json-system-maps/memory/memory-deduplication.feature.json` (no UI notification documented)

**Dependencies Identified**:
- `findSimilarMemory()` function in `deduplication-helpers.ts` (line 34-117)
- `createManualMemoryMutation` in `useMemoryActions.ts` (line 33-114)
- Toast system integration already established
- Memory form submission flow in `MemoryForm.tsx` (line 160: `handleFormSubmit`)

## Scope

**Brief Description**: Add user-facing duplicate detection notification when creating memories, allowing users to review similar memories and choose which to keep/discard.

**Technical Context**: Enhance the existing memory creation flow to show duplicate detection UI before saving, integrating with the established deduplication system.

**Affected Domains**: 
- `memory/` (primary)
- `shared/services/` (deduplication logic enhancement)
- `shared/components/ui/` (toast notification system)

## Risk Assessment

### Dependencies Affected
- **@used-by annotations found**:
  - `memory/MemorySection` uses `useMemoryActions.ts`
  - `deduplication-helpers.ts` used by `chatgpt-memory-enhancement.ts`
  - Toast system used across 66+ files

### Potential Cascade Effects
- **LOW RISK**: Changes are additive to existing memory creation flow
- **MEDIUM RISK**: New API endpoint required for duplicate detection preview
- **UI Performance**: Additional similarity calculation before submission

### Cross-Domain Impacts
- **Memory Service**: Enhanced to return similar memories for user review
- **UI Components**: New deduplication notification component
- **API Routes**: New endpoint for duplicate detection preview

### WebSocket/HMR Stability
- **NO RISK**: Changes don't affect WebSocket handling or build systems
- **NO VITE CHANGES**: Respects Replit constraints

### Database Migration Needs
- **NO MIGRATIONS**: Uses existing memory tables and deduplication logic

## Implementation Strategy

### Approach Selection Rationale
**Chosen**: Modal-based notification with memory comparison UI
- **Why**: Fits existing toast pattern, non-intrusive, allows detailed comparison
- **Alternative rejected**: Inline warnings (less detailed review)
- **Alternative rejected**: Sidebar notification (layout complexity)

### Integration Points
1. **Memory Form Submission**: Intercept before API call
2. **Deduplication Service**: Expose similar memory detection 
3. **Toast System**: Custom action toast for user decisions
4. **Memory API**: New preview endpoint for duplicate detection

## Tasks

### [x]Task 1: Create Duplicate Detection API Endpoint
- **Problem**: Need to detect duplicates before saving memory
- **Solution**: New `/api/memories/check-duplicates` endpoint using existing deduplication logic
- **Files affected**:
  - `server/routes/memory-routes.ts` (line ~80, new endpoint)
  - `shared/services/memory/deduplication-helpers.ts` (export existing `findSimilarMemory`)

### [x]Task 2: Enhance Memory Form with Duplicate Detection
- **Problem**: Current form submits directly without duplicate checking
- **Solution**: Add intermediate step to check duplicates before submission
- **Files affected**:
  - `client/src/components/memory/MemoryForm.tsx` (line 160: modify `handleFormSubmit`)
  - `client/src/hooks/memory/useMemoryActions.ts` (line 34: add duplicate check mutation)

### Task 3: Create Duplicate Notification Component
- **Problem**: Need UI to show similar memories and allow user choice
- **Solution**: New toast-based notification with memory comparison and action buttons
- **Files affected**:
  - `client/src/components/memory/DuplicateMemoryNotification.tsx` (new file)
  - `shared/components/ui/toast.tsx` (enhance to support complex content)

### Task 4: Update Memory Service Integration
- **Problem**: Backend deduplication needs to be accessible to frontend
- **Solution**: Modify deduplication helpers to support preview mode
- **Files affected**:
  - `shared/services/memory/deduplication-helpers.ts` (line 34: modify `findSimilarMemory` for preview)
  - `shared/services/memory-service.ts` (add preview duplicate detection method)

### Task 5: Update System Maps and Documentation
- **Problem**: New feature needs proper documentation in system maps
- **Solution**: Update memory deduplication feature map to include UI notification flow
- **Files affected**:
  - `.system-maps/json-system-maps/memory/memory-deduplication.feature.json`
  - `dependency-maps/memory-domain-dependencies.json` (dependency tracker output)

## Safety Checks
- [ ] HMR/WebSocket stability preserved (no vite.config changes)
- [ ] No unused code or fallbacks (clean implementation)
- [ ] No conflicts between components (uses existing toast system)
- [ ] Production-ready (no TODOs, proper error handling)
- [ ] System maps updated with new UI notification flow
- [ ] Dependency annotations added (@used-by comments)

## Testing Plan

### Unit Tests Needed
- `DuplicateMemoryNotification.tsx`: Component rendering and user interactions
- `/api/memories/check-duplicates`: Endpoint response validation
- `useMemoryActions.ts`: Enhanced duplicate detection mutation

### Integration Tests Required
- Full memory creation flow with duplicate detection
- Toast notification interactions (keep/discard/cancel actions)
- API integration between frontend duplicate check and backend deduplication logic

### Manual Testing Checklist
- [ ] Create memory with no duplicates (normal flow)
- [ ] Create memory with 1 similar memory (notification appears)
- [ ] Create memory with multiple similar memories (list display)
- [ ] Choose to keep new memory (discards similar ones)
- [ ] Choose to keep existing memory (cancels creation)
- [ ] Cancel duplicate notification (returns to form)
- [ ] Performance: duplicate check completes within 200ms
- [ ] Mobile responsiveness of duplicate notification

### Performance Impact Verification
- Measure duplicate detection API response time (target: <200ms)
- Memory creation flow latency with duplicate checking
- Toast notification rendering performance

## Rollback Plan

### If Duplicate Detection Breaks Memory Creation
1. **Immediate**: Feature flag to disable duplicate checking in `memory-feature-flags.ts`
2. **API Fallback**: Return empty duplicate array if detection fails
3. **UI Graceful Degradation**: Skip duplicate notification, proceed with normal creation

### Dependencies to Check
- Memory service initialization (ensure no startup issues)
- Toast system stability (verify no notification conflicts)
- Memory form submission flow (ensure fallback to original behavior)

### Recovery Steps
1. Revert `MemoryForm.tsx` to direct submission
2. Remove duplicate detection API endpoint  
3. Restore original `useMemoryActions.ts` mutation
4. Update system maps to remove UI notification flow

## Review
[To be filled after completion]

### Architecture Notes
- Uses existing deduplication logic (no redundancy)
- Integrates with established toast notification system
- Follows memory domain boundaries (no cross-domain violations)
- Respects file size limits (new component <300 lines)
- Maintains singleton pattern for deduplication service

### Performance Considerations
- Duplicate detection runs before memory creation (adds latency)
- Similarity calculations cached for performance
- Batch processing for multiple potential duplicates
- Graceful degradation if detection times out

### User Experience Impact
- **Positive**: Prevents unintentional duplicate memories
- **Positive**: Users have control over memory management decisions  
- **Consideration**: Additional step in memory creation workflow
- **Mitigation**: Skip notification if no duplicates found (seamless flow)