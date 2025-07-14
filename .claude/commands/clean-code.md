# Clean Code Checklist

Ensures every new code addition maintains architectural quality.

## Before Writing Code

### 1. Domain Placement Check (Claude AI Auto-Validates)
```
❓ Which domain does this belong to?
✅ health/ - Health data, reports, medical info
✅ memory/ - Chat memory, conversation state
✅ chat/ - Chat interface, messaging
✅ settings/ - User preferences, config
✅ file-manager/ - File upload, management, processing
✅ home/ - Landing page, dashboard
✅ auth/ - Authentication, login, signup
✅ shared/ - ONLY cross-cutting utilities
❌ Don't default to shared/ for convenience
```

### 2. Component Creation Rules
```
❓ Do I need a new component?
✅ Can I enhance an existing component instead?
✅ Is this used in 3+ places? (if not, inline it)
✅ Does it add real value beyond a div wrapper?
❌ Current count: Check with `find client/src/components -name "*.tsx" | wc -l`
❌ Limit: 25 components total
```

### 3. Service Creation Rules
```
❓ Do I need a new service?
✅ Can this be a simple function instead?
✅ Does it have multiple responsibilities?
✅ Is it more than just a single method?
❌ Current count: Check with `find server/services -name "*.ts" | wc -l`
❌ Limit: 20 services total
```

## After Writing Code

### 4. Validation Commands
```bash
node dependency-tracker.js          # Check cross-domain violations
node malformed-import-detector.js   # Check import syntax
npm run build                       # Ensure it builds
npx vitest                         # Ensure tests pass
```

### 5. Import Rules
```
✅ Use domain-relative imports within domain
✅ Only import from shared/ for cross-cutting concerns
✅ Use proper TypeScript ESM syntax (.js for .ts files)
❌ Never import from other domains directly
❌ No ../../../ paths, use aliases instead
```

## Quality Gates
- Zero cross-domain violations
- Zero malformed imports
- Under component/service limits
- All tests passing
- Clean build output

## Red Flags
- "Just put it in shared for now"
- "I'll refactor this later"
- Creating wrapper components with no logic
- Single-method services
- Cross-domain imports for convenience