# Todo: Expo + Golang Wellness App MVP

## Context & Investigation
- Extracting core features from existing wellness AI web app
- Building mobile-first with Expo for React Native
- Complete backend rewrite in Go (replacing Node.js/Express)
- Maintaining compatibility with Replit (Neon) and local PostgreSQL
- Focus on exceptional code quality and AI-friendly architecture
- Parallel development of backend and frontend features

## Scope
### MVP Features
1. **AI Chat with Memory**
   - Multi-provider support (Google Gemini, OpenAI)
   - Automatic memory detection and storage
   - Context-aware memory retrieval
   - File attachments in chat (photos, documents)

2. **Memory Management**
   - Manual CRUD operations
   - Deduplication system
   - GDPR compliance (edit/delete)
   - Categories: preferences, personal_context, instructions, food_diet, goals

3. **Basic Health Tracking**
   - Integration with smartphone health data
   - Simple visualization
   - AI can access health context

4. **File Management**
   - Import files for AI access
   - Chat photo/file storage
   - Categorization system
   - Retention policies

5. **Settings**
   - Language selection
   - Theme toggle (light/dark/system)
   - AI provider configuration

6. **Authentication** (Final phase)
   - Simple username/password
   - JWT tokens
   - Shared between web/mobile

### Technical Requirements
- Phone-only initially (no tablet optimization)
- Online-only with connection status indicator
- Native features: camera, future biometrics, push notifications
- Shared database between mobile and potential web interface
- No Docker - direct Go binary execution like current repo

## Architecture Design

### Directory Structure
```
wellness-expo-go/
├── apps/
│   ├── mobile/          # Expo app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   └── app.json
│   └── web/            # Future web app (optional)
├── backend/
│   ├── cmd/            # Entry points for services
│   ├── internal/       # Private packages
│   │   ├── ai/         # AI provider integrations
│   │   ├── chat/       # Chat service
│   │   ├── file/       # File management
│   │   ├── health/     # Health data
│   │   ├── memory/     # Memory service
│   │   ├── auth/       # Authentication (last)
│   │   └── shared/     # Shared utilities
│   ├── pkg/            # Public packages
│   │   ├── models/     # Data models
│   │   ├── database/   # DB connection
│   │   └── config/     # Configuration
│   └── migrations/     # SQL migrations
├── shared/             # Shared between frontend/backend
│   ├── types/          # TypeScript/Go type definitions
│   └── constants/      # Shared constants
├── scripts/            # Build and development scripts
├── docs/               # Documentation
│   └── system-maps/    # AI-friendly system maps
└── .env.example        # Environment configuration
```

### Go Backend Architecture

#### Service Decomposition (Single Process, Multiple Packages)
```go
// main.go - Single entry point
func main() {
    // Initialize all services
    router := gin.New()
    
    // Mount service routes
    chatService.RegisterRoutes(router.Group("/api/chat"))
    memoryService.RegisterRoutes(router.Group("/api/memory"))
    aiService.RegisterRoutes(router.Group("/api/ai"))
    fileService.RegisterRoutes(router.Group("/api/files"))
    healthService.RegisterRoutes(router.Group("/api/health"))
    
    router.Run(":8080")
}
```

### Development Approach: Parallel Backend/Frontend Blocks

## Implementation Strategy - Feature Blocks

### Block 1: AI Chat Foundation
**Backend (Go) - Week 1-2**
```
- AI service package
  - Gemini provider integration
  - OpenAI provider integration
  - Streaming SSE implementation
  - Provider abstraction interface
- Chat service package  
  - Message storage
  - Conversation management
  - Basic chat API endpoints
```

**Frontend (Expo) - Week 1-2**
```
- Project setup
  - Expo initialization
  - Navigation structure
  - Theme system (light/dark)
  - Basic component library
- Chat UI
  - Message list component
  - Input component
  - Streaming message display
  - Mock data for testing
```

### Block 2: Memory System
**Backend (Go) - Week 3-4**
```
- Memory service package
  - CRUD operations
  - Embedding generation (using AI service)
  - Deduplication logic
  - Semantic search
  - Category management
- Integration with chat service
  - Memory detection in messages
  - Auto-save memories
```

**Frontend (Expo) - Week 3-4**
```
- Memory screens
  - Memory list with categories
  - Memory detail/edit screen
  - Create memory screen
  - Search/filter UI
- Connect to backend APIs
  - Memory CRUD operations
  - Real-time updates
```

