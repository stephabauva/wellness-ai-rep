# Dependency Tracking Guide

## Overview
The dependency tracking system includes two main components:
1. **dependency-tracker.js** - Full analysis and system map enhancement
2. **dependency-check-hook.js** - Pre-commit validation

## Running Dependency Analysis

### Full Analysis
```bash
node dependency-tracker.js
```
This scans the entire project and:
- Analyzes cross-domain dependencies
- Categorizes legitimate patterns vs violations
- Enhances existing system maps with dependency data
- Generates detailed reports

### Available Scripts
```bash
# Install pre-commit hook (one-time setup)
./setup-dependency-hook.sh

# Manual dependency check for modified files
node dependency-check-hook.js
```

## After Installing the Pre-commit Hook

### What Happens Automatically
The hook runs before every `git commit` and:
- Scans modified files for cross-domain dependencies
- Shows warnings for high-impact changes
- Blocks commits to critical components
- Checks for proper @used-by annotations

### Example Hook Output
```bash
🔍 Checking cross-domain dependencies...

⚠️  Cross-Domain Dependencies Found:

1. client/src/hooks/useFileManagement.ts
   Domain: file-manager
   Impact: HIGH
   Used by:
     - chat: client/src/components/ChatInputArea.tsx
     - chat: client/src/components/ChatSection.tsx
   Annotations:
     @used-by chat/ChatInputArea - For file attachments in chat messages
     @cross-domain true
     @critical-path true

💡 Recommendations:
1. Review all affected domains before committing
2. Update @used-by annotations if adding new usage
3. Consider running tests for affected domains
4. Document any behavioral changes in CHANGELOG
```

### Legitimate Patterns vs Violations
The tracker now categorizes cross-domain usage:

**✅ Legitimate Patterns:**
- Section components used by pages
- Subdomain components within same domain
- Navigation components used by pages
- Shared UI components and utilities
- Infrastructure layer organization
- Service registry patterns

**🚨 True Violations:**
- Direct imports between business domains
- Bypassing shared interfaces
- Circular dependencies between domains

### When Hook Blocks Your Commit
If you see high-impact warnings, the hook may block your commit. You can:

1. **Review the changes** - Make sure you understand the impact
2. **Run tests** for affected domains:
   ```bash
   npm test -- --testPathPattern=chat
   npm test -- --testPathPattern=file-manager
   ```
3. **Update documentation** if needed
4. **Force commit** in emergencies:
   ```bash
   git commit --no-verify -m "Emergency fix"
   ```

## Annotation System

Add these comments to your files to improve tracking:

```typescript
// @used-by domain/component - Description of usage
// @cross-domain true - Indicates legitimate cross-domain usage
// @critical-path true - Marks component as critical (blocks commits)
// @risk high|medium|low - Risk assessment for changes
// @impact Changes affect chat memory detection and storage
```

## System Map Enhancement

The tracker automatically enhances existing system maps with:
- Actual usage data for components
- Cross-domain dependency tracking
- Cache invalidation patterns
- Risk level assessments

Enhanced maps include:
- `dependencyAnalysis` section with usage statistics
- `actualUsage` data for components
- `crossDomainInvalidates` cache patterns
- `dependencyTracking` for features

## Best Practices
- Always read the tracker output carefully
- Update @used-by annotations when adding new dependencies
- Test affected domains before committing
- Use descriptive commit messages explaining cross-domain impacts
- Run full analysis periodically: `node dependency-tracker.js`
- Check system maps are updated after architectural changes