# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Development Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (client + server)
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

### Testing Commands
- `npx vitest` - Run Vitest test suite
- `npx vitest --run` - Run tests once without watch mode
- `npx vitest run client/src/tests/` - Run specific test directory
- `npm test` (if defined) - Run full test suite

### Validation Commands
- `npx tsc --noEmit` - TypeScript compilation check without output
- `npm run check` - checks for typescript errors

### Go Services (Microservices)
- `cd go-memory-service && go run .` - Start memory service (port 5002)
- `cd go-file-accelerator && go run .` - Start file accelerator (port 5001)
- `cd go-ai-gateway && go run .` - Start AI gateway service

## Architecture Overview

### Core Technology Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn/ui components
- **Backend**: Node.js + Express + TypeScript with modular routes architecture
- **Database**: PostgreSQL + Drizzle ORM with Neon Serverless
- **AI Providers**: Multi-provider system (OpenAI GPT-4o, Google Gemini 2.0 Flash)
- **Testing**: Vitest + @testing-library/react + supertest
- **Microservices**: Go services for memory processing, file acceleration, and AI gateway

### Modular Routes Architecture
The system uses a modular routes architecture (breaking down a 3,848-line monolithic file):
- `server/routes/chat-routes.ts` (≤280 lines) - Chat, streaming, transcription
- `server/routes/health-routes.ts` (≤300 lines) - Health data management
- `server/routes/memory-routes.ts` (≤280 lines) - Memory system and deduplication
- `server/routes/file-routes.ts` (≤270 lines) - File management and Go acceleration
- `server/routes/settings-routes.ts` (≤250 lines) - User settings and preferences
- `server/routes/monitoring-routes.ts` (≤260 lines) - Performance monitoring
- Shared infrastructure files with strict line limits enforced by validation script

### Key Architectural Patterns

#### AI Streaming System
- Server-Sent Events (SSE) for real-time streaming responses
- Custom `SmoothStreamingText` component with natural typing simulation
- Multi-provider abstraction layer supporting OpenAI and Google AI
- Automatic model selection based on message complexity and attachments

#### Memory Intelligence System
- Three-tier memory detection and retrieval with ChatGPT-style deduplication
- Background processing with circuit breaker protection and priority queues
- Semantic similarity using embeddings with configurable thresholds
- Performance-optimized memory core with <50ms operations

#### File Processing System
- Go-based microservices for high-performance file processing
- Automatic service startup for large files (>5MB) with TypeScript fallback
- Health data parsing for Apple Health XML, CDA XML, Google Fit JSON
- Streaming decompression for massive files (>500MB decompressed)

#### Database Design
- Strategic indexing for optimal query performance (46 performance indexes)
- Batch processing for large imports (1000 records per batch)
- Connection pooling with graceful shutdown handling
- Intelligent retention policies for file management

## Development Environment

### Multi-AI Development Setup
- **Primary Development**: Claude Code for complex features and architecture
- **Secondary Development**: Replit.com AI agent for rapid prototyping and environment-specific tasks
- **Environment Compatibility**: Always ensure changes are compatible with Replit environment to prevent deployment issues

## System Architecture Documentation

### System Mapping Workflow
- **System Maps Directory in JSON**: `.system-maps/json-system-maps/` contains structured JSON architecture documentation
- **Mapping Guide for JSON system maps**: Follow `.system-maps/json-system-maps/system-mapping-guide.md` for creating/updating system maps in JSON
- **Integration Validation**: System maps track actual vs expected API integrations with validation evidence

### Architecture Change Process
1. Deeply trace data flow and update relevant system maps when adding/modifying features
2. Ensure Replit environment compatibility
3. Verify all integration points remain functional
4. All code must be lean and necessary, not 'nice-to-have', to keep the codebase's size small
5. Propose lean Go code. as well as conversion from typescript to lean Go code as much as possible for best performance

## Development Guidelines

### Code Organization
- All React components in `client/src/components/` with corresponding hooks in `client/src/hooks/`
- Server services in `server/services/` with clear separation of concerns
- Database schema definitions in `shared/schema.ts`
- System maps in `.system-maps/` directory for architecture documentation

### Memory System Integration
When working with memories:
- Use `chatgpt-memory-enhancement.ts` for ChatGPT-style memory capabilities
- Background memory processing is non-blocking and uses priority queues
- All memory operations include deduplication with semantic similarity checking
- Memory detection happens automatically during chat streaming

### Health Data Processing
- Support for Apple Health XML, CDA XML, Google Fit JSON, and generic CSV
- Large files (>5MB) automatically attempt Go service acceleration
- Timestamp preservation is critical - use `data.timestamp || new Date()`
- Chunk-based processing prevents memory overflow for massive datasets

