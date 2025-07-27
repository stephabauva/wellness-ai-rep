#!/usr/bin/env python3

"""
Prompt Enhancer Hook
Enhances user prompts with relevant context and validates for security issues
"""

import json
import re
import sys
import os
from datetime import datetime
from typing import List, Tuple

# Security patterns to block
SECURITY_PATTERNS = [
    (r"(?i)\b(password|secret|key|token)\s*[:=]", "Prompt contains potential secrets"),
    (r"(?i)(api[_-]?key|auth[_-]?token)", "API key or auth token detected"),
    (r"(?i)(database[_-]?url|connection[_-]?string)", "Database connection info detected"),
    (r"rm\s+-rf\s+/", "Dangerous recursive delete command"),
    (r"sudo\s+", "Sudo command usage detected"),
]

# Wellness app context patterns
CONTEXT_PATTERNS = [
    (r"memory|remember|recall", "memory_system"),
    (r"health|nutrition|fitness|healthkit", "health_data"),
    (r"mobile|responsive|ios|android", "mobile_ui"),
    (r"go|microservice|gateway", "go_services"),
    (r"test|ci|build|deploy", "ci_pipeline"),
    (r"domain|architecture|component", "domain_architecture"),
    (r"validation|defense|security", "defense_system"),
]

def check_security_violations(prompt: str) -> List[str]:
    """Check for security violations in the prompt."""
    violations = []
    
    for pattern, message in SECURITY_PATTERNS:
        if re.search(pattern, prompt):
            violations.append(message)
    
    return violations

def get_wellness_context(prompt: str) -> str:
    """Generate relevant context based on prompt content."""
    context_parts = []
    
    # Add current time
    context_parts.append(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Detect relevant domains
    relevant_domains = []
    for pattern, domain in CONTEXT_PATTERNS:
        if re.search(pattern, prompt.lower()):
            relevant_domains.append(domain)
    
    if relevant_domains:
        context_parts.append(f"Relevant domains: {', '.join(set(relevant_domains))}")
    
    # Add wellness app specific context
    if "memory" in prompt.lower():
        context_parts.append(
            "Memory System: ChatGPT-style with deduplication. "
            "CRITICAL: Always run 'npm run validate:memory' after memory changes."
        )
    
    if "health" in prompt.lower():
        context_parts.append(
            "Health Data: HealthKit/Google Fit integration with nutrition inference. "
            "Use health-data-validator subagent for health-related tasks."
        )
    
    if "component" in prompt.lower():
        context_parts.append(
            "Component Limits: Max 25 UI components total. "
            "File size limits: 300 lines for components, 200 for services."
        )
    
    if "domain" in prompt.lower():
        context_parts.append(
            "Domain Boundaries: STRICT separation - health/, memory/, chat/, settings/, "
            "file-manager/, home/, auth/. NEVER import cross-domain."
        )
    
    if re.search(r"edit|modify|change|update", prompt.lower()):
        context_parts.append(
            "Before ANY code changes: Run multi-layer defense checks - "
            "'npm run pre-commit' + 'npm run safe-refactor'"
        )
    
    if "ci" in prompt.lower() or "pipeline" in prompt.lower():
        context_parts.append(
            "CI Commands: 'npm run ci' (core), 'npm run ci:full' (complete), "
            "'npm run ci:with-tests' (with tests), 'npm run ci:local' (interactive)"
        )
    
    # Add validation reminders
    if re.search(r"memory.*system|memory.*service", prompt.lower()):
        context_parts.append(
            "🚨 MANDATORY for memory changes: npm run pre-commit && npm run safe-refactor && npm run dev"
        )
    
    if "go" in prompt.lower():
        context_parts.append(
            "Go Services: AI gateway (port 8080), memory service (8081), "
            "file service (8082), file accelerator (8083). Test with 'npm run test:go'"
        )
    
    return "\n".join(context_parts)

def suggest_subagent(prompt: str) -> str:
    """Suggest the most appropriate subagent for the task."""
    prompt_lower = prompt.lower()
    
    # Subagent suggestions based on prompt analysis
    if re.search(r"memory.*system|deduplication|retrieval", prompt_lower):
        return "Consider using 'memory-system-specialist' subagent for memory-related tasks"
    
    if re.search(r"health|nutrition|healthkit|google.*fit", prompt_lower):
        return "Consider using 'health-data-validator' subagent for health data tasks"
    
    if re.search(r"mobile|responsive|touch|ios|android", prompt_lower):
        return "Consider using 'mobile-ui-optimizer' subagent for mobile/UI tasks"
    
    if re.search(r"\bgo\b|microservice|gateway|concurrent", prompt_lower):
        return "Consider using 'go-microservice-expert' subagent for Go service tasks"
    
    if re.search(r"ci|pipeline|build|test|deploy", prompt_lower):
        return "Consider using 'ci-pipeline-auditor' subagent for CI/CD tasks"
    
    if re.search(r"domain|architecture|boundary|component.*organization", prompt_lower):
        return "Consider using 'wellness-domain-architect' subagent for architecture tasks"
    
    if re.search(r"defense|validation|architecture.*violation", prompt_lower):
        return "Consider using 'multi-layer-defense-auditor' subagent for validation tasks"
    
    if re.search(r"search|research|complex.*task|multi.*step", prompt_lower):
        return "Consider using 'general-purpose' subagent for complex research tasks"
    
    return ""

def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    prompt = input_data.get("prompt", "")
    
    if not prompt:
        sys.exit(0)

    # Check for security violations
    violations = check_security_violations(prompt)
    
    if violations:
        # Use JSON output to block with specific reason
        output = {
            "decision": "block",
            "reason": f"Security policy violation: {'; '.join(violations)}. "
                     "Please rephrase your request without sensitive information."
        }
        print(json.dumps(output))
        sys.exit(0)

    # Generate enhanced context
    context_parts = []
    
    # Add wellness app context
    wellness_context = get_wellness_context(prompt)
    if wellness_context:
        context_parts.append("🏥 WELLNESS APP CONTEXT:")
        context_parts.append(wellness_context)
    
    # Add subagent suggestion
    subagent_suggestion = suggest_subagent(prompt)
    if subagent_suggestion:
        context_parts.append(f"🤖 SUBAGENT SUGGESTION: {subagent_suggestion}")
    
    # Add architecture reminders for code changes
    if re.search(r"implement|create|add|build|modify|change", prompt.lower()):
        context_parts.append(
            "📋 ARCHITECTURE REMINDERS:\n"
            "- Check domain boundaries (health/, memory/, chat/, etc.)\n"
            "- Follow file size limits (components: 300 lines, services: 200 lines)\n"
            "- Use existing patterns and libraries\n"
            "- Run validation after changes"
        )
    
    # Output enhanced context
    if context_parts:
        enhanced_context = "\n\n".join(context_parts)
        print(enhanced_context)
    
    sys.exit(0)

if __name__ == "__main__":
    main()