# commit

**Automated Safe Commit**: Execute a complete commit workflow with multi-layer defense system validation and intelligent commit message generation.

## Purpose
Automate the entire commit process with built-in defense system protection, ensuring no architectural breakage or server startup failures reach the repository.

## What This Command Does

### 1. Pre-Commit CI Pipeline Validation (Automatic)
**Refer to CLAUDE.md Key Commands for CI pipeline**
- Uses `npm run pre-commit` for core validation (ports, imports, TypeScript)
- Can escalate to `npm run ci` or `npm run ci:full` for comprehensive validation

### 2. Git Status Analysis
- Analyze staged and unstaged changes
- Identify affected domains and components
- Check for potential architectural impacts

### 3. Intelligent Commit Message Generation
Based on changes detected:
- **Feature additions**: `feat(domain): add [description]`
- **Bug fixes**: `fix(domain): resolve [issue]` 
- **Refactoring**: `refactor(domain): restructure [component]`
- **Architecture**: `arch: implement [defense/optimization]`
- **Memory system**: `memory: enhance [conversation/processing]`
- **Health data**: `health: improve [data-processing/integration]`

### 4. Automated Git Operations
- Stage relevant untracked files
- Generate appropriate commit message
- Execute commit with defense validation
- Verify commit succeeded

## Usage Examples

**Simple commit** (analyzes changes automatically):
```
/commit
```

**Commit with custom message**:
```  
/commit "Custom commit message"
```

**Emergency commit** (bypasses some checks):
```
/commit --emergency "Critical hotfix"
```

## Defense System Integration

This command ALWAYS runs the full defense system before committing:

### Layer 1: Immediate Prevention
- Port configuration validation
- Import path resolution checking
- TypeScript compilation validation

### Layer 2: Architecture Safety  
- Cross-domain dependency analysis (if memory/health changes detected)
- File size validation (if large files modified)
- UI component integrity (if frontend changes detected)

### Layer 3: Server Startup Protection
- Validates server can start after changes
- Ensures no missing modules or broken imports
- Confirms memory system integrity

## Commit Message Intelligence

### Automatic Detection Patterns:

**Memory System Changes**:
- Files: `*memory*`, `*conversation*`, `*chat*`
- Message: `memory: enhance [specific-improvement]`
- Extra validation: Memory service startup test

**Health Data Changes**:
- Files: `*health*`, `*apple*`, `*google*`, `go-*`
- Message: `health: improve [data-processing/integration]`  
- Extra validation: Health data parser verification

**Architecture Changes**:
- Files: `server/index.ts`, `*.config.*`, `schema.ts`, `system-maps/`
- Message: `arch: implement [infrastructure-change]`
- Extra validation: Full architecture analysis

**UI/Frontend Changes**:
- Files: `client/src/components/`, `*.tsx`, `*.css`
- Message: `ui: enhance [component/feature]`
- Extra validation: UI component analysis

**Defense System Changes**:
- Files: `*defense*`, `*validator*`, `*.hook.*`, `.claude/commands/`
- Message: `defense: strengthen [protection-layer]`
- Extra validation: Defense script testing

## Emergency Protocols

### If Defense System Fails
1. **Show specific failure reason**
2. **Offer fix suggestions**  
3. **Allow emergency bypass** (with warning)
4. **Log bypass for post-incident review**

### If Commit Fails
1. **Analyze failure cause**
2. **Attempt automatic recovery**
3. **Provide manual fix instructions**
4. **Preserve staged changes**

## Integration with Existing Workflows

### With Safe Refactoring (`/safe-refactor`)
- If refactoring was done, commit includes refactoring validation
- Automatic system map updates included in commit

### With Debugging (`/zapper`)  
- If debugging session led to fixes, commit includes bug fix validation
- Runtime error testing included

### With Architecture Changes (`/arch-guard`)
- Comprehensive architecture validation before commit
- Domain boundary verification included

## Advanced Features

### Commit Grouping Intelligence
- **Related changes**: Groups related files into single logical commit
- **Dependency ordering**: Commits dependencies before dependents
- **Atomic commits**: Ensures each commit represents complete, working state

### Rollback Safety
- **Pre-commit backup**: Creates recovery point before any changes
- **Validation checkpoints**: Can rollback to last known good state
- **Change isolation**: Separates risky changes for individual validation

### Multi-File Coordination  
- **Cross-domain impact analysis**: Identifies changes that affect multiple domains
- **Batch validation**: Validates entire changeset as unit
- **Dependency-aware staging**: Stages files in dependency order

## Execution Flow

1. **Defense System Validation** (automatic, no user action needed)
2. **Change Analysis** (identifies domains, impact, type)
3. **Message Generation** (intelligent, contextual)  
4. **Git Operations** (staging, committing, verification)
5. **Post-Commit Validation** (ensures success, no regressions)

## Success Criteria

- ✅ All defense system checks passed
- ✅ Server can start after changes
- ✅ No architectural violations introduced
- ✅ Commit message accurately reflects changes
- ✅ All affected functionality still works

## Error Handling

### Common Scenarios:
- **Port misconfiguration**: Automatically suggests correct port
- **Import resolution failure**: Shows missing files/paths
- **TypeScript errors**: Highlights specific issues
- **Memory system breakage**: Provides memory service recovery steps
- **UI component issues**: Identifies prop/styling problems

Remember: This command prioritizes **safety over speed**. It's better to catch issues now than debug server failures later.