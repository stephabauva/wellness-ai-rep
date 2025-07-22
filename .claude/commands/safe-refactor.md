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

### Pre-Refactoring Validation (AUTOMATIC - Multi-Layer Defense System)

**🛡️ This command AUTOMATICALLY runs all defense system checks - no manual intervention needed!**

1. **Auto-execute defense validation**:
   ```bash
   # Runs automatically when you use /safe-refactor:
   npm run pre-commit        # Ports + imports + TypeScript  
   npm run safe-refactor     # Dependencies + architecture + functional validation
   npm run dev --validate    # Server startup verification
   ```

2. **Functional validation** (prevents stub implementation issues):
   ```bash
   npm run validate:quick    # Quick functional health check
   npm run validate:db       # Database connectivity validation  
   npm run validate:data     # Service method validation (catch stub methods)
   npm run validate:memory   # API endpoint validation
   ```

3. **Analyze current file structure**: Map all imports, exports, and dependencies (automatic)
4. **Test current functionality**: Validate all features work before changes (automatic)
5. **Create backup state**: Auto-stash current state as recovery point

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

#### 3. Incremental Refactoring Process (FULLY AUTOMATED)
**Never extract more than 1-2 items per iteration - fully automated with defense system**

For each extraction (ALL AUTOMATIC):
1. **Create new file** in appropriate domain folder
2. **Move code** with exact same functionality
3. **Update imports** in original file
4. **Auto-validation sequence** (runs automatically): 
   - Defense system validation (ports, imports, TypeScript)
   - Functional validation (database connectivity, service methods, API endpoints)
   - Server startup verification
   - Architecture integrity check
   - Runtime error detection
   - UI component validation
5. **Auto-test execution**: Runs available tests automatically
6. **Auto-commit**: Creates focused commit with intelligent message
7. **Rollback on failure**: Auto-restores previous state if any step fails

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

### Post-Refactoring Validation (FULLY AUTOMATIC)

**🛡️ All validation runs automatically - comprehensive defense system activation!**

1. **Auto-comprehensive validation** (runs automatically):
   - Defense system full sweep (ports, imports, TypeScript, dependencies)
   - Server startup verification with health check
   - Architecture integrity validation  
   - Runtime error detection and browser console analysis
   - UI component integrity verification
   - System documentation auto-update
   - Production build verification
2. **Auto-feature testing**: Validates all affected functionality automatically
3. **Auto-test execution**: Runs full test suite if available
4. **Auto-limit validation**: Verifies component/service limits automatically
5. **Auto-boundary validation**: Checks for cross-domain violations
6. **Auto-performance check**: Validates no degradation occurred
7. **Auto-final commit**: Creates comprehensive commit with /commit integration

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
  - [ ] `node browser-console-error-detector.cjs` (runtime errors)
  - [ ] `node frontend-ui-monitor.cjs` (UI component validation)
- [ ] Test functionality after each change
- [ ] Commit small, focused changes

After refactoring:
- [ ] All comprehensive validation checks passing:
  - [ ] `npm run check` (TypeScript)
  - [ ] `npm run dev` (server starts)
  - [ ] `npm run check:async && npm run check:filesize` (architecture)
  - [ ] `node browser-console-error-detector.cjs` (runtime errors)
  - [ ] `node frontend-ui-monitor.cjs` (UI components)
  - [ ] `node system-map-tracker.js` (documentation updated)
  - [ ] `npm run build` (production build)
- [ ] All original functionality preserved
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
- **Before refactoring**: Always run comprehensive validation suite:
  - `node dependency-tracker.js` (dependency analysis)
  - `npm run check:filesize` (identify oversized files)
  - `node browser-console-error-detector.cjs` (baseline runtime errors)
  - `node frontend-ui-monitor.cjs` (UI component health check)
- **During refactoring**: Continuous validation at each step
- **After changes**: Complete validation suite including:
  - `node system-map-tracker.js` (update documentation)
  - All validation scripts to ensure no regressions
- **Monitoring**: 
  - `npm run check:async` for async compatibility
  - `npm run check:filesize` to track progress and ensure extractions stay within limits
  - Runtime error monitoring with browser console detector
  - UI component integrity with frontend UI monitor

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