### File Management
- All uploaded files automatically enter retention policy management
- Go acceleration service provides 95%+ compression for large health files
- File categorization is automatic with manual override capabilities
- Static file serving from `/uploads` directory for client previews

### Testing Practices
- Use Vitest for all new tests (Jest has been migrated out)
- Server tests use supertest for API endpoint testing
- Component tests use @testing-library/react with proper JSX support
- Performance tests validate memory operations stay under target thresholds

### Performance Considerations
- Lazy loading implemented with staggered section loading
- Multi-level LRU caching with intelligent TTL management
- Background processing with circuit breaker patterns
- Progressive enhancement for Go services with TypeScript fallbacks

### Error Handling
- Structured logging service with configurable levels (DEBUG, INFO, WARN, ERROR)
- Circuit breaker implementation for background processing (5-failure threshold, 60s recovery)
- Graceful fallbacks for all Go service integrations
- Comprehensive error boundaries in React components

## Critical Implementation Notes

### Routes Modularization
- Line count limits are strictly enforced - the files must be refactor if it exceeds 300 lines of code but must NOT break existing functionalities
- All route modules must be imported in `server/routes/index.ts`
- Emergency rollback capability maintained via `USE_MONOLITHIC_ROUTES` flag
- Shared dependencies and utilities have separate modules with enforced limits

### Go Service Integration
- Services start automatically for large files but require graceful fallback handling
- Health checks use AbortController-based timeout handling
- All Go service communication is proxied through Express routes
- Zero breaking changes maintained - TypeScript processing remains primary

### Memory Performance
- Phase 1-4 memory system operational with performance targets met
- <50ms operations for critical memory paths (retrieval, enhancement, deduplication)
- Feature flags enable gradual rollout of memory enhancements
- Background processing maintains smooth chat experience

### Health Data Reliability
- Bulletproof processing system handles multi-gigabyte files without crashes
- Smart chunk analysis with timestamp filtering for memory efficiency
- Batch insert operations prevent database bottlenecks
- Original timestamp preservation critical for meaningful visualizations

### Feature safety
I1 — Feature Isolation:
It is strictly forbidden for any new feature to alter code linked to other features **if it risks modifying or breaking their behavior**, unless you do the following :  
  If alteration is required, you **must**:
  - Assess the **full impact** on all dependent features
  - Anticipate cascade effects
  - Propose **safe mitigation plans** before proceeding

I2 — Adaptive Re-evaluation:
If you encounter any obstacle forcing you to change your approach:
- You are forbidden from "trying something else" blindly
- You must pause and re-assess the entire task using the new constraint
- Then propose a new optimal path that still respects I1

### Planning
First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo-[title].md
The plan should have a list of todo items that you can check off as you complete them

Required Output when planning:
1. Feature scope and technical context
2. Dependency and risk assessment
3. Test plan and safety checks
4. Confirmation that app stability (HMR, DB, WebSockets) is preserved
5. Ensure there are no unused pieces of code, all implemented code must be integrated.
6. Ensure there are no conflicts between pieces of code.

### Executing plan
-Before you begin working on tasks of todo items in the tasks folder, check in with me and I will verify the plan.
-Then begin working on the todo items, marking them as complete as you go
-Every step of the way just give me a high level explanation of what changes you made
-Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity
-Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.

### Replit-specific constraints:
- Do NOT break Vite config, WebSocket, or HMR behavior
- `vite.config.ts` and `server.hmr` are fragile and easily misconfigured
- Even previously working commits have failed to restore a broken state — the system is delicate
- Avoid touching build systems, persistent sockets, or compression unless necessary

Avoid:
- Over-aggressive deduplication or HTTP/2 changes
- Modifying HMR setup or WebSocket handling
- Introducing new workflows or bypassing Replit's own tooling
- data samples / mock data

## Debugging
Think of all possibilities, don't just do 1 fix, think that the issue might be elsewhere, map all possible causes.

## Environment Configuration

### Database
- Neon PostgreSQL with WebSocket support
- Connection pooling with idle timeout configuration
- Database migrations run automatically on startup
- Health check reporting for monitoring

### AI Provider Configuration
- Multi-provider support with automatic model selection
- Provider abstraction allows easy addition of new AI services
- Embedding generation for memory similarity calculations
- Streaming protocol consistent across all providers

### Replit-Specific
- Optimized for Replit development environment
- Port mapping: development (5000) → production (80)
- Hot Module Replacement with stable WebSocket connections
- Auto-provisioned PostgreSQL with migration on startup

## Development Cleanup Guidelines
- If you create any temporary new files, scripts, or helper files for iteration (e.g. dev.log), clean up these files by removing them at the end of the task

This is a sophisticated wellness AI application with production-ready architecture, comprehensive testing, and high-performance processing capabilities for health data at scale.