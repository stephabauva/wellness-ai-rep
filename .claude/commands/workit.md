# workit.md

## Execution Philosophy
**Production-ready code only**: Every line must work, be integrated, and maintain stability.

## Development Workflow

### 1. Pre-Execution (CI PIPELINE INTEGRATED)
**🛡️ Use CI pipeline commands from CLAUDE.md for validation**

- [ ] Plan approved by user (from chew.md process)
- [ ] TodoWrite tasks created and prioritized
- [ ] **CI validation**: Run appropriate CI command (see CLAUDE.md Key Commands)
  - `npm run ci:full` for comprehensive validation
  - `npm run ci` for core validation during iteration

### 2. During Development (CI PIPELINE INTEGRATED)
1. **Mark TodoWrite tasks** as in_progress/completed in real-time
2. **High-level updates** to user during execution
3. **Incremental CI validation** - use CLAUDE.md CI commands after changes
4. **Auto-system maps update** - system maps updated automatically
5. **CI-validated commits** - use /commit with CI validation

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
**Refer to CLAUDE.md Key Commands for CI pipeline commands**
- Use `npm run ci:local` for interactive validation during development
- Use `npm run ci` for quick validation after changes
- Use `npx vitest [file]` for targeted testing
- **Focus areas**: Unit tests for new functions, integration tests for APIs, component tests for UI

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

### Final Validation (CI PIPELINE INTEGRATED)
**🛡️ Use CLAUDE.md CI pipeline for comprehensive validation**

- Run `npm run ci:full` for complete validation before completion
- Use `/commit` command which includes CI validation
- Refer to CLAUDE.md Key Commands for specific validation needs

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