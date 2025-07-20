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
