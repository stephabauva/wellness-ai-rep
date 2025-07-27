# CI-Integrated Command Template

Use this template when creating new .claude commands that need CI validation.

## Command Structure

```markdown
# [command-name].md

## Purpose
Brief description of what this command does.

## CI Pipeline Integration
**🛡️ Use CLAUDE.md CI pipeline for validation**

### Pre-Execution Validation
- Run `npm run ci` for core validation before starting
- Use `npm run ci:full` for comprehensive validation when needed

### During Execution
- Use `npm run ci:local` for interactive validation during development
- Run targeted tests with `npx vitest [file]` for specific validation

### Post-Execution Validation
- Run appropriate CI command based on scope of changes:
  - `npm run ci` for basic changes
  - `npm run ci:full` for comprehensive changes
- Use `/commit` command which includes CI validation

## Execution Steps
1. [Step 1 with CI validation reference]
2. [Step 2 with CI validation reference]
3. [etc...]

## Integration Points
- **TodoWrite**: Use for task tracking
- **CI Pipeline**: Reference CLAUDE.md Key Commands
- **System Maps**: Update when architecture changes
- **Commit**: Use `/commit` for CI-validated commits

## Safety Checks
- [ ] CI validation passed
- [ ] No architectural violations
- [ ] System maps updated if needed
- [ ] Proper domain boundaries maintained

## References
- CLAUDE.md Key Commands for CI pipeline
- Existing .claude commands for patterns
```

## Key Principles

1. **No CI Command Duplication**: Always reference CLAUDE.md instead of repeating commands
2. **Progressive Validation**: Use different CI commands based on change scope
3. **Integration Points**: Always mention TodoWrite, /commit, and system maps
4. **Safety First**: Include safety checks and rollback procedures

## Common CI Command Usage

- `npm run ci:local` - Interactive validation during development
- `npm run ci` - Core validation for normal changes
- `npm run ci:full` - Comprehensive validation for major changes
- `npm run ci:with-tests` - When tests are critical
- `/commit` - Always use for CI-validated commits