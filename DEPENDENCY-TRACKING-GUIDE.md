# Dependency Tracking Guide

## After Installing the Pre-commit Hook

### What Happens Automatically
The hook runs before every `git commit` and:
- Scans modified files for cross-domain dependencies
- Shows warnings for high-impact changes
- Blocks commits to critical components

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

### Best Practices
- Always read the hook output carefully
- Update @used-by annotations when adding new dependencies
- Test affected domains before committing
- Use descriptive commit messages explaining cross-domain impacts