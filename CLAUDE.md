# CLAUDE.md

This file provides guidance to Claude Code when working with this wellness AI application.

## App Overview

**Tech Stack**: React + TypeScript + Vite + Node.js + Express + PostgreSQL + Drizzle ORM
**Architecture**: Modular routes, Go microservices, multi-AI provider system
**Core Features**: AI chat with memory, health data processing, file management
**Databases setup**: Replit's neon database for cloud development (npm run dev) and postgresql with pg for local development (npm run dev:local with .env.local)
**System maps**: maps the architecture of each feature - .system-maps/json-system-maps/root.map.json is the main index that points to all domains and their subdomain maps
**User flows**: how the user interacts with the application is described in ./tasks/all-user-flows.md
**System map tracker**: system-map-tracker.js scans recently modified Git files and cross-references them with system maps
**Dependency tracking**: dependency-tracker.js and system-map-cross-domain-validator-v2.js analyze actual code imports
**@used-by annotations**: Add comments like @used-by domain/component to track dependencies
**Malformed import detection**: malformed-import-detector.js scans TypeScript/JavaScript files for syntax issues and path resolution problems in import statements
**Async/await compatibility**: async-await-detector.js prevents "Cannot read properties of undefined" errors by detecting service getter async mismatches

### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npx vitest` - Run tests
- `npm run db:push` - Push database schema changes
- `cd go-[service] && go run .` - Start Go microservices
- `node system-map-tracker.js` - Check if modified files are documented in system maps
- `node dependency-tracker.js` - Analyze cross-domain dependencies
- `node system-map-cross-domain-validator-v2.js` - Validate system maps against actual code
- `npm run check:async` - Check async/await compatibility to prevent undefined errors
- `./setup-dependency-hook.sh` - Install pre-commit dependency check hook

### Architecture Patterns & Rules
- **Modular routes**: Strict line limits enforced (≤300 lines each)
- **Memory system**: ChatGPT-style with deduplication
- **File processing**: Go microservices for large files
- **AI streaming**: SSE with smooth typing simulation
- **Domain Boundaries**: STRICT separation - health/, memory/, chat/, settings/, file-manager/, home/, auth/
- **Shared Folder Rules**: Only truly cross-cutting concerns (types, API utils, UI primitives)
- **Component Limits**: Max 25 total UI components, consolidate when exceeded
- **Service Limits**: Max 20 server services, merge single-method services
- **Cross-Domain Ban**: Never import from other domains, use proper APIs instead
- **File Organization**:
  - React components: `client/src/components/[domain]/`
  - Server routes: `server/routes/`
  - Database schema: `shared/schema.ts`
  - System maps: `.system-maps/json-system-maps/` 
  - System map's guide : `.system-maps/optimized-complete-map-blue-original.md`

### Before Adding ANY New Code (Claude AI Responsibility)
1. **ALWAYS run architectural checks first**: `node dependency-tracker.js`, `node malformed-import-detector.js`, and `npm run check:async`
2. Ask: "Does this belong in shared/ or a specific domain?"
3. Ask: "Can I enhance existing components vs creating new ones?"
4. Ask: "Is this service necessary or can it be a simple function?"
5. **Automatically validate**: Run arch-guard checks before implementing features
6. **Enforce limits**: Refuse to create new components/services if limits exceeded without consolidation plan

### Replit Constraints (Critical)
- **Do NOT Touch**: vite.config.ts, WebSocket handling, Build systems, Compression settings
- **Environment**: Port mapping dev (5000) → prod (80), WebSocket/HMR stability required

### Important References
- **Planning Process**: See commands/chew.md
- **Code Best Practices**: See commands/workit.md
- **Debugging & Investigation**: See commands/zapper.md
- **Architecture Guardian**: See commands/arch-guard.md
- **Clean Code Checklist**: See commands/clean-code.md

### Manage your memory ##
You are responsible to manage the size of the conversation context for your best performance. If a task in a todo list is taking a lot of work and the amount of tokens in the context is getting long, you can use the /compact command.
---

**Remember**: This app prioritizes simplicity, safety, and user approval. Always reference the appropriate companion file for your task.