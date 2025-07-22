#!/bin/bash

# Multi-Layer Defense System - Pre-commit Hook Installation
# Prevents architectural breakage and server startup failures

echo "🛡️  Installing Multi-Layer Defense System pre-commit hook..."

# Ensure .git/hooks directory exists
mkdir -p .git/hooks

# Create the pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🛡️  Multi-Layer Defense System: Validating commit..."

# Layer 1: Port Configuration Validation
echo "📡 Checking port configurations..."
if ! npm run check:ports --silent; then
    echo "❌ Port configuration validation failed!"
    echo "   Run 'npm run check:ports' to see details"
    exit 1
fi

# Layer 2: Import Path Validation  
echo "📦 Checking import paths..."
if ! npm run check:imports --silent; then
    echo "❌ Import validation failed!"
    echo "   Run 'npm run check:imports' to see details"
    exit 1
fi

# Layer 3: TypeScript Validation
echo "🔧 Checking TypeScript..."
if ! npm run check --silent; then
    echo "❌ TypeScript validation failed!"
    echo "   Run 'npm run check' to see details"
    exit 1
fi

echo "✅ Multi-Layer Defense System: All validations passed!"
echo "🚀 Commit approved - server startup protection active"

EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Multi-Layer Defense System pre-commit hook installed successfully!"
echo ""
echo "🛡️  Protection Active:"
echo "   • Port configuration validation"
echo "   • Import path resolution checking" 
echo "   • TypeScript compilation validation"
echo ""
echo "📋 Available Commands:"
echo "   • npm run pre-commit      - Manual validation"
echo "   • npm run safe-refactor   - Full architecture check"
echo "   • npm run check:ports     - Port validation only"
echo "   • npm run check:imports   - Import validation only"
echo ""
echo "⚠️  To bypass hook in emergency: git commit --no-verify"
echo "   (Use only when you're certain the changes are safe)"