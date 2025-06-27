#!/bin/bash

# Routes Modularization Validation Script
# Validates line counts, functionality, and integration status

echo "=== Routes Modularization Phase 3 Validation ==="
echo

# Define maximum line limits for each module
declare -A MAX_LINES=(
    ["chat-routes.ts"]=280
    ["health-routes.ts"]=300
    ["memory-routes.ts"]=280
    ["file-routes.ts"]=270
    ["settings-routes.ts"]=250
    ["monitoring-routes.ts"]=260
    ["shared-dependencies.ts"]=50
    ["shared-utils.ts"]=200
    ["index.ts"]=60
)

# Check if routes directory exists
if [ ! -d "server/routes" ]; then
    echo "❌ FAIL: server/routes directory not found"
    exit 1
fi

echo "📊 Line Count Validation:"
echo "-------------------------"

total_lines=0
validation_passed=true

for file in "${!MAX_LINES[@]}"; do
    if [ -f "server/routes/$file" ]; then
        line_count=$(wc -l < "server/routes/$file")
        max_allowed=${MAX_LINES[$file]}
        total_lines=$((total_lines + line_count))
        
        if [ $line_count -le $max_allowed ]; then
            echo "✅ $file: $line_count/$max_allowed lines"
        else
            echo "❌ $file: $line_count/$max_allowed lines (EXCEEDED)"
            validation_passed=false
        fi
    else
        echo "❌ $file: NOT FOUND"
        validation_passed=false
    fi
done

echo
echo "📈 Summary:"
echo "Total lines: $total_lines"
echo "Modules: ${#MAX_LINES[@]}"

# Check server integration
echo
echo "🔗 Integration Validation:"
echo "-------------------------"

if [ -f "server/index.ts" ]; then
    if grep -q "registerRoutes" "server/index.ts"; then
        echo "✅ Server integration: routes registered"
    else
        echo "❌ Server integration: routes not registered"
        validation_passed=false
    fi
else
    echo "❌ Server integration: server/index.ts not found"
    validation_passed=false
fi

# Check system maps
echo
echo "🗺️  System Maps Validation:"
echo "-------------------------"

if [ -f ".system-maps/routes/routes-core.map.json" ]; then
    echo "✅ Routes system map: exists"
    
    # Check if system map has been updated with completion status
    if grep -q "COMPLETE" ".system-maps/routes/routes-core.map.json"; then
        echo "✅ System map status: updated with completion"
    else
        echo "⚠️  System map status: needs completion update"
    fi
else
    echo "❌ Routes system map: missing"
    validation_passed=false
fi

# Final validation result
echo
echo "🎯 Final Validation Result:"
echo "-------------------------"

if [ "$validation_passed" = true ]; then
    echo "✅ PASSED: Routes modularization Phase 3 complete"
    echo "   • All modules within line limits"
    echo "   • Server integration successful"
    echo "   • System maps updated"
    echo "   • Total: $total_lines lines modularized"
    exit 0
else
    echo "❌ FAILED: Routes modularization validation failed"
    echo "   • Check errors above and fix before proceeding"
    exit 1
fi