# workit.md

## Execution Philosophy
**Production-ready code only**: Every line must work, be integrated, and maintain stability.

## Development Workflow

### 1. Pre-Execution Checklist
- [ ] Plan approved by user
- [ ] System maps reviewed
- [ ] Dependencies checked
- [ ] Database migration needs assessed

### 2. During Development
1. **Mark todos** as in_progress/completed in real-time
2. **High-level updates** to user during execution
3. **Run system-map-tracker.js** after each file edit
4. **Test incrementally** - don't wait until end

### 3. Post-Development
1. Update system maps for modified features
2. Add review section to todo.md
3. Clean up temporary files
4. Run final tests

## Code Quality Standards

### Core Principles
- **Simplicity first**: Minimal code changes
- **No backward compatibility**: Don't bloat codebase
- **No optional features**: Everything must be integrated
- **Production-ready**: Fully functional, no TODOs
- **Lean approach**: Consider Go over TypeScript for performance

### Code Structure Rules
- **File size limit**: ≤300 lines per file
- **Component focus**: Single responsibility
- **Hook usage**: For state management
- **Error boundaries**: Always implement
- **TypeScript strict**: Verify with `npm run check`

### Dependency Management
```javascript
// Always add @used-by annotations
// @used-by chat/ChatInterface
// @used-by memory/MemoryProcessor
export const sharedUtility = () => {
  // ...
}
```

### Cross-Domain Safety
Before modifying shared code:
1. Run `node dependency-tracker.js`
2. Check all @used-by annotations
3. Test each dependent component

## Testing Requirements

### Test Execution
- `npx vitest` - Run all tests
- `npx vitest [file]` - Run specific test
- Always run tests before marking task complete

### Test Types
- **Unit tests**: Every new function
- **Integration tests**: API endpoints (supertest)
- **Component tests**: React components (@testing-library/react)
- **Performance tests**: Memory operations (<50ms target)

## Performance Guidelines

### Frontend
- Lazy load large components
- Implement multi-level caching with TTL
- Use React.memo for expensive renders
- Profile with React DevTools

### Backend
- Circuit breakers for external services
- Background processing must be non-blocking
- Chunk large data operations
- Consider Go microservices for >5MB files

### Memory System Specifics
- Use `chatgpt-memory-enhancement.ts`
- Always include deduplication
- Background processing non-blocking
- Target <50ms for critical paths

## Health Data Processing
- Preserve timestamps: `data.timestamp || new Date()`
- Support formats: Apple Health XML, CDA XML, Google Fit JSON
- Use Go service for files >5MB
- Implement chunk-based processing

## Integration Verification

### Before Marking Complete
- [ ] No unused imports or code
- [ ] No console.logs in production code
- [ ] All features integrated and accessible
- [ ] Error handling comprehensive
- [ ] Loading states implemented
- [ ] TypeScript types complete

### Final Checks
```bash
# Must pass all:
npm run check        # TypeScript
npx vitest          # Tests
npm run build       # Build verification
node system-map-tracker.js  # Documentation
```

## Common Pitfalls to Avoid
1. **Don't create new files** unless absolutely necessary
2. **Don't modify vite.config.ts** or WebSocket code
3. **Don't add features** without integration points
4. **Don't skip @used-by** annotations
5. **Don't ignore test failures**

## Quick Reference Commands
```bash
# During development
npm run dev                    # Start dev server
node dependency-tracker.js     # Check dependencies
node system-map-tracker.js     # Verify documentation

# Before completion
npm run check                  # TypeScript check
npx vitest                     # Run tests
npm run build                  # Verify build
```