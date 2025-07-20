#!/bin/bash
# Claude Code Commands Runner for Replit
# Replicates Claude Code's slash commands ($/workit, $/arch-guard, etc.) in Replit
# Usage: ./run-claude-code-command.sh <command> or bash run-claude-code-command.sh <command>

if [ "$#" -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "🤖 Claude Code Commands for Replit"
    echo "Replicates Claude Code editor slash commands ($/workit, $/arch-guard, etc.)"
    echo ""
    echo "Usage: ./run-claude-code-command.sh <command>"
    echo "   or: bash run-claude-code-command.sh <command>"
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
    echo "  ./run-claude-code-command.sh arch-guard"
    echo "  bash run-claude-code-command.sh workit"
    exit 0
fi

# Execute the command
node replit-claude-code-commands.js "$1"