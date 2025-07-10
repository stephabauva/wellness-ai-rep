# CLAUDE.md

This file provides guidance to Claude Code when working with this wellness AI application.

## App Overview

**Tech Stack**: React + TypeScript + Vite + Node.js + Express + PostgreSQL + Drizzle ORM
**Architecture**: Modular routes, Go microservices, multi-AI provider system
**Core Features**: AI chat with memory, health data processing, file management
**Databases setup** : Replit's neon database for cloud developmemt (npm run dev) and postgresql with pg for local development (npm run dev: local with .env.local)
**System maps** : maps the architecture of each feature - .system-maps/json-system-maps/root.map.json is the main index that points to all domains and their subdomain maps
**User flows** : how the user interacts with the application is described in ./tasks/all-user-flows.md
**System map tracker** : system-map-tracker.js scans recently modified Git files and cross-references them with system maps located in .system-maps/json-system-maps/. It categorizes files by domain (e.g., chat, health, memory, file-manager) and flags any modified files not documented in the system maps—helping ensure architecture documentation stays up to date.


### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npx vitest` - Run tests
- `npm run db:push` - Push database schema changes
- `cd go-[service] && go run .` - Start Go microservices

## Planning Rules

### Required Planning Process
1. Think, navigate the code, ultra think about all possibilities, **create plan first**: Write to `tasks/todo-[title].md` before coding
2. **Wait for approval**: Check with user before executing plan
3. **Plan must include**:
   - Feature scope and technical context
   - Dependency and risk assessment
   - Test plan and safety checks
   - Confirmation that app stability is preserved
   - Integration verification (no unused code)
   - Conflict check between code pieces
   - Production-ready validation

### Planning Template
```markdown
# Todo: [Feature Name]

## Scope
- [Brief description]
- [Technical context]

## Risk Assessment
- [Dependencies affected]
- [Potential conflicts]

## Tasks
- [ ] Task 1
   - Detailed explanation of problem and solution
- [ ] Task 2
   - ...

## Safety Checks
- [ ] HMR/WebSocket stability preserved
- [ ] No unused code
- [ ] No conflicts
- [ ] Production-ready

## Review
[To be filled after completion]
```

## Coding Rules

### Feature Safety (Critical)
**I1 - Feature Isolation**: Never alter code linked to other features if it risks breaking their behavior. If alteration required:
- Assess full impact on dependent features
- Anticipate cascade effects
- Propose safe mitigation plans before proceeding

**I2 - Adaptive Re-evaluation**: If obstacles force approach changes:
- Don't try alternatives blindly
- Pause and re-assess entire task
- Propose new optimal path respecting I1

### Code Quality Standards
- **Simplicity first**: Every change should impact minimal code
- **No backward compatibility**: Avoid bloating codebase
- **No optional features**: Everything implemented must be integrated
- **Production-ready**: All code must be fully functional
- **Lean approach**: Propose Go code over TypeScript for performance

### File Organization
- React components: `client/src/components/`
- Server routes: `server/routes/` (≤300 lines each)
- Database schema: `shared/schema.ts`
- System maps: `.system-maps/json-system-maps`

## Replit Constraints (Critical)

### Do NOT Touch
- `vite.config.ts` - Fragile HMR configuration
- WebSocket handling - Easily breaks
- Build systems - Replit-specific setup
- Compression settings - Can break deployment

### Environment Compatibility
- Always ensure Replit environment compatibility
- Port mapping: dev (5000) → prod (80)
- WebSocket connections must remain stable
- HMR must not break

## Execution Rules

### Development Workflow
1. **understand the context** Look at features' system maps in .system-maps/json-system-maps
2. **Plan first** → Get approval → Execute
3. **Mark todo items** as complete during work
4. **High-level updates** only during execution
5. **Review section** added to todo.md when complete
6. **Cleanup** temporary files at end
7. Execute the system map tracker system-map-tracker.js everytime files are edited.
8. **update the corresponding system maps** of the features you modified using .system-maps/optimized-complete-map-blue-original.md and always keep the central index .system-maps/json-system-maps/root.map.json up-to-date

### Testing Requirements
- Use Vitest for all tests with 'npx vitest'
- Server tests use supertest
- Component tests use @testing-library/react
- Performance tests for memory operations

### Architecture Patterns
- **Modular routes**: Strict line limits enforced
- **Memory system**: ChatGPT-style with deduplication
- **File processing**: Go microservices for large files
- **AI streaming**: SSE with smooth typing simulation

## Debugging Approach
Think of all possibilities, don't just do 1 fix. Map all possible causes before acting. If necessary, add some loggings, ask the user to test the feature and get the logs from the console.

## Development Guidelines

### Code Structure
Everytime you write code :
- Keep components focused and small
- No file bigger than 300 lines of code
- Use hooks for state management
- Implement proper error boundaries
- Follow TypeScript strict mode and verify with 'npm run check'
- Confirmation that app stability is preserved
- Integration verification (no unused code, no fallbacks)
- Conflict check between code pieces
- Production-ready validation

### Performance
- Lazy loading for large components
- Multi-level caching with TTL
- Background processing with circuit breakers
- Progressive enhancement for Go services

### Memory System
- Use `chatgpt-memory-enhancement.ts` for memory capabilities
- Background processing is non-blocking
- All operations include deduplication
- <50ms target for critical memory paths

### Health Data Processing
- Support Apple Health XML, CDA XML, Google Fit JSON
- Large files (>5MB) use Go acceleration
- Preserve timestamps: `data.timestamp || new Date()`
- Chunk-based processing for massive datasets

---

**Remember**: Simplicity, safety, and user approval before execution. Every change must be minimal, necessary, and production-ready.