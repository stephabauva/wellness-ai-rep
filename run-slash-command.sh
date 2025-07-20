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
