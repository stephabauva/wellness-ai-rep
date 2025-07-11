# plan.md

## Planning Philosophy
**Ultra-think before acting**: The app has grown complex. Every change requires deep consideration of ripple effects.

## Required Planning Process

### 1. Pre-Planning Investigation
- Navigate the codebase thoroughly
- Check relevant system maps in `.system-maps/json-system-maps/`
- Run dependency tracker to understand connections
- Consider ALL possible impacts

### 2. Create Written Plan
**Always write to** `tasks/todo-[title].md` before coding

### 3. Wait for User Approval
**Never proceed without explicit approval**

## Planning Template

```markdown
# Todo: [Feature Name]

## Context & Investigation
- Current state analysis
- System map references checked
- Dependencies identified via dependency-tracker.js

## Scope
- Brief description
- Technical context
- Affected domains/features

## Risk Assessment
- Dependencies affected (from @used-by annotations)
- Potential cascade effects
- Cross-domain impacts
- WebSocket/HMR stability risks
- Database migration needs

## Implementation Strategy
- Approach selection rationale
- Why this approach over alternatives
- Integration points

## Tasks
- [ ] Task 1
   - Problem: [specific issue]
   - Solution: [detailed approach]
   - Files affected: [list with line numbers]
- [ ] Task 2
   - ...

## Safety Checks
- [ ] HMR/WebSocket stability preserved
- [ ] No unused code or fallbacks
- [ ] No conflicts between components
- [ ] Production-ready (no TODOs, console.logs)
- [ ] System maps will be updated
- [ ] Dependency annotations added

## Testing Plan
- Unit tests needed
- Integration tests required
- Manual testing checklist
- Performance impact verification

## Rollback Plan
If something breaks:
- Steps to revert
- Dependencies to check

## Review
[To be filled after completion]
- What worked
- What didn't
- Lessons learned
```

## Planning Rules

### Feature Isolation (I1)
**Never alter code linked to other features without full impact analysis**
- Check all @used-by annotations
- Run dependency-tracker.js first
- Document cascade effects
- Get approval for each affected domain

### Adaptive Re-evaluation (I2)
**When obstacles arise**:
- STOP trying alternatives
- Re-read system maps
- Re-analyze entire approach
- Write new plan respecting I1

### Complexity Management
- If task affects >3 files, break it down
- If task crosses domains, plan extra carefully
- If touching shared components, list ALL consumers

### Plan Approval Criteria
User must confirm:
1. Scope is clear and limited
2. Risks are acceptable
3. Approach makes sense
4. Testing is adequate

## Quick Planning Checklist
- [ ] Checked system maps
- [ ] Ran dependency tracker
- [ ] Listed all affected files
- [ ] Considered HMR/WebSocket impact
- [ ] Planned for database changes
- [ ] Included rollback strategy
- [ ] Written clear success criteria