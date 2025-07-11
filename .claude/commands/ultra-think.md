# ultra-think

Super ultra deep thinking command for finding the absolute best solutions, especially for codebase complexity and fast product shipping.

## Purpose
Engage in extensive, multi-layered analysis to identify optimal solutions that balance code quality, maintainability, and rapid delivery.

## Process

### 1. Deep Problem Analysis
- Decompose the problem into fundamental components
- Identify all stakeholders and their needs
- Map out explicit and implicit requirements
- Consider edge cases and future scenarios
- Analyze technical debt implications

### 2. Solution Space Exploration
- Generate multiple solution approaches (minimum 5)
- Consider unconventional and creative solutions
- Evaluate trade-offs for each approach
- Think beyond immediate implementation
- Consider long-term maintenance costs

### 3. Complexity Assessment
- Analyze cyclomatic complexity implications
- Evaluate cognitive load on developers
- Consider debugging and testing difficulty
- Assess modularity and reusability
- Identify potential bottlenecks

### 4. Speed vs Quality Optimization
- Identify MVP vs full solution boundaries
- Find opportunities for incremental delivery
- Locate areas where shortcuts are acceptable
- Pinpoint where quality cannot be compromised
- Design for future refactoring paths

### 5. Risk Analysis
- Technical risks and mitigation strategies
- Timeline risks and buffer requirements
- Dependency risks and fallback plans
- Performance risks and scaling concerns
- Security and reliability considerations

### 6. Implementation Strategy
- Define clear phases and milestones
- Identify parallelizable work streams
- Specify critical path dependencies
- Plan for iterative improvements
- Design measurement criteria

### 7. Decision Framework
- Cost-benefit analysis for each option
- Time-to-market considerations
- Technical debt accumulation rate
- Team capability alignment
- Business value delivery speed

## Output Format

```
# Ultra Deep Analysis: [Problem Statement]

## Core Problem Decomposition
- [Fundamental issues identified]
- [Hidden complexities discovered]
- [Assumption challenges]

## Solution Candidates
1. **[Solution Name]**
   - Approach: [Description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]
   - Complexity: [Low/Medium/High]
   - Speed to Ship: [Days/Weeks]

[... additional solutions ...]

## Recommended Approach
**Winner: [Solution Name]**

### Rationale
[Why this solution optimizes for both quality and speed]

### Implementation Phases
1. **Phase 1 (Ship in X days)**
   - [Critical features]
   - [Acceptable shortcuts]

2. **Phase 2 (Ship in Y days)**
   - [Quality improvements]
   - [Technical debt reduction]

### Critical Success Factors
- [What must go right]
- [Key dependencies]
- [Required resources]

### Risk Mitigation
- [Top risks and countermeasures]

## Alternative Paths
If constraints change:
- If time is critical: [Adjustment]
- If quality is paramount: [Adjustment]
- If resources increase: [Adjustment]
```

## Usage Examples

### Example 1: Architecture Decision
```
User: "Should we use microservices or keep the monolith for our growing app?"

Ultra Think Analysis:
- Considers current team size and expertise
- Analyzes specific pain points in monolith
- Evaluates operational complexity increase
- Identifies hybrid approaches
- Recommends phased migration strategy
```

### Example 2: Performance Optimization
```
User: "Our API is slow but we need to ship features fast"

Ultra Think Analysis:
- Profiles specific bottlenecks
- Identifies quick wins vs deep refactors
- Suggests caching strategies
- Proposes background job patterns
- Creates incremental optimization plan
```

## Key Principles

1. **No Sacred Cows**: Question every assumption
2. **Time Boxing**: Even deep thinking has limits
3. **Pragmatism**: Perfect is the enemy of shipped
4. **Clarity**: Complex problems need simple explanations
5. **Actionability**: Every analysis must lead to clear next steps

## When to Use

- Major architectural decisions
- Performance vs feature trade-offs
- Technical debt prioritization
- Refactoring vs rewriting decisions
- Scaling strategy planning
- Complex bug resolution approaches
- Integration pattern selection

## Remember

The goal is not to overthink, but to think deeply enough to find the path that delivers maximum value with minimum complexity. Sometimes the best solution is the simplest one that could possibly work.