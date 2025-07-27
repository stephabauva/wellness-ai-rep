# Replit Setup Prompt: Expo + Golang Wellness App

## Project Overview
Create a mobile-first wellness AI application with:
- **Frontend**: Expo (React Native) for iOS/Android
- **Backend**: Complete Go rewrite of existing Node.js/Express system
- **Database**: PostgreSQL (Neon for cloud, local PostgreSQL for development)
- **Architecture**: Monorepo with parallel backend/frontend development

## Directory Structure to Create
```
wellness-expo-go/
├── apps/
│   ├── mobile/              # Expo React Native app
│   │   ├── src/
│   │   │   ├── screens/     # Chat, Memory, Health, Files, Settings
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── services/    # API client services
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── utils/       # Helper functions
│   │   │   └── types/       # TypeScript interfaces
│   │   ├── app.json         # Expo configuration
│   │   ├── package.json     # Frontend dependencies
│   │   └── tsconfig.json    # TypeScript config
│   └── web/                 # Future web app (optional)
├── backend/
│   ├── cmd/
│   │   └── main.go          # Single entry point
│   ├── internal/            # Private Go packages
│   │   ├── ai/              # AI provider integrations (Gemini, OpenAI)
│   │   ├── chat/            # Chat service with SSE streaming
│   │   ├── memory/          # Memory management with embeddings
│   │   ├── file/            # File upload/management service
│   │   ├── health/          # Health data processing
│   │   ├── auth/            # JWT authentication (final phase)
│   │   └── shared/          # Common utilities
│   ├── pkg/                 # Public packages
│   │   ├── models/          # Data models
│   │   ├── database/        # DB connection & migrations
│   │   └── config/          # Configuration management
│   ├── migrations/          # SQL schema migrations
│   ├── go.mod               # Go module definition
│   └── go.sum               # Go dependencies
├── shared/                  # Cross-platform shared code
│   ├── types/               # Common type definitions
│   └── constants/           # Shared constants
├── scripts/                 # Build and development scripts
├── docs/
│   └── system-maps/         # AI-friendly architecture documentation
├── .env.example             # Environment variables template
├── .replit                  # Replit configuration
├── replit.nix               # Nix package configuration
├── README.md                # Setup and development guide
└── package.json             # Root workspace configuration
```

## Replit Configuration Files

### 1. `.replit` Configuration
```toml
modules = ["nodejs-20", "web", "postgresql-16", "go-1.21"]
run = "cd backend && go run cmd/main.go"
hidden = [".config", ".git", "node_modules", "dist", "apps/mobile/.expo"]

[nix]
channel = "stable-24_05"
packages = ["tree", "go", "zip", "psmisc", "nodejs-20_x", "yarn"]

[deployment]
deploymentTarget = "autoscale"
build = ["cd backend && go build -o main cmd/main.go"]
run = ["./backend/main"]

[[ports]]
localPort = 8080
externalPort = 80

[[ports]]
localPort = 19000
externalPort = 19000

[workflows]
runButton = "Start Backend"

[[workflows.workflow]]
name = "Start Backend"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "cd backend && go run cmd/main.go"
waitForPort = 8080

[[workflows.workflow]]
name = "Start Mobile Dev"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "cd apps/mobile && npx expo start --tunnel"
```

### 2. `replit.nix` Package Configuration
```nix
{ pkgs }: {
  deps = [
    pkgs.go_1_21
    pkgs.nodejs-20_x
    pkgs.yarn
    pkgs.postgresql
    pkgs.tree
    pkgs.zip
    pkgs.psmisc
  ];
}
```

### 3. Root `package.json` (Workspace Management)
```json
{
  "name": "wellness-expo-go",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/mobile"
  ],
  "scripts": {
    "dev:backend": "cd backend && go run cmd/main.go",
    "dev:mobile": "cd apps/mobile && npx expo start --tunnel",
    "dev": "npm run dev:backend",
    "build:backend": "cd backend && go build -o main cmd/main.go",
    "build:mobile": "cd apps/mobile && npx expo build",
    "setup": "npm run setup:mobile && npm run setup:backend",
    "setup:mobile": "cd apps/mobile && npm install",
    "setup:backend": "cd backend && go mod download",
    "db:migrate": "cd backend && go run migrations/migrate.go",
    "test:backend": "cd backend && go test ./...",
    "test:mobile": "cd apps/mobile && npm test"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 4. Backend Go Module (`backend/go.mod`)
```go
module wellness-expo-go/backend

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/joho/godotenv v1.5.1
    github.com/lib/pq v1.10.9
    github.com/golang-migrate/migrate/v4 v4.16.2
    github.com/google/generative-ai-go v0.5.0
    github.com/sashabaranov/go-openai v1.17.9
    github.com/golang-jwt/jwt/v5 v5.2.0
    golang.org/x/crypto v0.17.0
)
```

### 5. Backend Main Entry Point (`backend/cmd/main.go`)
```go
package main

