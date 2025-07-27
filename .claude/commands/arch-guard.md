# Architecture Guardian (DEFENSE-SYSTEM INTEGRATED)

Guards against architectural drift and maintains clean code boundaries with multi-layer defense system protection.

## Auto-Execution by Claude AI (DEFENSE-SYSTEM POWERED)
**🛡️ Claude automatically runs full defense system before any code implementation - no manual intervention needed!**

**Multi-Layer Defense System (via CI Pipeline):**
- **Layer 1**: `npm run ci` includes pre-commit validation (ports + imports + TypeScript)
- **Layer 2**: `npm run ci:full` includes safe-refactor validation (dependencies + architecture)  
- **Layer 3**: Individual validation tools for runtime error detection

**Auto-triggered:**
- Before creating new components/services
- Before adding features
- When asked to implement functionality  
- Before any architectural changes
- After any significant modifications

**CI Pipeline implements Defense System:**
- `npm run ci:full` - Complete multi-layer defense activation
- `npm run ci` - Core defense layers for normal development
- See CLAUDE.md Key Commands and defense-system.md for details

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

## When to run (AUTO-DEFENSE INTEGRATED)
**🛡️ Runs automatically with full defense system validation!**

- **Auto-triggered** before starting any new feature (with pre-commit validation)
- **Auto-triggered** before creating new components/services (with architecture analysis)  
- **Auto-scheduled** weekly as part of maintenance (with comprehensive checks)
- **Auto-triggered** before major releases (with production build verification)
- **Auto-commit** after successful validation passes (with /commit integration)

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