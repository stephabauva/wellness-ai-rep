#!/usr/bin/env python3

"""
Bash Command Validator Hook
Validates bash commands before execution to prevent issues and suggest better alternatives
"""

import json
import re
import sys
from typing import List, Tuple

# Validation rules as (regex pattern, message, severity) tuples
VALIDATION_RULES = [
    (
        r"\bgrep\b(?!.*\|)(?!.*rg)",
        "Use 'rg' (ripgrep) instead of 'grep' for better performance and features",
        "warning"
    ),
    (
        r"\bfind\s+\S+\s+-name\b",
        "Use 'rg --files | rg pattern' or 'rg --files -g pattern' instead of 'find -name' for better performance",
        "warning"
    ),
    (
        r"\bcat\s+.*\.(ts|tsx|js|jsx|json|md)\b",
        "Consider using the Read tool instead of 'cat' for better file analysis",
        "info"
    ),
    (
        r"\brm\s+-rf\s+/",
        "Dangerous: Recursive delete from root directory detected",
        "error"
    ),
    (
        r"\brm\s+-rf\s+\$HOME",
        "Dangerous: Recursive delete of home directory detected", 
        "error"
    ),
    (
        r"\bmv\s+.*\s+/dev/null",
        "Use 'rm' instead of 'mv to /dev/null' for clarity",
        "warning"
    ),
    (
        r"npm\s+run\s+dev(?!:)",
        "Consider using 'npm run dev:local' for local development with PostgreSQL",
        "info"
    ),
    (
        r"DATABASE_URL=.*wellness_local",
        "Local database operation detected - ensure PostgreSQL is running",
        "info"
    ),
    (
        r"\bnpx\s+tsx\s+(?!scripts/)",
        "Running tsx outside scripts/ - consider if this belongs in package.json scripts",
        "info"
    ),
    (
        r"git\s+push\s+--force",
        "Force push detected - ensure this won't overwrite important changes",
        "warning"
    )
]

# Critical system files that require extra validation
CRITICAL_PATTERNS = [
    r"vite\.config\.ts",
    r"package\.json", 
    r"\.env",
    r"server/index\.ts",
    r"drizzle\.config"
]

def validate_command(command: str) -> List[Tuple[str, str]]:
    """Validate a bash command and return list of (message, severity) tuples."""
    issues = []
    
    for pattern, message, severity in VALIDATION_RULES:
        if re.search(pattern, command):
            issues.append((message, severity))
    
    # Check for critical file operations
    for pattern in CRITICAL_PATTERNS:
        if re.search(f"(rm|mv|>|>>).*{pattern}", command):
            issues.append((
                f"Critical file operation detected - ensure this is intentional",
                "warning"
            ))
    
    return issues

def check_wellness_specific_commands(command: str) -> List[Tuple[str, str]]:
    """Check for wellness app specific command patterns."""
    issues = []
    
    # Multi-layer defense system integration
    defense_commands = [
        "npm run pre-commit",
        "npm run safe-refactor", 
        "npm run ci",
        "npm run validate:quick"
    ]
    
    # If editing memory/health files, suggest running validation
    if re.search(r"(edit|write|touch).*memory|health", command.lower()):
        issues.append((
            "Memory/health file modification - consider running 'npm run validate:quick' after changes",
            "info"
        ))
    
    # If installing packages, suggest dependency check
    if re.search(r"npm\s+install", command):
        issues.append((
            "Package installation - run 'npm run check:dependencies' to validate architecture",
            "info"
        ))
    
    return issues

def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "")

    if tool_name != "Bash" or not command:
        sys.exit(0)

    # Validate the command
    issues = validate_command(command)
    wellness_issues = check_wellness_specific_commands(command)
    all_issues = issues + wellness_issues

    if not all_issues:
        sys.exit(0)

    # Group issues by severity
    errors = [msg for msg, sev in all_issues if sev == "error"]
    warnings = [msg for msg, sev in all_issues if sev == "warning"] 
    infos = [msg for msg, sev in all_issues if sev == "info"]

    # Print issues to stderr
    if errors:
        print("❌ ERRORS:", file=sys.stderr)
        for error in errors:
            print(f"  • {error}", file=sys.stderr)
    
    if warnings:
        print("⚠️  WARNINGS:", file=sys.stderr)
        for warning in warnings:
            print(f"  • {warning}", file=sys.stderr)
    
    if infos:
        print("ℹ️  SUGGESTIONS:", file=sys.stderr)
        for info in infos:
            print(f"  • {info}", file=sys.stderr)

    # Block on errors, allow on warnings/info
    if errors:
        sys.exit(2)  # Block execution
    else:
        sys.exit(0)  # Allow with warnings/suggestions

if __name__ == "__main__":
    main()