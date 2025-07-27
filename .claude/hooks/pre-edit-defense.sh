#!/bin/bash

# Multi-Layer Defense Pre-Edit Hook
# Runs before any file editing to ensure system integrity

set -euo pipefail

# Parse JSON input
HOOK_DATA=$(cat)
TOOL_NAME=$(echo "$HOOK_DATA" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$HOOK_DATA" | jq -r '.tool_input.file_path // empty')

# Exit early if not file operation
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Check if editing critical system files
CRITICAL_PATTERNS=(
    "vite.config.ts"
    "package.json"
    "drizzle.config"
    ".env"
    "server/index.ts"
)

for pattern in "${CRITICAL_PATTERNS[@]}"; do
    if [[ "$FILE_PATH" == *"$pattern"* ]]; then
        echo "⚠️  Critical file modification detected: $FILE_PATH" >&2
        echo "Running enhanced validation before edit..." >&2
        
        # Run multi-layer defense validation
        cd "$CLAUDE_PROJECT_DIR"
        if ! npm run pre-commit >/dev/null 2>&1; then
            echo "❌ Pre-commit validation failed. Blocking edit." >&2
            exit 2
        fi
        break
    fi
done

# Domain boundary validation for component/service files
if [[ "$FILE_PATH" == *"/components/"* ]] || [[ "$FILE_PATH" == *"/routes/"* ]] || [[ "$FILE_PATH" == *"/services/"* ]]; then
    # Check if we're respecting domain boundaries
    DOMAIN_DIRS=("health" "memory" "chat" "settings" "file-manager" "home" "auth")
    
    for domain in "${DOMAIN_DIRS[@]}"; do
        if [[ "$FILE_PATH" == *"/$domain/"* ]]; then
            echo "🔍 Domain-specific edit detected in $domain domain" >&2
            
            # Check file size limits before edit
            if [[ -f "$FILE_PATH" ]]; then
                LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")
                if [[ "$LINE_COUNT" -gt 500 ]]; then
                    echo "⚠️  Large file detected ($LINE_COUNT lines). Consider refactoring." >&2
                fi
            fi
            break
        fi
    done
fi

# Memory system protection
if [[ "$FILE_PATH" == *"memory"* ]] || [[ "$FILE_PATH" == *"Memory"* ]]; then
    echo "🧠 Memory system modification detected - enhanced validation required" >&2
    cd "$CLAUDE_PROJECT_DIR"
    
    # Run memory-specific validation
    if ! npm run validate:memory >/dev/null 2>&1; then
        echo "❌ Memory system validation failed. Edit may break memory functionality." >&2
        echo "Run 'npm run validate:memory' to diagnose issues." >&2
        exit 2
    fi
fi

echo "✅ Pre-edit validation passed for $FILE_PATH" >&2
exit 0