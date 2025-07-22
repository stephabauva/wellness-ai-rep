# workit.md

## Execution Philosophy
**Production-ready code only**: Every line must work, be integrated, and maintain stability.

## Development Workflow

### 1. Pre-Execution (AUTO-DEFENSE INTEGRATED)
**🛡️ Defense system runs automatically - no manual intervention needed!**

- [ ] Plan approved by user (from chew.md process)
- [ ] TodoWrite tasks created and prioritized
- [ ] **Auto-defense validation**: Architecture validated with comprehensive defense system
  ```bash
  # Runs automatically when you use /workit:
  npm run pre-commit      # Ports + imports + TypeScript
  npm run safe-refactor   # Dependencies + architecture  
  npm run dev --validate  # Server startup verification
  ```

### 2. During Development (AUTO-DEFENSE INTEGRATED)
1. **Mark TodoWrite tasks** as in_progress/completed in real-time
2. **High-level updates** to user during execution
3. **Auto-incremental testing** - defense system validates every change
4. **Auto-system maps update** - system maps updated automatically
5. **Auto-commits** - each completed task creates automatic safe commit with /commit integration

### 3. Execution Principles
- **Simplicity first**: Minimal code changes that solve the problem
- **Integration required**: Everything must be fully functional, no TODOs
- **Consider Go services**: For performance-critical operations (>5MB files, heavy processing)
- **Incremental delivery**: Ship working features, enhance iteratively

## App-Specific Development Patterns

### Memory System Development
- Use `chatgpt-memory-enhancement.ts` for memory processing
- Background processing must be non-blocking
- Target <50ms for critical memory operations
- Always include deduplication logic

### Health Data Processing
- Preserve timestamps: `data.timestamp || new Date()`
- Support formats: Apple Health XML, CDA XML, Google Fit JSON
- Use Go service for files >5MB
- Implement chunk-based processing for large datasets

### AI Integration Patterns
- Multi-provider system (OpenAI GPT-4o, Google Gemini 2.0 Flash)
- SSE streaming with smooth typing simulation
- Context building with memory integration
- Automatic model selection based on complexity

### Testing During Development
- `npx vitest` - Run affected tests frequently
- `npx vitest [file]` - Test specific functionality immediately
- `npm run check:ui` - Check UI components for prop mismatches and rendering issues
- `npm run check:visual` - Test component rendering, modal visibility, z-index conflicts, and layout issues
- `npm run check:integration` - Generate user interaction tests and identify missing test coverage for critical flows
- `npm run check:all` - Run all component analysis checks (ui, visual, integration, async, filesize)
- **Unit tests**: Every new function, especially utilities
- **Integration tests**: API endpoints with realistic data
- **Performance tests**: Memory operations, file processing
- **Component tests**: React components with real user interactions

## Performance Guidelines

### Frontend Performance
- **Lazy load components**: Use React.lazy() for routes and heavy components
- **Optimize re-renders**: React.memo for expensive components, useMemo for calculations
- **Streaming optimizations**: SmoothStreamingText component with natural typing rhythm
- **Query optimization**: React Query caching for AI responses and health data

### Backend Performance  
- **Go services**: Leverage existing Go microservices for file processing
- **Non-blocking operations**: Memory detection and health data processing in background
- **Chunked processing**: Split large operations (health data imports, file processing)
- **Connection pooling**: Use Neon serverless connection pooling effectively

### Wellness App Specific Optimizations
- **AI streaming**: Maintain SSE connections efficiently, handle reconnections
- **Memory system**: Cache frequent memory queries, batch memory updates
- **Health data**: Index by date ranges, optimize for time-series queries

## Integration Verification

### Before Marking TodoWrite Tasks Complete
- [ ] Feature fully integrated into existing user flows
- [ ] Error handling with user-friendly messages
- [ ] Loading states for all async operations
- [ ] TypeScript types complete and strict
- [ ] No console.logs in production code
- [ ] System maps updated if architecture changed

### Final Validation (AUTO-DEFENSE INTEGRATED)
**🛡️ Complete defense system activation - all validation automatic!**

```bash
# Runs automatically when you use /workit (comprehensive defense):
npm run safe-refactor          # Full architecture + dependency analysis  
npm run check:all              # UI, visual, integration, async, filesize
npm run build                  # Production build verification
node browser-console-error-detector.cjs  # Runtime error detection
/commit "Complete feature implementation with full validation"  # Auto-commit with defense
```

**Auto-execution includes**:
- Defense system full sweep (ports, imports, TypeScript, dependencies)
- Comprehensive component analysis (UI integrity, visual regression, integration tests)  
- Server startup verification with health check
- Production build verification
- Runtime error detection and browser console analysis
- System documentation auto-update
- Intelligent commit with comprehensive validation message

## Critical Replit Constraints
- **Never modify**: vite.config.ts, WebSocket handling, compression settings
- **Environment aware**: Port mapping dev (5000) → prod (80)
- **HMR stability**: Maintain hot module replacement for development efficiency

## Execution Reminders
- **File limits**: ≤300 lines per route/component
- **Domain boundaries**: Respect health/, memory/, chat/, settings/, file-manager/, home/, auth/
- **Component/service limits**: Check totals before creating new ones
- **Integration first**: Every feature must be accessible through UI and working end-to-end
- **Remove old code**: When you modify existing code, and you create new code to replace an old one, remove the old one, only active code must stay.