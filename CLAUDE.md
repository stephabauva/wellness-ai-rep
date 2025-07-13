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

### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npx vitest` - Run tests
- `npm run db:push` - Push database schema changes
- `cd go-[service] && go run .` - Start Go microservices
- `node system-map-tracker.js` - Check if modified files are documented in system maps
- `node dependency-tracker.js` - Analyze cross-domain dependencies
- `node system-map-cross-domain-validator-v2.js` - Validate system maps against actual code
- `./setup-dependency-hook.sh` - Install pre-commit dependency check hook

### Architecture Patterns
- **Modular routes**: Strict line limits enforced (≤300 lines each)
- **Memory system**: ChatGPT-style with deduplication
- **File processing**: Go microservices for large files
- **AI streaming**: SSE with smooth typing simulation
- **File Organization**:
  - React components: `client/src/components/`
  - Server routes: `server/routes/`
  - Database schema: `shared/schema.ts`
  - System maps: `.system-maps/json-system-maps/` 
  - System map's guide : `.system-maps/optimized-complete-map-blue-original.md`

### Replit Constraints (Critical)
- **Do NOT Touch**: vite.config.ts, WebSocket handling, Build systems, Compression settings
- **Environment**: Port mapping dev (5000) → prod (80), WebSocket/HMR stability required

### Important References
- **Planning Process**: See commands/chew.md
- **Code Best Practices**: See commands/workit.md
- **Debugging & Investigation**: See commands/zapper.md

### Manage your memory ##
You are responsible to manage the size of the conversation context for your best performance. If a task in a todo list is taking a lot of work and the amount of tokens in the context is getting long, you can use the /compact command.
---

**Remember**: This app prioritizes simplicity, safety, and user approval. Always reference the appropriate companion file for your task.