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
