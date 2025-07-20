#!/bin/bash
# Ultra-short Claude Code command runner
# Usage: ./c arch-guard
# Usage: ./c workit
# Usage: ./c clean-code

if [ "$#" -eq 0 ]; then
    echo "Usage: ./c <command> [args]"
    echo ""
    echo "Available commands:"
    echo "  arch-guard    - Architecture health checks"
    echo "  workit        - Production development mode"
    echo "  clean-code    - Code quality validation"
    echo "  safe-refactor - Refactoring guidance"
    echo "  chew          - Deep analysis"
    echo "  ultra-think   - Maximum analysis"
    echo "  zapper        - Quick fixes"
    echo "  mobile-ux     - Mobile development"
    exit 1
fi

cmd="$1"
shift

node "$(dirname "${BASH_SOURCE[0]}")/slash-command-parser.js" "/$cmd" "$@"