import (
    "log"
    "os"
    
    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    
    "wellness-expo-go/backend/internal/ai"
    "wellness-expo-go/backend/internal/chat"
    "wellness-expo-go/backend/internal/memory"
    "wellness-expo-go/backend/internal/file"
    "wellness-expo-go/backend/internal/health"
    "wellness-expo-go/backend/pkg/database"
    "wellness-expo-go/backend/pkg/config"
)

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }
    
    // Initialize database
    db, err := database.Connect()
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()
    
    // Initialize services
    cfg := config.Load()
    aiService := ai.NewService(cfg)
    chatService := chat.NewService(db, aiService)
    memoryService := memory.NewService(db, aiService)
    fileService := file.NewService(db)
    healthService := health.NewService(db)
    
    // Setup router
    router := gin.New()
    router.Use(gin.Logger())
    router.Use(gin.Recovery())
    
    // Enable CORS for mobile app
    router.Use(func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        
        c.Next()
    })
    
    // Register routes
    v1 := router.Group("/api/v1")
    {
        chatService.RegisterRoutes(v1.Group("/chat"))
        memoryService.RegisterRoutes(v1.Group("/memory"))
        fileService.RegisterRoutes(v1.Group("/files"))
        healthService.RegisterRoutes(v1.Group("/health"))
    }
    
    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })
    
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    
    log.Printf("Server starting on port %s", port)
    if err := router.Run(":" + port); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}
```

### 6. Mobile App Configuration (`apps/mobile/app.json`)
```json
{
  "expo": {
    "name": "Wellness AI",
    "slug": "wellness-ai-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.wellness.ai.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.wellness.ai.mobile"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-camera",
      "expo-media-library",
      "expo-document-picker"
    ],
    "extra": {
      "apiUrl": "https://your-replit-url.repl.co/api/v1"
    }
  }
}
```

### 7. Mobile Package.json (`apps/mobile/package.json`)
```json
{
  "name": "wellness-ai-mobile",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "expo build:android",
    "build:ios": "expo build:ios"
  },
  "dependencies": {
    "expo": "~50.0.0",
    "expo-status-bar": "~1.11.1",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "expo-camera": "~14.0.5",
    "expo-media-library": "~15.9.1",
    "expo-document-picker": "~11.10.1",
    "expo-constants": "~15.4.5",
    "react-native-vector-icons": "^10.0.3",
    "react-native-paper": "^5.12.3",
    "react-native-gifted-chat": "^2.4.0",
    "react-query": "^3.39.3",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "typescript": "^5.1.3"
  }
}
```

### 8. Environment Variables (`.env.example`)
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/wellness_ai
REPLIT_DB_URL=${DATABASE_URL}

# AI Providers
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# File Storage
FILE_STORAGE_PATH=./uploads
MAX_FILE_SIZE=52428800

# Server
PORT=8080
GIN_MODE=release

# Development
NODE_ENV=development
```

### 9. Database Migration (`backend/migrations/001_initial.up.sql`)
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Memory table with vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    storage_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Health data table
CREATE TABLE health_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    data_type VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    recorded_at TIMESTAMP NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_health_data_user_id ON health_data(user_id);
CREATE INDEX idx_health_data_type ON health_data(data_type);
```

## Setup Instructions for Replit

### Phase 1: Initial Project Setup
1. **Create New Repl**: Choose "Import from GitHub" or "Blank Repl" with Go template
2. **Setup Directory Structure**: Create the folder structure as shown above
3. **Configure Environment**: 
   - Add environment variables in Replit Secrets
   - Ensure PostgreSQL database is created and accessible
4. **Install Dependencies**:
   ```bash
   # Backend dependencies
   cd backend && go mod download
   
   # Frontend dependencies  
   cd apps/mobile && npm install
   ```

### Phase 2: Database Setup
1. **Connect to PostgreSQL**: Use Replit's built-in PostgreSQL or Neon
2. **Run Migrations**: 
   ```bash
   cd backend && go run migrations/migrate.go
   ```
3. **Verify Database**: Check that all tables are created with proper indexes

### Phase 3: Backend Development
1. **Start with AI Service**: Implement Gemini and OpenAI integrations
2. **Build Chat Service**: Add message handling with SSE streaming
3. **Add Memory Service**: Implement embedding-based memory system
4. **File Management**: Handle uploads with compression
5. **Health Data**: Basic CRUD operations

### Phase 4: Frontend Development (Parallel)
1. **Expo Setup**: Initialize with navigation and theme system
2. **Chat Interface**: Build message list and input components
3. **Memory Screens**: CRUD interface for memory management
4. **File Upload**: Camera integration and file picker
5. **Settings**: Theme toggle and AI provider selection

### Phase 5: Integration & Testing
1. **API Integration**: Connect frontend to backend services
2. **Real-time Features**: Implement SSE for chat streaming
3. **Error Handling**: Add comprehensive error boundaries
4. **Performance**: Optimize for mobile bandwidth
5. **Testing**: Unit tests for backend, component tests for frontend

## Development Commands
```bash
# Start backend development server
npm run dev:backend

# Start Expo development server (with tunnel for mobile testing)
npm run dev:mobile

# Build for production
npm run build:backend
npm run build:mobile

# Run tests
npm run test:backend
npm run test:mobile

# Database operations
npm run db:migrate
```

## Mobile Development Notes
- Use Expo's tunnel mode for testing on physical devices
- Camera and file picker permissions will be handled by Expo plugins
- Real-time chat requires WebSocket or SSE connection to backend
- State management with Zustand for simplicity
- Navigation with React Navigation 6

## Architecture Principles
- **@used-by annotations**: Add to all functions/components for AI tracking
- **Domain separation**: Keep AI, chat, memory, files, health as separate packages
- **Single responsibility**: Each service handles one domain
- **Mobile-first**: Design API responses for mobile bandwidth constraints
- **Error resilience**: Graceful degradation when services are unavailable

This setup provides a complete foundation for the Expo + Golang wellness AI application with all necessary configurations for both Replit cloud development and local development environments.