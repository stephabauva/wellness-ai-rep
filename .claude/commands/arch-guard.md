# Architecture Guardian

Guards against architectural drift and maintains clean code boundaries.

## Auto-Execution by Claude AI
**Claude automatically runs these checks before any code implementation:**
- Before creating new components/services
- Before adding features
- When asked to implement functionality
- Comprehensive component analysis (npm run check:all) including UI, visual, integration, async, and filesize checks
- Browser console error detection for runtime issues
- Frontend UI component validation for prop mismatches and rendering problems with severity escalation
- Visual regression detection for component rendering and layout issues
- Integration test analysis for user interaction flows and missing test coverage

## Manual Usage
```bash
claude arch-guard
```

## What it does
This command runs a comprehensive architectural health check:

1. **Dependency Analysis**: Checks cross-domain violations
2. **Component Count**: Warns if approaching limits (25 components)
3. **Service Count**: Warns if approaching limits (20 services)
4. **Import Malformation**: Detects broken imports
5. **File Size Analysis**: Enforces graduated thresholds (see safe-refactor.md for details)
6. **Domain Boundary Check**: Ensures proper separation
7. **Browser Console Error Detection**: Scans for runtime error patterns and generates browser tests
8. **Frontend UI Component Validation**: Detects component prop mismatches, missing required props, and styling issues with severity escalation for critical user flows
9. **Visual Regression Detection**: Tests component rendering, modal visibility, z-index conflicts, and layout issues
10. **Integration Test Analysis**: Generates user interaction tests and identifies missing test coverage for critical flows

## When to run
- Before starting any new feature
- Before creating new components/services
- Weekly as part of maintenance
- Before major releases

## Guardrails enforced
- Max 25 UI components total
- Max 20 server services total
- Zero cross-domain violations
- Proper domain separation
- Clean import statements
- File size thresholds: Review >500 lines, refactor >800 lines (see safe-refactor.md)

## Quick fixes suggested
- Consolidate similar components
- Merge single-method services
- Move domain-specific code to proper domain
- Fix malformed imports
- Split oversized files into smaller, focused modules
- Fix component prop mismatches and missing required props
- Replace problematic shared Dialog components with custom implementations
- Fix visual regression issues (modal visibility, z-index conflicts, layout problems)
- Add missing integration tests for critical user flows (upload, login, delete operations)
- Add data-testid attributes for automated testing

Run this before any significant code changes to maintain architectural integrity.