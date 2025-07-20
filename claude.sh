#!/bin/bash
# Claude Commands Wrapper for Replit
# Usage: ./claude.sh <command> or bash claude.sh <command>

if [ "$#" -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "🤖 Claude Commands for Replit"
    echo ""
    echo "Usage: ./claude.sh <command>"
    echo "   or: bash claude.sh <command>"
    echo ""
    echo "Available commands:"
    echo "  arch-guard    - Run architecture guardian checks"
    echo "  workit        - Production-ready development mode"
    echo "  clean-code    - Clean code checklist validation"
    echo "  safe-refactor - Safe large file refactoring"
    echo "  chew          - Deep analysis mode"
    echo "  ultra-think   - Maximum analysis mode"
    echo "  zapper        - Quick problem resolution"
    echo "  mobile-ux     - Mobile-first development"
    echo ""
    echo "Examples:"
    echo "  ./claude.sh arch-guard"
    echo "  bash claude.sh workit"
    exit 0
fi

# Execute the command
node claude-commands.js "$1"