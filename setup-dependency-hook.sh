#!/bin/bash

# Setup script for dependency checking pre-commit hook
# This needs to be run manually since we're in a worktree

echo "🔧 Setting up dependency check pre-commit hook..."

# Get the actual git directory
GIT_DIR=$(git rev-parse --git-dir)

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_DIR/hooks"

# Create the pre-commit hook
cat > "$GIT_DIR/hooks/pre-commit" << 'EOF'
#!/bin/sh
# Pre-commit hook to check cross-domain dependencies

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "Node.js is required for dependency checking"
    exit 0
fi

# Check if dependency-check-hook.js exists
if [ ! -f "dependency-check-hook.js" ]; then
    echo "dependency-check-hook.js not found, skipping dependency check"
    exit 0
fi

# Run the dependency check
node dependency-check-hook.js

# Exit with the status from the dependency check
exit $?
EOF

# Make the hook executable
chmod +x "$GIT_DIR/hooks/pre-commit"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "The hook will now:"
echo "  - Check modified files for cross-domain dependencies"
echo "  - Warn about high-impact changes"
echo "  - Block commits to critical path components without review"
echo ""
echo "To bypass the hook in emergencies, use: git commit --no-verify"