# Architecture Guardian

Guards against architectural drift and maintains clean code boundaries.

## Auto-Execution by Claude AI
**Claude automatically runs these checks before any code implementation:**
- Before creating new components/services
- Before adding features
- When asked to implement functionality

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
5. **Domain Boundary Check**: Ensures proper separation

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

## Quick fixes suggested
- Consolidate similar components
- Merge single-method services
- Move domain-specific code to proper domain
- Fix malformed imports

Run this before any significant code changes to maintain architectural integrity.