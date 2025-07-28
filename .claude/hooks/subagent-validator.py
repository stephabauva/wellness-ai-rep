#!/usr/bin/env python3

"""
Subagent Validator Hook
Validates Task tool usage and suggests optimal subagent selection
"""

import json
import re
import sys
from typing import Dict, List, Optional

# Subagent expertise mapping
SUBAGENT_EXPERTISE = {
    "memory-system-specialist": {
        "patterns": [r"memory", r"deduplication", r"retrieval", r"chatgpt.*style"],
        "description": "ChatGPT-style memory system expert",
        "use_for": ["memory features", "bug fixes", "performance issues", "memory integrity"]
    },
    "health-data-validator": {
        "patterns": [r"health", r"nutrition", r"healthkit", r"google.*fit", r"data.*validation"],
        "description": "Health data processing specialist", 
        "use_for": ["health features", "data import", "nutrition processing", "data integrity"]
    },
    "mobile-ui-optimizer": {
        "patterns": [r"mobile", r"responsive", r"touch", r"ios", r"android", r"ui.*optimization"],
        "description": "Mobile-first UI/UX specialist",
        "use_for": ["mobile issues", "UI improvements", "cross-device compatibility"]
    },
    "mobile-capacitor-specialist": {
        "patterns": [r"capacitor", r"native.*app", r"app.*store", r"mobile.*deployment", r"webview", r"native.*plugin", r"ios.*build", r"android.*build"],
        "description": "Mobile Capacitor deployment specialist",
        "use_for": ["Capacitor setup", "native app conversion", "mobile deployment", "native API integration"]
    },
    "go-microservice-expert": {
        "patterns": [r"\bgo\b", r"microservice", r"gateway", r"file.*processing", r"concurrent"],
        "description": "Go microservices specialist",
        "use_for": ["Go service issues", "performance optimization", "microservice integration"]
    },
    "ci-pipeline-auditor": {
        "patterns": [r"ci", r"pipeline", r"build", r"test", r"deploy", r"github.*action"],
        "description": "CI/CD pipeline optimization expert",
        "use_for": ["CI pipeline analysis", "build optimization", "test automation"]
    },
    "wellness-domain-architect": {
        "patterns": [r"domain", r"architecture", r"boundary", r"component.*organization"],
        "description": "Domain boundary specialist",
        "use_for": ["domain structure", "architecture violations", "component organization"]
    },
    "multi-layer-defense-auditor": {
        "patterns": [r"defense", r"validation", r"architecture.*violation", r"dependency.*issue"],
        "description": "Multi-layer defense system validator",
        "use_for": ["architecture validation", "dependency issues", "port conflicts"]
    },
    "general-purpose": {
        "patterns": [r"search", r"research", r"complex.*task", r"multi.*step"],
        "description": "General-purpose agent for complex tasks",
        "use_for": ["complex research", "multi-step tasks", "code searching"]
    }
}

def analyze_prompt_for_subagent(prompt: str) -> Optional[str]:
    """Analyze a prompt and suggest the best subagent."""
    prompt_lower = prompt.lower()
    
    # Score each subagent based on pattern matches
    scores = {}
    for agent, info in SUBAGENT_EXPERTISE.items():
        score = 0
        for pattern in info["patterns"]:
            matches = len(re.findall(pattern, prompt_lower))
            score += matches
        
        if score > 0:
            scores[agent] = score
    
    if not scores:
        return None
    
    # Return the highest scoring subagent
    best_agent = max(scores.items(), key=lambda x: x[1])[0]
    return best_agent

def validate_subagent_usage(prompt: str, specified_agent: Optional[str]) -> List[str]:
    """Validate if the specified subagent is optimal for the task."""
    suggestions = []
    
    suggested_agent = analyze_prompt_for_subagent(prompt)
    
    if not suggested_agent:
        return suggestions
    
    if not specified_agent:
        suggestions.append(
            f"Consider using '{suggested_agent}' subagent for this task. "
            f"Specializes in: {', '.join(SUBAGENT_EXPERTISE[suggested_agent]['use_for'])}"
        )
    elif specified_agent != suggested_agent:
        suggestions.append(
            f"Current: '{specified_agent}' | Suggested: '{suggested_agent}' "
            f"({SUBAGENT_EXPERTISE[suggested_agent]['description']})"
        )
    
    return suggestions

def check_wellness_specific_patterns(prompt: str) -> List[str]:
    """Check for wellness app specific patterns that require special handling."""
    issues = []
    
    # Memory system critical operations
    if re.search(r"memory.*system.*chang", prompt.lower()):
        issues.append(
            "Memory system changes detected. MUST run multi-layer defense: "
            "'npm run pre-commit && npm run safe-refactor && npm run dev'"
        )
    
    # Domain boundary violations
    domain_keywords = ["health", "memory", "chat", "settings", "file-manager", "home", "auth"]
    mentioned_domains = [d for d in domain_keywords if d in prompt.lower()]
    
    if len(mentioned_domains) > 1:
        issues.append(
            f"Multiple domains mentioned ({', '.join(mentioned_domains)}). "
            "Ensure strict domain boundary separation."
        )
    
    # Critical file operations
    critical_files = ["vite.config", "package.json", "server/index", "schema"]
    for file_pattern in critical_files:
        if file_pattern in prompt.lower():
            issues.append(
                f"Critical file operation detected: {file_pattern}. "
                "Exercise extreme caution - run pre-commit validation first."
            )
    
    return issues

def load_settings() -> Dict:
    """Load settings from .claude/settings.json"""
    try:
        import os
        settings_path = os.path.join(os.environ.get('CLAUDE_PROJECT_DIR', ''), '.claude', 'settings.json')
        with open(settings_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"USE_SUB_AGENTS": True, "ASK_PERMISSION_TO_BYPASS_HOOK": False}

def main():
    # Check for bypass authorization
    import os
    if os.environ.get('CLAUDE_BYPASS_HOOKS') == 'true':
        print("🔓 BYPASSING HOOKS - User authorized", file=sys.stderr)
        sys.exit(0)
    
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    if tool_name != "Task":
        sys.exit(0)
    
    # Check if subagents are disabled
    settings = load_settings()
    if not settings.get("USE_SUB_AGENTS", True):
        if tool_input.get("subagent_type"):
            print("❌ SUBAGENT BLOCKED: USE_SUB_AGENTS is disabled in .claude/settings.json", file=sys.stderr)
            sys.exit(2)
        # Allow general tasks without subagent specification
        sys.exit(0)
    
    prompt = tool_input.get("prompt", "")
    specified_agent = tool_input.get("subagent_type")
    
    if not prompt:
        sys.exit(0)

    # Validate subagent selection
    suggestions = validate_subagent_usage(prompt, specified_agent)
    wellness_issues = check_wellness_specific_patterns(prompt)
    
    all_feedback = suggestions + wellness_issues
    
    if not all_feedback:
        sys.exit(0)

    print("🤖 SUBAGENT ANALYSIS:", file=sys.stderr)
    for feedback in all_feedback:
        print(f"  • {feedback}", file=sys.stderr)
    
    # Don't block, just provide suggestions
    sys.exit(0)

if __name__ == "__main__":
    main()