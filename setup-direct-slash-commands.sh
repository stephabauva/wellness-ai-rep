#!/bin/bash
# Setup direct slash commands (/arch-guard, /workit, etc.) in Replit

echo "🔧 Setting up direct slash commands..."

# Create a bin directory for our slash commands
mkdir -p ./bin

# List of available commands
commands=("arch-guard" "workit" "clean-code" "safe-refactor" "chew" "ultra-think" "zapper" "mobile-ux")

for cmd in "${commands[@]}"; do
    script_name="./bin/$cmd"
    
    # Create executable script that mimics slash command
    cat > "$script_name" << EOF
#!/bin/bash
# Direct Claude Code Command: $cmd
# Usage: $cmd [prompt]

# Get the project root directory
PROJECT_ROOT="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"

if [ "\$#" -eq 0 ]; then
    node "\$PROJECT_ROOT/slash-command-parser.js" "/$cmd"
else
    node "\$PROJECT_ROOT/slash-command-parser.js" "/$cmd \$*"
fi
EOF
    
    chmod +x "$script_name"
    echo "✅ Created $cmd command"
done

# Create a shell function for the /command syntax
cat > "./slash-command-functions.sh" << 'EOF'
# Direct slash command function
# Usage: source ./slash-command-functions.sh

function /() {
    local cmd="$1"
    shift
    
    if [ -z "$cmd" ]; then
        echo "Usage: / <command> [arguments]"
        echo "Example: / arch-guard"
        echo "Example: / workit"
        return 1
    fi
    
    # Get project root
    local project_root="$(pwd)"
    
    if [ "$#" -eq 0 ]; then
        node "$project_root/slash-command-parser.js" "/$cmd"
    else
        node "$project_root/slash-command-parser.js" "/$cmd $*"
    fi
}

# Tab completion for slash commands
_slash_complete() {
    local commands="arch-guard workit clean-code safe-refactor chew ultra-think zapper mobile-ux"
    COMPREPLY=($(compgen -W "$commands" -- "${COMP_WORDS[1]}"))
}

complete -F _slash_complete /

echo "✅ Slash command functions loaded!"
echo "Usage: / arch-guard"
echo "Usage: / workit"
EOF

# Create PATH setup script
cat > "./setup-path.sh" << 'EOF'
# Add project bin to PATH for direct command access
# Usage: source ./setup-path.sh

export PATH="$(pwd)/bin:$PATH"

echo "✅ PATH updated! You can now use commands directly:"
echo "  arch-guard"
echo "  workit" 
echo "  clean-code"
echo "  safe-refactor"
EOF

echo ""
echo "🎉 Direct slash commands setup complete!"
echo ""
echo "Usage Options:"
echo ""
echo "1. Direct commands (after PATH setup):"
echo "   source ./setup-path.sh"
echo "   arch-guard"
echo "   workit"
echo ""
echo "2. Slash function syntax:"
echo "   source ./slash-command-functions.sh"
echo "   / arch-guard"
echo "   / workit"
echo ""
echo "3. Bin directory commands:"
echo "   ./bin/arch-guard"
echo "   ./bin/workit"
echo ""
echo "🚀 Choose your preferred method and start using Claude Code style commands!"