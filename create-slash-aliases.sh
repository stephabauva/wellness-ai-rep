#!/bin/bash
# Create slash command aliases for easy Claude Code-style commands in Replit

echo "🔧 Creating Claude Code slash command system..."

# Create commands directory for local slash commands
mkdir -p ./slash-commands

# Create individual command scripts in local directory
commands=("arch-guard" "workit" "clean-code" "safe-refactor" "chew" "ultra-think" "zapper" "mobile-ux")

for cmd in "${commands[@]}"; do
    script_name="./slash-commands/${cmd}"
    
    # Create the slash command script with proper path resolution
    cat > "$script_name" << EOF
#!/bin/bash
# Claude Code Slash Command: /$cmd
# Usage: ./$cmd [prompt]

# Change to parent directory to find slash-command-parser.js
cd "\$(dirname "\$0")/.."

if [ "\$#" -eq 0 ]; then
    node slash-command-parser.js "/$cmd"
else
    node slash-command-parser.js "/$cmd \$*"
fi
EOF
    
    # Make it executable
    chmod +x "$script_name"
    echo "✅ Created ./slash-commands/$cmd"
done

# Create a convenience wrapper for slash syntax
cat > "./run-slash-command.sh" << 'EOF'
#!/bin/bash
# Claude Code Slash Command Runner
# Usage: ./run-slash-command.sh "/command [prompt]"

if [ "$#" -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "⚡ Claude Code Slash Commands for Replit"
    echo ""
    echo "Usage: ./run-slash-command.sh \"/command [prompt]\""
    echo ""
    echo "Examples:"
    echo "  ./run-slash-command.sh \"/arch-guard\""
    echo "  ./run-slash-command.sh \"/workit\""
    echo "  ./run-slash-command.sh \"/clean-code\""
    echo "  ./run-slash-command.sh \"/safe-refactor analyze components\""
    echo ""
    echo "Available commands:"
    echo "  /arch-guard, /workit, /clean-code, /safe-refactor"
    echo "  /chew, /ultra-think, /zapper, /mobile-ux"
    exit 0
fi

node slash-command-parser.js "$1"
EOF

chmod +x "./run-slash-command.sh"

# Create shell aliases file
cat > "./claude-code-aliases.sh" << 'EOF'
# Claude Code Style Aliases for Replit
# Source this file to get slash command functionality
# Usage: source ./claude-code-aliases.sh

alias arch-guard='./run-slash-command.sh "/arch-guard"'
alias workit='./run-slash-command.sh "/workit"'
alias clean-code='./run-slash-command.sh "/clean-code"'
alias safe-refactor='./run-slash-command.sh "/safe-refactor"'
alias chew='./run-slash-command.sh "/chew"'
alias ultra-think='./run-slash-command.sh "/ultra-think"'
alias zapper='./run-slash-command.sh "/zapper"'
alias mobile-ux='./run-slash-command.sh "/mobile-ux"'

echo "✅ Claude Code aliases loaded!"
echo "Usage: arch-guard, workit, clean-code, safe-refactor, etc."
EOF

echo ""
echo "🎉 Claude Code slash command system created!"
echo ""
echo "Usage Options:"
echo ""
echo "1. Direct slash commands:"
echo "   ./run-slash-command.sh \"/arch-guard\""
echo "   ./run-slash-command.sh \"/workit\""
echo ""
echo "2. Individual command scripts:"
echo "   ./slash-commands/arch-guard"
echo "   ./slash-commands/workit"
echo ""
echo "3. Shell aliases (source first):"
echo "   source ./claude-code-aliases.sh"
echo "   arch-guard"
echo "   workit"
echo ""
echo "🚀 Now you can use Claude Code-style commands in Replit!"