#!/bin/bash
# Route module line count validation script
# Ensures all route files stay within assigned line limits

echo "Validating route module line counts..."

# Define line limits for each module
declare -A limits=(
  ["shared-dependencies.ts"]=50
  ["shared-utils.ts"]=200
  ["index.ts"]=60
  ["chat-routes.ts"]=280
  ["health-routes.ts"]=300
  ["memory-routes.ts"]=280
  ["file-routes.ts"]=270
  ["settings-routes.ts"]=250
  ["monitoring-routes.ts"]=260
)

errors=0
total_lines=0

for file in server/routes/*.ts; do
  if [[ -f "$file" ]]; then
    filename=$(basename "$file")
    lines=$(wc -l < "$file")
    limit=${limits[$filename]}
    
    if [[ -n "$limit" ]]; then
      if (( lines > limit )); then
        echo "❌ ERROR: $filename has $lines lines (limit: $limit)"
        ((errors++))
      else
        echo "✅ PASS: $filename has $lines/$limit lines"
      fi
    else
      echo "⚠️  WARN: $filename has no defined limit ($lines lines)"
    fi
    
    ((total_lines += lines))
  fi
done

echo ""
echo "Total lines in route modules: $total_lines"
echo "Modules checked: $(ls server/routes/*.ts 2>/dev/null | wc -l)"

if (( errors > 0 )); then
  echo "❌ VALIDATION FAILED: $errors file(s) exceed line limits"
  exit 1
else
  echo "✅ VALIDATION PASSED: All files within limits"
  exit 0
fi