# Claude Code Hooks for Wellness AI

This directory contains Claude Code hooks that integrate with the wellness AI application's multi-layer defense system and specialized subagents.

## Hook Files

### Core Hooks
- `pre-edit-defense.sh` - Validates file edits before execution
- `post-edit-validation.sh` - Runs validation after file modifications
- `bash-validator.py` - Validates bash commands and suggests improvements
- `session-validator.sh` - Ensures system integrity at session end

### Enhancement Hooks
- `prompt-enhancer.py` - Adds relevant context to user prompts
- `subagent-validator.py` - Validates subagent selection for tasks
- `subagent-completion.py` - Suggests follow-up actions after subagent tasks

## Integration with Multi-Layer Defense System

The hooks automatically integrate with your existing validation commands:

### Layer 1: Pre-commit Validation
- `npm run check:ports` - Port conflict detection
- `npm run check:imports` - Import statement validation
- `npm run check` - TypeScript compilation

### Layer 2: Architecture Defense
- `npm run check:dependencies` - Cross-domain dependency analysis
- `npm run check:all` - Comprehensive component checks
- `npm run validate:functional` - Functional validation suite

### Layer 3: Runtime Validation
- `npm run validate:quick` - Quick health check
- `npm run validate:memory` - Memory system validation
- `npm run validate:data` - Health data validation

## Subagent Integration

The hooks enhance your specialized subagents:

- **memory-system-specialist**: Auto-validates memory changes
- **health-data-validator**: Validates health data operations
- **mobile-ui-optimizer**: UI component validation
- **go-microservice-expert**: Go service validation
- **ci-pipeline-auditor**: CI/CD pipeline checks
- **wellness-domain-architect**: Domain boundary enforcement
- **multi-layer-defense-auditor**: Automated defense protocols

## Benefits

1. **Automatic Validation**: Runs defense checks before critical operations
2. **Context Enhancement**: Adds relevant app context to prompts
3. **Smart Suggestions**: Recommends appropriate subagents for tasks
4. **Error Prevention**: Blocks dangerous operations before execution
5. **Follow-up Guidance**: Suggests validation steps after completion

## Configuration

Hooks are configured in `.claude/settings.json` and activate automatically when you use Claude Code with this project.

For more information on Claude Code hooks, see: https://docs.anthropic.com/en/docs/claude-code/hooks-guide