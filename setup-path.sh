# Add project bin to PATH for direct command access
# Usage: source ./setup-path.sh

export PATH="$(pwd)/bin:$PATH"

echo "✅ PATH updated! You can now use commands directly:"
echo "  arch-guard"
echo "  workit" 
echo "  clean-code"
echo "  safe-refactor"
