# safe-refactor

**Safe Large File Refactoring**: Carefully refactor large files without breaking functionality or cross-domain dependencies.

## Purpose
Refactor large files using graduated thresholds in the wellness AI app while preserving all functionality and respecting architectural boundaries.

### File Size Thresholds
- **≤300 lines**: ✅ Ideal zone - no action needed
- **300-500 lines**: ⚠️ Review for natural extraction opportunities  
- **500-800 lines**: 🔴 Should be refactored unless strong justification exists
- **>800 lines**: 💀 Critical - almost always needs splitting for AI context efficiency

## Wellness App Safety Protocol

### Pre-Refactoring Validation (MANDATORY)
1. **Run architectural checks**: `node dependency-tracker.js`, `node malformed-import-detector.js`, `npm run check:async`, `npm run check:filesize`
2. **Analyze current file structure**: Map all imports, exports, and dependencies
3. **Test current functionality**: Ensure all features work before changes
4. **Backup current state**: Create git stash or commit point

**Note**: The dependency tracker now generates split dependency maps in `dependency-maps/` instead of one large `dependency-map.json` file. This reduces merge conflicts and improves maintainability.

### Refactoring Strategy

#### 1. Dependency Mapping Phase
- Map all imports (both incoming and outgoing)
- Identify cross-domain dependencies (flag but don't break)
- Document shared types and interfaces
- List all exported functions, components, and types

#### 2. Safe Extraction Identification
Look for these extraction opportunities:
- **Pure utility functions** (no side effects)
- **Type definitions** (can move to shared/types if truly cross-cutting)
- **Constant values** (configuration, default values)
- **Isolated components** (no complex state dependencies)
- **Custom hooks** (if they have clear single responsibilities)

#### 3. Incremental Refactoring Process
**Never extract more than 1-2 items per iteration**

For each extraction:
1. **Create new file** in appropriate domain folder
2. **Move code** with exact same functionality
3. **Update imports** in original file
4. **Validation checks**: 
   - `npm run check` (TypeScript validation)
   - `npm run dev` (verify server starts without errors)
   - `npm run check:async && npm run check:filesize` (architecture validation)
5. **Run tests**: `npx vitest` if tests exist
6. **Test functionality**: Manual verification of affected features
7. **Commit changes**: Small, focused commits

#### 4. Domain-Specific Extraction Rules

**Memory Domain** (`client/src/components/memory/`):
- Extract memory-specific utilities to `client/src/hooks/memory/`
- Keep conversation state management together
- Preserve memory deduplication logic integrity

**Health Domain** (`client/src/components/health/`):
- Extract health data processing to appropriate services
- Maintain Apple Health/Google Fit integration patterns
- Preserve health data privacy boundaries

**Chat Domain** (`client/src/components/chat/`):
- Extract AI streaming logic to hooks
- Maintain SSE and typing simulation integrity
- Preserve multi-AI provider switching logic

**Shared Concerns** (`client/src/shared/`):
- Only extract truly cross-cutting utilities
- Avoid domain-specific logic in shared
- Maintain strict shared folder rules

### Post-Refactoring Validation (MANDATORY)
1. **Run comprehensive validation checks**:
   - `npm run check` (TypeScript validation)
   - `npm run dev` (verify server starts without errors) 
   - `npm run check:async && npm run check:filesize` (architecture validation)
   - `npm run build` (production build verification)
2. **Test all affected features**: Manual verification
3. **Run tests if available**: `npx vitest`
4. **Check component/service limits**: Ensure within bounds
5. **Validate no new cross-domain violations**
6. **Performance check**: Ensure no degradation

## Specific Large File Strategies

### MemorySection.tsx Refactoring  
**Current issues**: 1,853 lines (CRITICAL - 6x over 300-line limit) with mixed concerns
**Safe extraction candidates**:
- Memory list rendering logic → `MemoryList.tsx`
- Memory actions (delete, edit) → `useMemoryActions.ts` hook
- Memory formatting utilities → `memory/utils.ts`
- Memory filtering logic → `useMemoryFilters.ts` hook

**Extraction order** (one per iteration):
1. Extract pure utility functions first
2. Extract custom hooks with clear boundaries
3. Extract UI components with minimal state
4. Refactor remaining core component

### General Large File Patterns
**Files >500 lines (use `npm run check:filesize` to identify) should be examined for**:
- Multiple responsibilities (break into focused components)
- Complex state management (extract to custom hooks)
- Utility functions (move to appropriate utils/)
- Repeated patterns (create reusable components)

## Safety Checklist

Before any refactoring:
- [ ] Current functionality fully working
- [ ] All architectural checks passing
- [ ] `npm run dev` starts without errors
- [ ] No pending changes that could interfere
- [ ] Test plan for affected features defined

During refactoring:
- [ ] Extract only 1-2 items per iteration
- [ ] Run comprehensive validation after each extraction:
  - [ ] `npm run check` (TypeScript)
  - [ ] `npm run dev` (server starts)
  - [ ] `npm run check:async && npm run check:filesize` (architecture)
- [ ] Test functionality after each change
- [ ] Commit small, focused changes

After refactoring:
- [ ] All comprehensive validation checks passing
- [ ] All original functionality preserved
- [ ] `npm run build` succeeds
- [ ] No new cross-domain violations
- [ ] Performance maintained or improved
- [ ] Component/service limits respected

## Emergency Rollback
If any issues arise:
1. **Immediately stop refactoring**
2. **Run git stash** or **git reset** to previous working state
3. **Verify functionality restored**
4. **Analyze what went wrong** before attempting again

## Integration with Existing Tools
- **Before refactoring**: Always run `node dependency-tracker.js` and `npm run check:filesize` to identify oversized files
- **After changes**: Run `node system-map-tracker.js` to update documentation  
- **Continuous validation**: Use `npm run check:async` for async compatibility
- **File size monitoring**: Use `npm run check:filesize` to track progress and ensure extractions stay within limits

## Success Criteria
- Original functionality 100% preserved
- File sizes within appropriate thresholds (ideally <500 lines, definitely <800 lines)
- Zero new architectural violations
- Improved maintainability and readability
- Faster development velocity for future changes

## When NOT to Refactor
- File is <200 lines and well-organized
- High-risk core system components during active development
- Files with complex state that would be risky to split
- When there are failing tests or architectural violations

Remember: **Safety first, improvement second**. Never sacrifice functionality for organization.