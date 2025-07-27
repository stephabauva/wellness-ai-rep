# Code Generation Prompt: Wellness AI Mobile App from Scratch

Generate a complete wellness AI mobile application with Go backend, Expo frontend, and PostgreSQL database.

## Project Requirements

### Architecture
- **Backend**: Go with Gin framework, single binary deployment
- **Frontend**: Expo (React Native) with TypeScript
- **Database**: PostgreSQL with vector embeddings
- **Features**: AI chat with memory, file management, health tracking, settings

### Core Features to Implement
1. **AI Chat System with memory**: with text and audio, with and without attchmanets. Multi-provider (OpenAI, Gemini) with streaming responses
2. **Memory Management**: Semantic search with embeddings, with categories
3. **File Management**: Upload, compression, categorization
4. **Health Data**: Basic tracking and visualization
5. **Settings**: Theme, language, AI provider selection

## Backend Implementation (Go)

### Directory Structure
```
backend/
├── cmd/main.go
├── internal/
│   ├── ai/service.go
│   ├── chat/service.go
│   ├── memory/service.go
│   ├── file/service.go
│   ├── health/service.go
│   └── shared/middleware.go
├── pkg/
│   ├── database/connection.go
│   ├── models/types.go
│   └── config/config.go
├── migrations/001_initial.sql
├── go.mod
└── go.sum
```

### Generate Complete Backend Code

**1. Go Module Definition (go.mod)**
```go
module wellness-ai/backend

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/lib/pq v1.10.9
    github.com/joho/godotenv v1.5.1
    github.com/google/generative-ai-go v0.5.0
    github.com/sashabaranov/go-openai v1.17.9
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/pgvector/pgvector-go v0.1.1
)
```

**2. Main Application Entry Point (cmd/main.go)**
Create a complete main.go that:
- Loads environment variables
- Connects to PostgreSQL database
- Initializes all services (AI, Chat, Memory, File, Health)
- Sets up Gin router with CORS
- Registers all API routes under /api/v1
- Handles graceful shutdown
- Supports both Replit and local development

**3. Database Connection (pkg/database/connection.go)**
Implement:
- PostgreSQL connection with retry logic
- Support for both local and Neon database URLs
- Connection pooling configuration
- Health check functionality
- Vector extension initialization

**4. Data Models (pkg/models/types.go)**
Define complete structs for:
- User (ID, Username, PasswordHash, timestamps)
- Conversation (ID, UserID, Title, timestamps)
- Message (ID, ConversationID, Role, Content, Metadata, timestamp)
- Memory (ID, UserID, Content, Category, Embedding vector, Metadata, timestamps)
- File (ID, UserID, Filename, MimeType, Size, Category, StoragePath, timestamp)
- HealthData (ID, UserID, DataType, Value, Unit, RecordedAt, Source, timestamp)

**5. AI Service (internal/ai/service.go)**
Complete implementation with exact models from AI-Business-Opportunity-Scanner:
- Provider interface supporting three-tier model system:
  - **OpenAI Models**:
    - `gpt-4.1-nano-2025-04-14` - Nano tier (fast, cost-effective)
    - `o4-mini` - Mini tier (balanced performance)
    - `gpt-4.1-2025-04-14` - 4.1 tier (most comprehensive analysis)
    - `text-embedding-3-small` - For memory embeddings (1536 dimensions)
  - **Google Gemini Models**:
    - `gemini-1.5-flash-8b` - flash-8b tier (lite, ultra-fast) -> also the default model
    - `gemini-1.5-flash` - flash tier (flash, fast responses)
    - `gemini-1.5-pro` - pro tier (pro, advanced reasoning)
- Three-tier model selection logic:
  - **Flash-8b/Nano**: Quick responses, simple queries → `gemini-1.5-flash-8b` or `gpt-4.1-nano-2025-04-14`
  - **Flash/Mini**: Balanced queries → `gemini-1.5-flash` or `o4-mini`
  - **Pro/4.1**: Complex analysis, reasoning → `gemini-1.5-pro` or `gpt-4.1-2025-04-14`
- User-configurable tier selection in settings
- Streaming SSE responses with proper chunk handling
- Embedding generation : 2 options, 1- using OpenAI `text-embedding-3-small`, 2-using local on-device with ModernBERT Embed Base.
- Provider switching with graceful fallbacks
- Cost optimization through tier-based model selection
- Performance monitoring per tier and provider

**6. Chat Service (internal/chat/service.go)**
Full chat system with:
- Message CRUD operations
- Conversation management
- AI response streaming via SSE
- File attachment handling
- Memory integration (extract and auto-save important info)
- Routes: POST /chat, GET /conversations, GET /conversations/:id/messages

**7. Memory Service (internal/memory/service.go)**
Complete memory management:
- CRUD operations for memories
- Vector embedding generation and storage
- Semantic search using pgvector
- Deduplication logic
- Category management (e.g. preferences, personal_context, instructions, food_diet, goals)
- Routes: GET/POST/PUT/DELETE /memory, GET /memory/search

**8. File Service (internal/file/service.go)**
File management system:
- Multi-part file upload handling
- Automatic compression for files >5MB
- Category organization
- Storage path management
- MIME type validation
- Routes: POST /files/upload, GET /files, DELETE /files/:id

**9. Health Service (internal/health/service.go)**
Health data management:
- Manual data entry
- Data type validation
- Basic trend calculations
- Export functionality
- Routes: GET/POST /health, GET /health/trends

