#!/bin/bash

# Post-Edit Validation Hook
# Runs after file edits to ensure code quality and system integrity

set -euo pipefail

# Parse JSON input
HOOK_DATA=$(cat)
TOOL_NAME=$(echo "$HOOK_DATA" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$HOOK_DATA" | jq -r '.tool_input.file_path // empty')
SUCCESS=$(echo "$HOOK_DATA" | jq -r '.tool_response.success // false')

# Exit if edit failed
if [[ "$SUCCESS" != "true" ]]; then
    exit 0
fi

# Exit early if not file operation
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "🔍 Running post-edit validation for $FILE_PATH" >&2

# TypeScript/JavaScript file validation
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then
    
    # Check for import issues
    if ! npm run check:imports >/dev/null 2>&1; then
        echo "❌ Import validation failed after edit" >&2
        echo "File: $FILE_PATH may have malformed imports" >&2
        exit 2
    fi
    
    # TypeScript check
    if ! npm run check >/dev/null 2>&1; then
        echo "❌ TypeScript validation failed after edit" >&2
        echo "Run 'npm run check' to see specific errors" >&2
        exit 2
    fi
    
    # Check async/await compatibility
    if ! npm run check:async >/dev/null 2>&1; then
        echo "⚠️  Async/await compatibility issue detected" >&2
        echo "This may cause 'Cannot read properties of undefined' errors" >&2
    fi
fi

# Component-specific validation
if [[ "$FILE_PATH" == *"/components/"* ]]; then
    echo "🎨 Running UI component validation..." >&2
    
    # Run UI checks
    if ! npm run check:ui >/dev/null 2>&1; then
        echo "⚠️  UI component issues detected" >&2
        echo "Run 'npm run check:ui' for details" >&2
    fi
fi

# Memory system validation
if [[ "$FILE_PATH" == *"memory"* ]] || [[ "$FILE_PATH" == *"Memory"* ]]; then
    echo "🧠 Validating memory system integrity..." >&2
    
    if ! npm run validate:memory >/dev/null 2>&1; then
        echo "❌ Memory system validation failed after edit" >&2
        echo "Critical: Memory functionality may be broken" >&2
        exit 2
    fi
fi

# Health data validation
if [[ "$FILE_PATH" == *"health"* ]] || [[ "$FILE_PATH" == *"Health"* ]]; then
    echo "🏥 Validating health data processing..." >&2
    
    if ! npm run validate:data >/dev/null 2>&1; then
        echo "⚠️  Health data validation issues detected" >&2
        echo "Run 'npm run validate:data' for details" >&2
    fi
fi

# Database schema changes
if [[ "$FILE_PATH" == *"schema"* ]] || [[ "$FILE_PATH" == *"migration"* ]]; then
    echo "🗄️  Database schema change detected" >&2
    
    if ! npm run validate:db >/dev/null 2>&1; then
        echo "❌ Database connectivity validation failed" >&2
        echo "Schema changes may have broken database connection" >&2
        exit 2
    fi
fi

# File size check
if [[ -f "$FILE_PATH" ]]; then
    LINE_COUNT=$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")
    
    # Component/route size limits
    if [[ "$FILE_PATH" == *"/components/"* ]] || [[ "$FILE_PATH" == *"/routes/"* ]]; then
        if [[ "$LINE_COUNT" -gt 300 ]]; then
            echo "⚠️  File size warning: $LINE_COUNT lines (ideal: ≤300)" >&2
            echo "Consider refactoring for better maintainability" >&2
        fi
    fi
    
    # Service size limits  
    if [[ "$FILE_PATH" == *"/services/"* ]]; then
        if [[ "$LINE_COUNT" -gt 200 ]]; then
            echo "⚠️  Service size warning: $LINE_COUNT lines (ideal: ≤200)" >&2
            echo "Consider breaking into smaller services" >&2
        fi
    fi
fi

echo "✅ Post-edit validation completed for $FILE_PATH" >&2
exit 0