# Claude Code Slash Commands for Replit - Usage Guide

This system replicates the Claude Code editor's slash command functionality (like `$/workit`, `$/arch-guard`) in the Replit environment.

## Quick Start

### Method 1: Direct Slash Commands (Recommended)
```bash
./run-slash-command.sh "/arch-guard"
./run-slash-command.sh "/workit"
./run-slash-command.sh "/clean-code"
./run-slash-command.sh "/safe-refactor analyze large files"
```

### Method 2: Individual Scripts
```bash
./slash-commands/arch-guard
./slash-commands/workit
./slash-commands/clean-code
```

### Method 3: Shell Aliases (For Repeated Use)
```bash
# Load aliases in your shell session
source ./claude-code-aliases.sh

# Use simplified commands
arch-guard
workit  
clean-code
safe-refactor
```

## Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/arch-guard` | Run comprehensive architecture health checks | `./run-slash-command.sh "/arch-guard"` |
| `/workit` | Production-ready development mode | `./run-slash-command.sh "/workit"` |
| `/clean-code` | Clean code checklist validation | `./run-slash-command.sh "/clean-code"` |
| `/safe-refactor` | Safe large file refactoring guidance | `./run-slash-command.sh "/safe-refactor"` |
| `/chew` | Deep analysis mode | `./run-slash-command.sh "/chew"` |
| `/ultra-think` | Maximum analysis mode | `./run-slash-command.sh "/ultra-think"` |
| `/zapper` | Quick problem resolution | `./run-slash-command.sh "/zapper"` |
| `/mobile-ux` | Mobile-first development | `./run-slash-command.sh "/mobile-ux"` |

## Examples

### Architecture Guardian
```bash
# Run complete architecture health check
./run-slash-command.sh "/arch-guard"

# Output includes:
# - Dependency analysis
# - File size analysis  
# - TypeScript validation
# - Domain boundary checks
```

### Work It Mode
```bash
# Start production-ready development
./run-slash-command.sh "/workit"

# Shows development principles and reminders
# Validates architecture before development
```

### With Prompts
```bash
# Add custom prompts to commands
./run-slash-command.sh "/safe-refactor analyze components over 500 lines"
./run-slash-command.sh "/clean-code check service counts"
```

## System Architecture

```
User Input: /arch-guard
     ↓
slash-command-parser.js
     ↓
replit-claude-code-commands.js  
     ↓
.claude/commands/arch-guard.md
     ↓
Analysis Scripts (dependency-tracker.js, file-size-analyzer.js, etc.)
```

## Files Created

- `slash-command-parser.js` - Main slash command parser
- `run-slash-command.sh` - Direct slash command runner  
- `claude-code-aliases.sh` - Shell aliases for repeated use
- `slash-commands/` - Individual command scripts
- `create-slash-aliases.sh` - Setup script

## Integration

This system integrates with existing analysis tools:
- `dependency-tracker.js` - Cross-domain dependency analysis
- `file-size-analyzer.js` - File size analysis with thresholds
- `malformed-import-detector.js` - Import syntax validation
- `async-await-detector.js` - Async/await compatibility

## Setup Command Reference

To recreate the slash command system:
```bash
chmod +x create-slash-aliases.sh
./create-slash-aliases.sh
```

## Troubleshooting

### Command Not Found
```bash
# Make sure you're in the project root directory
pwd  # Should show your project path

# Make scripts executable
chmod +x run-slash-command.sh
chmod +x slash-command-parser.js
```

### Path Issues
```bash
# Use absolute path if needed
node /full/path/to/slash-command-parser.js "/arch-guard"
```

### Aliases Not Working
```bash
# Re-source the aliases file
source ./claude-code-aliases.sh

# Or use direct method
./run-slash-command.sh "/workit"
```

## Benefits

1. **Claude Code Compatibility** - Same slash syntax as Claude Code editor
2. **Integrated Analysis** - Leverages existing architecture analysis tools
3. **Multiple Usage Patterns** - Direct commands, scripts, or aliases
4. **Architecture Enforcement** - Built-in checks for component/service limits
5. **Domain Boundary Validation** - Prevents cross-domain violations
6. **Production Ready** - Professional development workflow validation

This system brings Claude Code's powerful slash command workflow to Replit, enabling efficient architecture management and development practices.