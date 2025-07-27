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
**Dependency tracking**: dependency-tracker.js generates split dependency maps by domain (see dependency-maps/) and system-map-cross-domain-validator-v2.js analyze actual code imports
**@used-by annotations**: Add comments like @used-by domain/component to track dependencies
**Malformed import detection**: malformed-import-detector.js scans TypeScript/JavaScript files for syntax issues and path resolution problems in import statements
**Async/await compatibility**: async-await-detector.js prevents "Cannot read properties of undefined" errors by detecting service getter async mismatches
**File size analysis**: file-size-analyzer.js enforces line limits (300 for routes/components, 200 for services) and identifies oversized files needing refactoring
**Browser console error detection**: browser-console-error-detector.cjs scans for runtime error patterns, checks lazy loading, and generates browser console tests
**Frontend UI component monitoring**: frontend-ui-monitor.cjs detects component prop mismatches, missing required props, styling issues, and shared Dialog component problems with severity escalation for critical user flows
**Visual regression detection**: visual-regression-detector.cjs tests component rendering, modal visibility, z-index conflicts, and layout issues
**Integration testing analysis**: component-integration-test.cjs generates user interaction tests and identifies missing test coverage for critical user flows
**Specialized Subagents**: 8 domain-expert subagents in .claude/agents/ provide specialized assistance with automated hook integration
**Claude Code Hooks**: Automated validation, context enhancement, and guidance system in .claude/hooks/ integrates with multi-layer defense

### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npx vitest` - Run tests
- `npm run db:push` - Push database schema changes
- `cd go-[service] && go run .` - Start Go microservices
- `node system-map-tracker.js` - Check if modified files are documented in system maps
- `node dependency-tracker.js` - Analyze cross-domain dependencies (creates split maps in dependency-maps/)
- `node system-map-cross-domain-validator-v2.js` - Validate system maps against actual code
- `npm run check:async` - Check async/await compatibility to prevent undefined errors
- `npm run check:filesize` - Analyze file sizes using graduated thresholds (see .claude/commands/safe-refactor.md)
- `npm run check:ui` - Analyze UI components for prop mismatches, styling issues, and rendering problems with severity escalation
- `npm run check:visual` - Test component rendering, modal visibility, z-index conflicts, and layout issues
- `npm run check:integration` - Generate user interaction tests and identify missing test coverage for critical flows
- `npm run check:all` - Run all component analysis checks (ui, visual, integration, async, filesize)
- `node browser-console-error-detector.cjs` - Detect runtime browser console errors and generate test script
- `./setup-dependency-hook.sh` - Install pre-commit dependency check hook
- **CI Pipeline Commands** (implement Multi-Layer Defense System):
  - `npm run ci` - Core CI pipeline (ports + imports + TypeScript + build + functional validation)
  - `npm run ci:full` - Complete CI with comprehensive architecture checks and test coverage
  - `npm run ci:with-tests` - CI including full test suite execution
  - `npm run ci:local` - Interactive local CI runner with progress display
  - `npm run test:go` - Test all Go microservices
- **Multi-Layer Defense System Commands** (integrated into CI pipeline):
  - `npm run pre-commit` - Defense Layer 1: Ports + imports + TypeScript validation
  - `npm run safe-refactor` - Defense Layer 2: Dependencies + comprehensive architecture checks + functional validation
  - Individual validation tools for Layer 3 (runtime error detection)
- **Functional Validation Commands** (prevent stub implementation issues):
  - `npm run validate:quick` - Quick functional health check (all validations)
  - `npm run validate:db` - Database connectivity validation
  - `npm run validate:data` - Memory service data validation (catch stub implementations)
  - `npm run validate:memory` - Memory API endpoint validation
  - `npm run validate:functional` - Full functional validation suite

### Architecture Patterns & Rules
- **Modular routes**: Graduated size thresholds (300 ideal, 500 review, 800+ refactor)
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

### Specialized Subagents & Hook Integration
**Available Subagents** (use Task tool with appropriate subagent_type):
- **memory-system-specialist**: ChatGPT-style memory expert for deduplication, retrieval, performance optimization
- **health-data-validator**: HealthKit/Google Fit integration, nutrition inference, data validation specialist  
- **mobile-ui-optimizer**: Mobile-first UI/UX specialist for responsive design, touch interactions, performance
- **mobile-capacitor-specialist**: Capacitor deployment expert for converting web apps to native iOS/Android apps
- **go-microservice-expert**: Go services specialist for AI gateway, file processing, memory services
- **ci-pipeline-auditor**: CI/CD pipeline optimization and GitHub Actions expert
- **wellness-domain-architect**: Domain boundary specialist enforcing strict architectural rules
- **multi-layer-defense-auditor**: Architecture validation specialist preventing violations and conflicts
- **general-purpose**: Complex research, multi-step tasks, and code searching

**Claude Code Hooks** (automatic when using Claude Code):
- **Pre-edit validation**: Runs defense checks before file modifications
- **Post-edit validation**: Validates changes after edits (TypeScript, imports, system integrity)
- **Bash command validation**: Suggests improvements, blocks dangerous operations
- **Prompt enhancement**: Auto-adds wellness app context, suggests optimal subagents
- **Subagent optimization**: Validates subagent selection, provides completion guidance
- **Session validation**: Ensures system integrity at session end, suggests follow-ups

### Before Adding ANY New Code (Claude AI Responsibility) - Multi-Layer Defense Protocol
1. **ALWAYS run multi-layer defense checks first**: `npm run pre-commit` + `npm run safe-refactor` to validate ports, imports, dependencies, architecture, and functional behavior
2. **Mandatory safety sequence for ANY memory system changes**: `npm run pre-commit && npm run safe-refactor && npm run dev` (verify server startup)
3. **Functional validation**: `npm run validate:quick` to catch stub implementations and data flow issues
4. **Use specialized subagents**: Choose appropriate subagent for domain-specific tasks (hooks will suggest optimal choice)
5. Ask: "Does this belong in shared/ or a specific domain?"
6. Ask: "Can I enhance existing components vs creating new ones?"
7. Ask: "Is this service necessary or can it be a simple function?"
8. **Critical component check**: For Dialog/Modal components, immediately use custom HTML implementation instead of @shared/components/ui/dialog
9. **Automatically validate**: Run arch-guard checks before implementing features (hooks assist with this)
10. **Enforce limits**: Refuse to create new components/services if limits exceeded without consolidation plan

### Replit Constraints (Critical)
- **Do NOT Touch**: vite.config.ts, WebSocket handling, Build systems, Compression settings
- **Environment**: Port mapping dev (5000) → prod (80), WebSocket/HMR stability required

### Important References
- **Planning Process**: See commands/chew.md
- **Code Best Practices**: See commands/workit.md
- **Debugging & Investigation**: See commands/zapper.md
- **Architecture Guardian**: See commands/arch-guard.md
- **Clean Code Checklist**: See commands/clean-code.md
- **Multi-Layer Defense System**: See commands/defense-system.md
- **Safe Refactoring**: See commands/safe-refactor.md (now includes defense protocols)
- **Specialized Subagents**: See .claude/agents/ for domain expert descriptions and capabilities
- **Hook System Documentation**: See .claude/hooks/README.md for automated validation and enhancement details

### Manage your memory ##
You are responsible to manage the size of the conversation context for your best performance. If a task in a todo list is taking a lot of work and the amount of tokens in the context is getting long, you can use the /compact command.
---

**Remember**: This app prioritizes simplicity, safety, and user approval. Always reference the appropriate companion file for your task.