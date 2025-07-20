# Claude Commands for Replit

This system replicates the Claude Code slash command functionality (like `$/workit`) in Replit, allowing you to execute the same development workflows and checks.

## Quick Start

```bash
# Show all available commands
./claude.sh --help

# Run architecture checks (like $/arch-guard in Claude Code)
./claude.sh arch-guard

# Start production-ready development mode (like $/workit in Claude Code)
./claude.sh workit

# Check code quality and limits (like $/clean-code in Claude Code)
./claude.sh clean-code

# Analyze large files for refactoring (like $/safe-refactor in Claude Code)
./claude.sh safe-refactor
```

## How It Works

The system bridges your existing `.claude/commands/*.md` files with executable scripts that run the actual analysis tools:

1. **Command Parser**: `claude-commands.js` reads the `.claude/commands/` directory
2. **Execution Engine**: Runs the appropriate analysis scripts based on the command
3. **Integration**: Connects with existing tools like `dependency-tracker.js`, `file-size-analyzer.js`, etc.
4. **Bash Wrapper**: `claude.sh` provides easy command-line access

## Available Commands

### Development Commands
- **arch-guard** - Comprehensive architecture health checks
  - Runs dependency analysis, file size check, import validation
  - Enforces component/service limits (25/20 respectively)
  - Validates domain boundaries

- **workit** - Production-ready development mode
  - Pre-execution validation checks
  - Development principles reminder
  - Architecture validation before coding

- **clean-code** - Code quality validation
  - Component and service count checking
  - Domain placement validation
  - Import rule enforcement

- **safe-refactor** - Large file refactoring guidance
  - File size analysis with graduated thresholds
  - Refactoring safety protocols
  - Step-by-step extraction guidance

### Documentation Commands
- **chew** - Deep analysis mode (access to documentation)
- **ultra-think** - Maximum analysis mode (access to documentation)
- **zapper** - Quick problem resolution (access to documentation)
- **mobile-ux** - Mobile-first development (access to documentation)

## Integration with Existing Scripts

The commands automatically execute your existing analysis tools:

- `npm run check:filesize` - File size analysis with thresholds
- `npm run check:async` - Async/await compatibility checking
- `node dependency-tracker.js` - Cross-domain dependency analysis
- `node malformed-import-detector.js` - Import syntax validation
- `npm run check` - TypeScript validation

## File Size Thresholds

The system enforces graduated file size limits:

- **Routes**: 300 lines max
- **Components**: 300 lines max
- **Services**: 200 lines max
- **General files**: 500 lines max

**Severity Levels**:
- 🟢 ≤ limit: Ideal zone
- 🟡 1-2x over: Review needed
- 🟠 2-3x over: Should refactor
- 🔴 3x+ over: Critical

## Domain Architecture Enforcement

The commands enforce strict domain separation:

- `health/` - Health data, reports, medical info
- `memory/` - Chat memory, conversation state
- `chat/` - Chat interface, messaging
- `settings/` - User preferences, config
- `file-manager/` - File upload, management
- `home/` - Landing page, dashboard
- `auth/` - Authentication, login, signup
- `shared/` - ONLY cross-cutting utilities

## Usage in Development Workflow

1. **Before starting work**: `./claude.sh arch-guard`
2. **During development**: `./claude.sh workit`
3. **Before refactoring**: `./claude.sh safe-refactor`
4. **Before committing**: `./claude.sh clean-code`

## Alternative Execution Methods

```bash
# Direct node execution
node claude-commands.js arch-guard

# Bash wrapper (recommended)
./claude.sh arch-guard

# Alternative bash syntax
bash claude.sh arch-guard
```

## Exit Codes

- **0**: Success, all checks passed
- **1**: Failures detected, review output for details

This system brings the power of Claude Code's development commands directly to your Replit environment, maintaining the same workflow and quality standards.