### Block 3: File Management
**Backend (Go) - Week 5-6**
```
- File service package
  - Upload/download handlers
  - File compression (>5MB)
  - Category management
  - Retention policies
  - Storage abstraction
- Chat integration
  - File attachments in messages
  - Image preview generation
```

**Frontend (Expo) - Week 5-6**
```
- File management screens
  - File grid/list view
  - Upload interface
  - Category selector
- Chat enhancements
  - Photo capture/selection
  - File attachment UI
  - Preview components
```

### Block 4: Health Integration
**Backend (Go) - Week 7**
```
- Health service package
  - Data models
  - Import endpoints
  - Basic calculations
  - Trend analysis
- AI context integration
  - Health data in prompts
```

**Frontend (Expo) - Week 7**
```
- Health screens
  - Dashboard UI
  - Data import from phone
  - Basic visualizations
- Settings enhancement
  - Health permissions
  - Data preferences
```

### Block 5: Polish & Integration
**Week 8-9**
```
Backend:
- Error handling improvements
- Performance optimization
- Caching layer
- Rate limiting
- Monitoring/logging

Frontend:
- Offline message queue
- Loading states
- Error boundaries
- Performance optimization
- Accessibility
```

### Block 6: Authentication (Final)
**Week 10**
```
Backend:
- Auth service package
  - JWT implementation
  - User registration/login
  - Session management
  - Middleware integration

Frontend:
- Auth screens
  - Login screen
  - Register screen
  - Password reset
- Token management
  - Secure storage
  - Auto-refresh
  - Logout handling
```

## Development Guidelines

### Running Services Locally
```bash
# Backend (similar to current repo)
cd backend
go mod download
go run cmd/main.go

# Frontend
cd apps/mobile
npm install
npx expo start

# Database
# Use existing .env.local for local PostgreSQL
# or Replit's Neon for cloud development
```

### Replit Configuration
```json
{
  "run": "cd backend && go run cmd/main.go",
  "language": "go",
  "env": {
    "DATABASE_URL": "$REPLIT_DB_URL",
    "PORT": "8080"
  }
}
```

### Environment Variables
```bash
# .env.example
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
JWT_SECRET=...
FILE_STORAGE_PATH=./uploads
```

## Code Quality Standards

### Go Best Practices
```go
// @used-by: mobile-app/chat-screen
// @domain: chat
// @performance: Optimized for mobile bandwidth
func StreamChatResponse(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

### React Native/TypeScript
```typescript
// @used-by: chat-service
// @state: managed-by-context
// @offline: cached-in-async-storage
export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // Implementation
}
```

## Testing Strategy

### Parallel Testing Approach
- Unit tests written alongside each feature
- Integration tests after each block completion
- Manual testing on both iOS/Android simulators

### Test Coverage Goals
- Backend: 80% coverage minimum
- Frontend: Component tests for all screens
- E2E: Critical user flows

## Database Migration Strategy
1. Export existing schema
2. Adapt for Go models (using sqlc or gorm)
3. Maintain same table structure
4. Add indexes for performance

## Risk Mitigation

### Technical Risks
1. **Go learning curve** → Start with simple endpoints, iterate
2. **Expo limitations** → Research native modules early
3. **SSE on mobile** → Test connection stability
4. **File upload size** → Implement chunking

### Development Risks
1. **Parallel development sync** → Daily feature alignment
2. **API contract changes** → Define interfaces early
3. **Database schema evolution** → Use migrations from start

## Success Criteria
1. Feature parity with core web features
2. <2s response time for AI chat
3. Smooth scrolling with 1000+ messages
4. File uploads up to 50MB
5. Memory search <500ms
6. Works on both iOS/Android

## Questions for Clarification
1. Preferred Go web framework (Gin, Echo, Fiber)?
2. State management preference for Expo (Context, Zustand, Redux)?
3. File storage approach (local filesystem vs S3-compatible)?
4. Embedding model preference (OpenAI ada-002 vs others)?
5. Monitoring/analytics needs from day 1?

---

**Next Steps:**
1. Create new directory structure
2. Initialize Go module and Expo project
3. Start with Block 1 (AI Chat Foundation)
4. Set up basic CI/CD pipeline

**Estimated Timeline:** 10 weeks for MVP
**Development Approach:** Parallel backend/frontend by feature blocks