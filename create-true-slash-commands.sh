#!/bin/bash
# Create true slash commands that work like /arch-guard

echo "🔧 Creating true slash commands..."

# Create individual slash command files
commands=("arch-guard" "workit" "clean-code" "safe-refactor" "chew" "ultra-think" "zapper" "mobile-ux")

for cmd in "${commands[@]}"; do
    # Create script with slash prefix in filename
    script_name="_slash_${cmd}"
    
    cat > "$script_name" << EOF
#!/bin/bash
# True Slash Command: /$cmd
# Usage: ./_slash_$cmd [prompt]

PROJECT_ROOT="\$(dirname "\${BASH_SOURCE[0]}")"

if [ "\$#" -eq 0 ]; then
    node "\$PROJECT_ROOT/slash-command-parser.js" "/$cmd"
else
    node "\$PROJECT_ROOT/slash-command-parser.js" "/$cmd \$*"
fi
EOF
    
    chmod +x "$script_name"
    echo "✅ Created _slash_$cmd"
done

# Create convenience aliases
cat > "slash-aliases.sh" << 'EOF'
# True slash command aliases
# Usage: source slash-aliases.sh

# Create function-based slash commands
function slash() {
    local cmd="$1"
    shift
    
    case "$cmd" in
        "arch-guard"|"workit"|"clean-code"|"safe-refactor"|"chew"|"ultra-think"|"zapper"|"mobile-ux")
            if [ "$#" -eq 0 ]; then
                node "$(pwd)/slash-command-parser.js" "/$cmd"
            else
                node "$(pwd)/slash-command-parser.js" "/$cmd $*"
            fi
            ;;
        *)
            echo "Unknown command: $cmd"
            echo "Available: arch-guard, workit, clean-code, safe-refactor, chew, ultra-think, zapper, mobile-ux"
            ;;
    esac
}

# Create individual aliases for each command
alias arch-guard='slash arch-guard'
alias workit='slash workit'
alias clean-code='slash clean-code'
alias safe-refactor='slash safe-refactor'
alias chew='slash chew'
alias ultra-think='slash ultra-think'
alias zapper='slash zapper'
alias mobile-ux='slash mobile-ux'

echo "✅ True slash commands loaded!"
echo "Usage: arch-guard, workit, clean-code, etc."
EOF

# Create the ultimate solution - a single slash command
cat > "run-command.sh" << 'EOF'
#!/bin/bash
# Ultimate slash command runner
# Usage: ./run-command.sh arch-guard
# Usage: ./run-command.sh workit

if [ "$#" -eq 0 ]; then
    echo "Usage: ./run-command.sh <command> [args]"
    echo "Available commands: arch-guard, workit, clean-code, safe-refactor, chew, ultra-think, zapper, mobile-ux"
    exit 1
fi

cmd="$1"
shift

node "$(dirname "${BASH_SOURCE[0]}")/slash-command-parser.js" "/$cmd" "$@"
EOF

chmod +x "run-command.sh"

echo ""
echo "🎉 True slash commands created!"
echo ""
echo "Usage Options (pick your favorite):"
echo ""
echo "1. Short command runner:"
echo "   ./run-command.sh arch-guard"
echo "   ./run-command.sh workit"
echo ""
echo "2. Underscore slash files:"
echo "   ./_slash_arch-guard"
echo "   ./_slash_workit"
echo ""
echo "3. Aliases (after sourcing):"
echo "   source slash-aliases.sh"
echo "   arch-guard"
echo "   workit"
echo ""
echo "🚀 Now you have the shortest possible commands!"