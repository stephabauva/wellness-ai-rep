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
