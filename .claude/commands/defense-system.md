# defense-system

**Multi-Layer Defense System**: Prevent architectural breakage and server downtime through comprehensive validation layers.

## Purpose
Implement the multi-layer defense system to prevent import crises, port configuration issues, and server startup failures that can bring down the entire wellness AI application.

## Defense Layers

### Layer 1: Pre-Commit Hooks (Immediate Prevention)
**Command**: `npm run pre-commit`
- **Port validation**: `npm run check:ports` - Ensures all ports are configured to 5000
- **Import validation**: `npm run check:imports` - Validates all import paths resolve correctly
- **TypeScript validation**: `npm run check` - Catches type errors before commit

### Layer 2: Comprehensive Architecture Validation
**Command**: `npm run safe-refactor` 
- **Dependency analysis**: `npm run check:dependencies` - Maps cross-domain dependencies
- **Full architecture checks**: `npm run check:all` - UI, visual, integration, async, filesize validation

### Layer 3: Runtime Error Prevention
**Individual Commands**:
- `node browser-console-error-detector.cjs` - Detect runtime browser console errors
- `node malformed-import-detector.js` - Advanced import syntax validation
- `node system-map-tracker.js` - Validate system documentation is current

## When to Use Each Layer

### Before ANY Memory System Changes (Mandatory Safety Sequence)
```bash
npm run pre-commit          # Layer 1: Immediate validation
npm run safe-refactor       # Layer 2: Architecture validation  
npm run dev                 # Verify server startup
```

### Before Major Refactoring
```bash
npm run safe-refactor       # Full dependency and architecture analysis
node system-map-tracker.js  # Ensure documentation is current
npm run build              # Production build verification
```

### Daily Development Workflow
```bash
npm run pre-commit         # Before any commit
npm run check:ports        # If touching server configuration
npm run check:imports      # If moving/renaming files
```

## Critical Protection Areas

### Memory System Integrity
- **Conversation continuity**: Never deploy memory changes without backward compatibility
- **Deduplication logic**: Validate memory service survives refactoring
- **AI provider reliability**: Ensure AI streaming remains functional

### Server Startup Protection  
- **Port consistency**: All services must use correct ports (main: 5000, go services: 5001)
- **Import resolution**: All imports must resolve before server can start
- **Module dependencies**: Service initialization must not fail due to missing modules

### Health Data Processing Reliability
- **Zero data loss**: Health processing must remain functional through refactors
- **Integration stability**: Apple Health/Google Fit parsers must survive changes
- **Background processing**: Go service integrations must remain stable

## Emergency Response Protocol

### If Server Won't Start
1. **Immediate**: `npm run check:imports` - Check for import issues
2. **Next**: `npm run check:ports` - Verify port configuration
3. **Then**: `npm run check` - TypeScript compilation errors
4. **Finally**: Check recent git changes for architectural modifications

### If Features Break After Refactoring
1. **Stop immediately** - Don't continue refactoring
2. **Git rollback**: `git stash` or `git reset` to last working state
3. **Run full validation**: `npm run safe-refactor`  
4. **Analyze**: What validation step was skipped?
5. **Re-approach**: Follow defense system protocol completely

## Integration with Git Workflow

### Branch Protection Rules
- Require `npm run pre-commit` passes before PR merge
- Mandate server startup test in CI/CD pipeline  
- Two-person approval for memory system architectural changes

### Commit Message Standards
For changes that affect system architecture:
```
type(scope): description

- Ran pre-commit validation: ✅
- Architecture checks passed: ✅
- Server startup verified: ✅
```

## Defense System Maintenance

### Weekly Health Checks
- `npm run safe-refactor` on main branch
- `npm run check:all` comprehensive validation
- Review and update system maps if needed

### After Major Dependencies Changes
- Re-run full defense suite
- Verify no new cross-domain violations
- Update documentation if patterns change

## Success Metrics

### Zero-Downtime Refactoring
- Server startup never breaks due to import issues
- Memory system integrity preserved through all changes
- Development team can refactor confidently

### Automated Detection
- Import issues caught before reaching main branch
- Port misconfigurations prevented at commit time
- Runtime errors detected before production

### Developer Confidence
- Clear process for safe architectural changes
- Predictable validation steps
- Fast feedback loops (validation <5 seconds)

## Red Flags - When Defense System Failed

### Symptoms
- `npm run dev` fails with import errors
- Server starts but features don't work
- Memory system loses conversation history
- Health data processing stops working

### Root Cause Analysis
1. Which validation step was skipped?
2. Was the defense system command used correctly?
3. Are there gaps in our validation coverage?
4. Need to enhance existing defense scripts?

## Commands Quick Reference

**Daily Development**:
- `npm run pre-commit` - Before any commit
- `npm run check:ports` - Port configuration validation
- `npm run check:imports` - Import path validation

**Before Refactoring**:
- `npm run safe-refactor` - Full architecture analysis
- `npm run dev` - Server startup verification
- `npm run build` - Production build check

**Emergency Diagnostics**:
- `node malformed-import-detector.js` - Advanced import analysis
- `node browser-console-error-detector.cjs` - Runtime error detection
- `node system-map-tracker.js` - Documentation validation

Remember: **Prevention is cheaper than recovery**. Always use the defense system - it takes 30 seconds and can save hours of debugging.