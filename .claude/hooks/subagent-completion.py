#!/usr/bin/env python3

"""
Subagent Completion Hook
Runs after subagent tasks to suggest follow-up actions and validation
"""

import json
import re
import sys
from typing import List

def analyze_completion_needs(prompt: str, agent_type: str) -> List[str]:
    """Analyze completed subagent task and suggest follow-up actions."""
    suggestions = []
    
    # Memory system specialist follow-ups
    if agent_type == "memory-system-specialist":
        suggestions.append("Run 'npm run validate:memory' to verify memory system integrity")
        if "deduplication" in prompt.lower():
            suggestions.append("Test memory deduplication with sample data")
        if "retrieval" in prompt.lower():
            suggestions.append("Validate memory retrieval performance")
    
    # Health data validator follow-ups
    elif agent_type == "health-data-validator":
        suggestions.append("Run 'npm run validate:data' to check health data processing")
        if "nutrition" in prompt.lower():
            suggestions.append("Test nutrition inference with sample food data")
        if "healthkit" in prompt.lower() or "google fit" in prompt.lower():
            suggestions.append("Validate platform-specific data import flows")
    
    # Mobile UI optimizer follow-ups
    elif agent_type == "mobile-ui-optimizer":
        suggestions.append("Run 'npm run check:ui' to validate UI component integrity")
        suggestions.append("Test responsive design on different screen sizes")
        if "touch" in prompt.lower():
            suggestions.append("Validate touch interactions on mobile devices")
    
    # Go microservice expert follow-ups
    elif agent_type == "go-microservice-expert":
        suggestions.append("Run 'npm run test:go' to test all Go microservices")
        if "gateway" in prompt.lower():
            suggestions.append("Test AI gateway integration with frontend")
        if "file" in prompt.lower():
            suggestions.append("Validate file processing workflows")
    
    # CI pipeline auditor follow-ups
    elif agent_type == "ci-pipeline-auditor":
        suggestions.append("Run 'npm run ci:full' to test complete CI pipeline")
        suggestions.append("Validate all CI stages execute successfully")
        if "github" in prompt.lower():
            suggestions.append("Test GitHub Actions integration")
    
    # Wellness domain architect follow-ups
    elif agent_type == "wellness-domain-architect":
        suggestions.append("Run 'npm run check:dependencies' to validate domain boundaries")
        suggestions.append("Verify no cross-domain imports were introduced")
        if "component" in prompt.lower():
            suggestions.append("Check component count limits (max 25)")
    
    # Multi-layer defense auditor follow-ups
    elif agent_type == "multi-layer-defense-auditor":
        suggestions.append("Run 'npm run safe-refactor' to validate all defense layers")
        suggestions.append("Execute full validation suite")
        if "architecture" in prompt.lower():
            suggestions.append("Review system maps for accuracy")
    
    # General purpose follow-ups
    elif agent_type == "general-purpose":
        if "memory" in prompt.lower():
            suggestions.append("Consider running memory-specific validation")
        if "health" in prompt.lower():
            suggestions.append("Consider running health data validation")
        suggestions.append("Run 'npm run validate:quick' for general health check")
    
    return suggestions

def check_critical_operations(prompt: str) -> List[str]:
    """Check if the completed operation requires immediate validation."""
    critical_checks = []
    
    # Critical system modifications
    if re.search(r"(schema|database|migration)", prompt.lower()):
        critical_checks.append("🚨 Database changes detected - run 'npm run validate:db' immediately")
    
    if re.search(r"(memory.*system|memory.*service)", prompt.lower()):
        critical_checks.append("🚨 Memory system changes - run full validation suite")
    
    if re.search(r"(auth|authentication|security)", prompt.lower()):
        critical_checks.append("🚨 Authentication changes - test login/logout flows")
    
    if re.search(r"(api|endpoint|route)", prompt.lower()):
        critical_checks.append("🚨 API changes - validate all endpoints still function")
    
    if re.search(r"(build|package|config)", prompt.lower()):
        critical_checks.append("🚨 Build configuration changes - run 'npm run build' to verify")
    
    return critical_checks

def suggest_next_actions(prompt: str, agent_type: str) -> List[str]:
    """Suggest logical next actions based on the completed task."""
    next_actions = []
    
    # Code generation tasks
    if re.search(r"(implement|create|add|build)", prompt.lower()):
        next_actions.append("Consider writing tests for the new functionality")
        next_actions.append("Update relevant documentation if needed")
    
    # Bug fixing tasks
    if re.search(r"(fix|bug|error|issue)", prompt.lower()):
        next_actions.append("Verify the fix resolves the original issue")
        next_actions.append("Check for potential side effects")
    
    # Optimization tasks
    if re.search(r"(optimize|performance|speed)", prompt.lower()):
        next_actions.append("Measure performance improvements")
        next_actions.append("Monitor for any regression issues")
    
    # Refactoring tasks
    if re.search(r"(refactor|restructure|reorganize)", prompt.lower()):
        next_actions.append("Ensure all functionality remains intact")
        next_actions.append("Update imports and references")
    
    return next_actions

def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    if tool_name != "Task":
        sys.exit(0)
    
    prompt = tool_input.get("prompt", "")
    agent_type = tool_input.get("subagent_type", "")
    
    if not prompt or not agent_type:
        sys.exit(0)

    # Analyze completion and suggest follow-ups
    follow_ups = analyze_completion_needs(prompt, agent_type)
    critical_checks = check_critical_operations(prompt)
    next_actions = suggest_next_actions(prompt, agent_type)
    
    all_suggestions = critical_checks + follow_ups + next_actions
    
    if not all_suggestions:
        sys.exit(0)

    print(f"✅ {agent_type.upper()} TASK COMPLETED", file=sys.stderr)
    
    if critical_checks:
        print("🚨 CRITICAL FOLLOW-UPS:", file=sys.stderr)
        for check in critical_checks:
            print(f"  • {check}", file=sys.stderr)
    
    if follow_ups:
        print("🔍 RECOMMENDED VALIDATIONS:", file=sys.stderr)
        for follow_up in follow_ups:
            print(f"  • {follow_up}", file=sys.stderr)
    
    if next_actions:
        print("➡️  SUGGESTED NEXT STEPS:", file=sys.stderr)
        for action in next_actions:
            print(f"  • {action}", file=sys.stderr)
    
    sys.exit(0)

if __name__ == "__main__":
    main()