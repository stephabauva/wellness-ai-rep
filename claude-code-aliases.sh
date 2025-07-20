# Claude Code Style Aliases for Replit
# Source this file to get slash command functionality
# Usage: source ./claude-code-aliases.sh

# Create aliases that work from any directory
alias arch-guard='node "$PWD/slash-command-parser.js" "/arch-guard"'
alias workit='node "$PWD/slash-command-parser.js" "/workit"'
alias clean-code='node "$PWD/slash-command-parser.js" "/clean-code"'
alias safe-refactor='node "$PWD/slash-command-parser.js" "/safe-refactor"'
alias chew='node "$PWD/slash-command-parser.js" "/chew"'
alias ultra-think='node "$PWD/slash-command-parser.js" "/ultra-think"'
alias zapper='node "$PWD/slash-command-parser.js" "/zapper"'
alias mobile-ux='node "$PWD/slash-command-parser.js" "/mobile-ux"'

echo "✅ Claude Code aliases loaded!"
echo "Usage: arch-guard, workit, clean-code, safe-refactor, etc."
