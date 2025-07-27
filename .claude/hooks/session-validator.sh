#!/bin/bash

# Session Validator Hook
# Runs when Claude stops to ensure system integrity and suggest follow-up actions

set -euo pipefail

# Parse JSON input
HOOK_DATA=$(cat)
SESSION_ID=$(echo "$HOOK_DATA" | jq -r '.session_id // empty')
STOP_HOOK_ACTIVE=$(echo "$HOOK_DATA" | jq -r '.stop_hook_active // false')

# Avoid infinite loops
if [[ "$STOP_HOOK_ACTIVE" == "true" ]]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "🔍 Running session validation..." >&2

# Check if any critical files were modified
CRITICAL_FILES=(
    "package.json"
    "vite.config.ts" 
    "server/index.ts"
    "shared/schema.ts"
    "drizzle.config.ts"
)

MODIFIED_CRITICAL=false
for file in "${CRITICAL_FILES[@]}"; do
    if [[ -f "$file" ]] && git diff --quiet "$file" 2>/dev/null; then
        continue
    elif [[ -f "$file" ]]; then
        echo "⚠️  Critical file modified: $file" >&2
        MODIFIED_CRITICAL=true
    fi
done

# If critical files modified, run comprehensive validation
if [[ "$MODIFIED_CRITICAL" == "true" ]]; then
    echo "🚨 Critical files modified - running comprehensive validation..." >&2
    
    if ! npm run pre-commit >/dev/null 2>&1; then
        echo "❌ Pre-commit validation failed" >&2
        echo "Critical system integrity issues detected. Please resolve before proceeding." >&2
        exit 2
    fi
    
    if ! npm run validate:quick >/dev/null 2>&1; then
        echo "❌ Quick validation failed" >&2
        echo "System functionality may be compromised. Run 'npm run validate:quick' for details." >&2
        exit 2
    fi
fi

# Check for uncommitted changes in key directories
KEY_DIRS=("client/src" "server" "shared")
UNCOMMITTED_CHANGES=false

for dir in "${KEY_DIRS[@]}"; do
    if [[ -d "$dir" ]] && ! git diff --quiet "$dir" 2>/dev/null; then
        UNCOMMITTED_CHANGES=true
        break
    fi
done

# Generate session summary and recommendations
RECOMMENDATIONS=()

if [[ "$UNCOMMITTED_CHANGES" == "true" ]]; then
    RECOMMENDATIONS+=("Consider committing your changes: git add . && git commit -m 'Your commit message'")
fi

# Check if memory system was touched
if git diff --quiet --name-only | grep -q "memory" 2>/dev/null || false; then
    RECOMMENDATIONS+=("Memory system changes detected - consider running: npm run validate:memory")
fi

# Check if health system was touched  
if git diff --quiet --name-only | grep -q "health" 2>/dev/null || false; then
    RECOMMENDATIONS+=("Health system changes detected - consider running: npm run validate:data")
fi

# Check if Go services were modified
if git diff --quiet --name-only | grep -q "go-" 2>/dev/null || false; then
    RECOMMENDATIONS+=("Go services modified - consider running: npm run test:go")
fi

# Check if build is still working
if [[ "$MODIFIED_CRITICAL" == "true" ]]; then
    if ! timeout 30s npm run build >/dev/null 2>&1; then
        echo "❌ Build validation failed" >&2
        echo "Build is broken. This must be fixed before deployment." >&2
        exit 2
    fi
fi

# Output recommendations
if [[ ${#RECOMMENDATIONS[@]} -gt 0 ]]; then
    echo "📋 SESSION COMPLETE - RECOMMENDATIONS:" >&2
    for rec in "${RECOMMENDATIONS[@]}"; do
        echo "  • $rec" >&2
    done
fi

# Final health check
if ! npm run validate:quick >/dev/null 2>&1; then
    echo "⚠️  Quick validation shows potential issues" >&2
    echo "Run 'npm run validate:quick' to diagnose" >&2
fi

echo "✅ Session validation completed" >&2
exit 0