**10. Configuration (pkg/config/config.go)**
Environment-based configuration:
- Database URL handling
- API keys management
- File storage paths
- JWT secrets
- Server ports

**11. Database Schema (migrations/001_initial.sql)**
Complete PostgreSQL schema with:
- All tables with proper relationships
- Vector extension for embeddings
- Indexes for performance
- Foreign key constraints
- Default values and constraints

## Frontend Implementation (Expo)

### Directory Structure
```
apps/mobile/
├── src/
│   ├── screens/
│   │   ├── ChatScreen.tsx
│   │   ├── MemoryScreen.tsx
│   │   ├── FilesScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   └── FileUploader.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── storage.ts
│   ├── hooks/
│   │   └── useChat.ts
│   └── types/
│       └── index.ts
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json
```

### Generate Complete Frontend Code

**1. Expo Configuration (app.json)**
Complete Expo config with:
- App metadata (name, version, icons)
- Platform-specific settings (iOS/Android)
- Required permissions (camera, storage)
- Asset bundle patterns
- Plugin configurations

**2. Package Dependencies (package.json)**
All required dependencies:
- Expo SDK (~50.0.0)
- React Navigation (native, stack, bottom-tabs)
- React Native components (vector-icons, paper)
- Chat library (react-native-gifted-chat)
- State management (zustand)
- HTTP client (axios)
- Development dependencies

**3. Main App Component (App.tsx)**
Root application with:
- Navigation container setup
- Theme provider (light/dark/system)
- Bottom tab navigation
- Screen registrations
- Global error boundaries

**4. API Service (src/services/api.ts)**
Complete API client:
- Base configuration with environment URL
- Authentication header handling
- Request/response interceptors
- All endpoint methods (chat, memory, files, health)
- Error handling and retry logic
- SSE streaming for chat

**5. Chat Screen (src/screens/ChatScreen.tsx)**
Full chat interface:
- Message list with GiftedChat
- Real-time streaming message updates
- File attachment capabilities
- Camera integration
- Loading states and error handling
- Memory detection indicators

**6. Memory Screen (src/screens/MemoryScreen.tsx)**
Memory management interface:
- Category-filtered list view
- Search functionality
- Add/edit/delete operations
- Semantic search results
- Category selection picker

**7. Files Screen (src/screens/FilesScreen.tsx)**
File management:
- Grid/list toggle view
- File upload from camera/gallery
- Category organization
- File preview
- Delete functionality
- Storage usage indicator

**8. Settings Screen (src/screens/SettingsScreen.tsx)**
Application settings:
- Theme selection (light/dark/system)
- Language picker
- AI provider selection
- Account management
- About/version info

**9. Chat Hook (src/hooks/useChat.ts)**
Custom hook for chat functionality:
- Message state management
- SSE connection handling
- Send message logic
- File attachment processing
- Memory integration
- Connection status

**10. TypeScript Definitions (src/types/index.ts)**
Complete type definitions:
- API response types
- Message interfaces
- Memory types
- File types
- Health data types
- Navigation types

## Database Schema

### Complete SQL Schema (migrations/001_initial.sql)

Generate full PostgreSQL schema:

**1. Extensions and Setup**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**2. Users Table**
Complete user management with authentication fields

**3. Conversations and Messages**
Chat system tables with proper relationships and indexes

**4. Memory Table**
Memory storage with vector embeddings column (vector(1536)) and category enum

**5. Files Table**
File metadata storage with path, size, mime type tracking

**6. Health Data Table**
Health metrics with flexible data type and unit storage

**7. Indexes**
Performance indexes on all foreign keys, search fields, and vector columns

## Replit Configuration

**1. .replit File**
Complete Replit configuration:
- Multi-language support (Go, Node.js, PostgreSQL)
- Port mappings (8080 for backend, 19000 for Expo)
- Run commands for development
- Build and deployment scripts

**2. replit.nix**
Nix package requirements:
- Go 1.21
- Node.js 20
- PostgreSQL 16
- Development tools

**3. Environment Variables**
Complete .env.example with:
- Database connection strings
- API keys for AI providers
- JWT secrets
- File storage configuration
- Development flags

## Development Scripts

**1. Setup Script (setup.sh)**
Automated setup:
- Database initialization
- Dependency installation
- Environment file creation
- Initial migration run

**2. Development Commands**
Package.json scripts for:
- Backend development server
- Frontend Expo server
- Database migrations
- Testing commands
- Build processes

## Code Quality Requirements

**1. Error Handling**
- Comprehensive error responses
- Graceful degradation
- User-friendly error messages
- Logging for debugging

**2. Performance**
- Database query optimization
- Response caching where appropriate
- Efficient vector operations
- Mobile-optimized payloads

**3. Security**
- Input validation
- SQL injection prevention
- File upload security
- Rate limiting

**4. Documentation**
- @used-by annotations on all functions
- Clear function/component comments
- API endpoint documentation
- Setup and deployment guides

## Implementation Instructions

1. **Start with Backend**: Generate all Go files first
2. **Database Schema**: Create and test all tables
3. **API Endpoints**: Implement and test all routes
4. **Frontend Screens**: Build each screen completely
5. **Integration**: Connect frontend to backend APIs
6. **Testing**: Add basic tests for critical paths
7. **Deployment**: Configure for Replit production

Generate all code files as complete, production-ready implementations without placeholders or TODO comments. Each file should be fully functional and follow best practices for the respective technology stack.