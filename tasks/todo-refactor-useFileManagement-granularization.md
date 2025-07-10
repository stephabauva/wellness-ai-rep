# Todo: Refactor useFileManagement Hook Granularization

## Scope
Refactor the monolithic `useFileManagement` hook into smaller, focused functions to improve dependency tracking, reduce bundle size, and enable precise impact analysis. This affects chat domain's core file attachment functionality.

## Technical Context
- **Current**: Single hook with 6 functions (upload, state, remove, clear, handle)
- **Target**: Split into 3-4 focused hooks with specific responsibilities
- **Risk**: Chat domain heavily depends on this hook for file attachments
- **Cross-domain impact**: Used by chat/ChatInputArea, chat/MessageDisplayArea, shared/App

## Risk Assessment
### Dependencies Affected
- **High Risk**: `client/src/components/ChatInputArea.tsx` - Core file upload UI
- **High Risk**: `client/src/components/ChatSection.tsx` - Main chat interface
- **Medium Risk**: `client/src/components/MessageDisplayArea.tsx` - File display
- **Low Risk**: Any future consumers via shared/App

### Potential Conflicts
- State management changes could break file attachment display
- Upload mutation changes could break chat file uploads
- Query invalidation changes could cause stale data in file manager
- Retention logic changes could affect file lifecycle

## Tasks

### Phase 1: Analysis & Preparation
- [ ] **1.1: Run comprehensive dependency analysis**
  - Execute `node dependency-tracker.js` to map exact usage
  - Use `grep -r "useFileManagement\|uploadFileMutation\|attachedFiles" client/src/` to find all references
  - Document which functions each consumer actually uses

- [ ] **1.2: Create test coverage baseline**
  - Run `npm test -- --testPathPattern=chat` to ensure existing tests pass
  - Verify manual testing of file upload/attachment flow works
  - Document expected behavior for regression testing

- [ ] **1.3: Design granular hook structure**
  - `useFileUpload()` - Upload mutation and handling
  - `useAttachedFiles()` - State management for attached files
  - `useFileActions()` - Remove, clear operations
  - Define interfaces and shared state patterns

### Phase 2: Implementation (Backward Compatible)
- [ ] **2.1: Create new granular hooks alongside existing**
  - Implement `useFileUpload` with upload mutation logic
  - Implement `useAttachedFiles` with state and query invalidation
  - Implement `useFileActions` with remove/clear operations
  - Keep original `useFileManagement` unchanged

- [ ] **2.2: Add comprehensive @used-by annotations**
  - Annotate each new hook with specific domain usage
  - Include behavioral notes about chat-specific logic
  - Document cross-domain implications

- [ ] **2.3: Test new hooks in isolation**
  - Create unit tests for each granular hook
  - Verify state sharing works correctly between hooks
  - Test query invalidation still works

### Phase 3: Migration (One Consumer at a Time)
- [ ] **3.1: Migrate ChatInputArea.tsx**
  - Replace `useFileManagement` with specific hooks needed
  - Test file upload functionality thoroughly
  - Verify toast notifications and error handling work
  - Run full chat flow testing

- [ ] **3.2: Migrate MessageDisplayArea.tsx** 
  - Update to use appropriate granular hooks
  - Test file display and removal functionality
  - Verify attached files render correctly

- [ ] **3.3: Migrate ChatSection.tsx**
  - Update main chat interface integration
  - Test complete file attachment workflow
  - Verify no regressions in chat functionality

### Phase 4: Cleanup & Validation
- [ ] **4.1: Remove deprecated useFileManagement hook**
  - Ensure no remaining references exist
  - Remove from exports
  - Update any remaining imports

- [ ] **4.2: Run comprehensive validation**
  - Execute `node dependency-tracker.js` to verify new structure
  - Run `npm run build` to check for build issues
  - Run full test suite: `npm test`
  - Manual end-to-end testing of chat file attachments

- [ ] **4.3: Update system maps and documentation**
  - Run `node system-map-tracker.js` to update maps
  - Update CLAUDE.md if needed
  - Document new hook patterns for future development

## Safety Checks
- [ ] **Pre-commit validation**: Use dependency-check-hook.js before each commit
- [ ] **HMR/WebSocket stability preserved**: Verify dev server still works
- [ ] **No unused code**: Ensure all new hooks are properly used
- [ ] **No conflicts**: Check that granular hooks don't interfere with each other
- [ ] **Production-ready**: All code fully functional, no fallbacks needed

## Rollback Plan
If issues arise:
1. **Immediate**: Revert to previous commit using `git revert`
2. **Phase rollback**: Keep old hook alongside new ones during transition
3. **Emergency**: Use `git reset --hard` to previous working state

## Success Criteria
- [ ] Chat file attachments work identically to before
- [ ] Dependency tracker shows precise usage patterns
- [ ] Bundle size reduced for consumers using only specific functions
- [ ] @used-by annotations provide clear cross-domain visibility
- [ ] No regressions in any chat functionality
- [ ] All tests pass
- [ ] System maps accurately reflect new structure

## Review
[To be filled after completion]