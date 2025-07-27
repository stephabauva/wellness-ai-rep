# zapper.md

## Debugging Philosophy
**Think of ALL possibilities**: Don't try one fix. Map every potential cause before acting.

## Investigation Process

### 1. Deep System Analysis (CI PIPELINE INTEGRATED)
**🛡️ Use CLAUDE.md CI pipeline for comprehensive diagnostics**

**Diagnostic approach:**
- Run `npm run ci:local` for interactive diagnostic session
- Use `npm run ci:full` for comprehensive system health check
- Refer to CLAUDE.md Key Commands for specific validation tools
- Check `git status && git log --oneline -10` for recent changes analysis

**Diagnostic coverage** (via CI pipeline):
- Port configuration, import resolution, TypeScript validation
- Cross-domain dependency analysis, functional validation
- Runtime error detection, UI component integrity
- Visual regression testing, integration test coverage

### 2. Problem Mapping Template
```markdown
## Issue: [Description]

### Symptoms
- What user sees
- Error messages  
- Console output (check with browser-console-error-detector.cjs)
- UI component rendering issues (check with npm run check:ui)
- Visual regression issues (check with npm run check:visual)
- Missing integration tests (check with npm run check:integration)
- Network tab findings
- Runtime errors in browser console

### System Map Analysis
- Affected domain: [from root.map.json]
- Component hierarchy: [trace through maps]
- Cross-domain touchpoints: [from dependency tracker - check dependency-maps/ for domain-specific analysis]

### Potential Causes (ALL of them)
1. **Frontend**
   - Component state issue?
   - Prop drilling problem?
   - Component prop mismatches (use npm run check:ui)?
   - Visual regression issues (use npm run check:visual)?
   - Missing user interaction tests (use npm run check:integration)?
   - Event handler bug?
   - Render cycle issue?
   - Dialog/Modal rendering problems?
   
2. **Backend**
   - Route handler error?
   - Middleware conflict?
   - Database query issue?
   - **Stub implementation** (methods returning empty data instead of actual queries)?
   - **Service method integrity** (methods not executing database queries)?
   - Session/auth problem?
   
3. **Integration**
   - API contract mismatch?
   - WebSocket connection?
   - CORS/proxy issue?
   - Environment variable?
   
4. **Infrastructure**
   - HMR/Vite issue?
   - Build configuration?
   - Replit-specific constraint?
   - Database connection?

### Investigation Plan
- [ ] Check each potential cause
- [ ] Add strategic logging
- [ ] Test in isolation
- [ ] Verify with user
```

## Debugging Toolkit

### Strategic Logging
```javascript
// Add breadcrumb logging
console.log('[ComponentName] Entering function X with:', {params});
console.log('[ComponentName] State before:', {relevantState});
console.log('[ComponentName] Result:', {result});

// API debugging
console.log('[API] Request:', method, url, body);
console.log('[API] Response:', status, data);
console.log('[API] Headers:', headers);
```

### Component Isolation
```javascript
// Temporarily bypass complex logic
if (process.env.NODE_ENV === 'development') {
  // return mock data to isolate issue
  return { testData: 'isolated' };
}
```

### Network Inspection
```javascript
// Intercept and log all requests
window.fetch = new Proxy(window.fetch, {
  apply(target, thisArg, args) {
    console.log('[Fetch]', args);
    return target.apply(thisArg, args);
  }
});
```

## Common Issue Patterns

### 1. "Feature suddenly stopped working"
- Check recent commits: `git diff HEAD~5`
- Review @used-by annotations for changes
- Run browser-console-error-detector.cjs to scan for runtime errors
- Verify database schema matches code
- Check environment variables

### 2. "Works locally but not in production"
- Environment variables different?
- Build process excluding files?
- Replit-specific constraints?
- CORS/proxy configuration?

### 3. "Intermittent errors"
- Race conditions in async code?
- WebSocket reconnection issues?
- Cache invalidation problems?
- Session timeout handling?

### 4. "Performance degradation"
- Memory leaks in React components?
- N+1 database queries?
- Large bundle size?
- Inefficient re-renders?

## Root Cause Analysis

### Data Flow Tracing
1. **User action** → Where triggered?
2. **Frontend handler** → Correct function called?
3. **API request** → Proper format/headers?
4. **Backend route** → Reached correct handler?
5. **Database query** → Executing as expected?
6. **Response flow** → Data transformed correctly?
7. **UI update** → State updated properly?

### State Debugging
```javascript
// Add to component for state tracking
useEffect(() => {
  console.log('[StateDebug] Component mount');
  return () => console.log('[StateDebug] Component unmount');
}, []);

useEffect(() => {
  console.log('[StateDebug] State changed:', {specificState});
}, [specificState]);
```

## Fix Verification Process (AUTO-DEFENSE INTEGRATED)

### Before Declaring Fixed (AUTOMATIC VALIDATION)
**🛡️ Complete defense system verification - all checks automatic!**

1. **Reproduce original issue** - Confirm you can trigger it
2. **Apply fix** - Make minimal change
3. **CI validation** - Use appropriate CI command:
   - `npm run ci` for core validation
   - `npm run ci:full` for comprehensive validation
4. **Side effect testing** - Run `npm run ci:local` to check for regressions
5. **Cleanup** - Remove debug code
6. **Commit** - Use `/commit` with CI validation included

### Multi-Browser Testing
- Chrome DevTools
- Firefox Developer Edition
- Safari Web Inspector
- Mobile responsive mode

## Emergency Procedures

### When Everything Is Broken
1. `git stash` - Save current work
2. `git checkout main` - Return to stable
3. `npm install` - Fresh dependencies
4. `npm run dev` - Verify base works
5. Incrementally apply changes

### Database Issues
```bash
# Check schema
npm run db:push --dry-run

# Reset if needed (CAUTION)
npm run db:reset

# Verify connections
psql $DATABASE_URL -c "SELECT 1"
```

### Quick Diagnostic Commands
**Use CI pipeline for comprehensive diagnostics:**
```bash
# CI Pipeline diagnostics (implements defense system)
npm run ci:local       # Interactive diagnostic session
npm run ci             # Core validation (TypeScript, ports, imports, build)
npm run ci:full        # Complete validation (includes all checks)

# Individual validation (when targeting specific issues)
npm run validate:quick    # Quick functional health check
npx vitest [file]         # Targeted test execution
node browser-console-error-detector.cjs  # Runtime error detection
```

# Dependency check
npm ls                # Dependency tree
npm outdated         # Version mismatches

# Git investigation  
git log --grep="[keyword]"  # Find related commits
git blame [file]            # Who changed what
```

## Remember
- **Don't guess** - Investigate systematically
- **Don't rush** - Complex apps need careful debugging
- **Don't fix symptoms** - Find root causes
- **Don't work blind** - Add logging first
- **Don't skip tests** - Verify every fix