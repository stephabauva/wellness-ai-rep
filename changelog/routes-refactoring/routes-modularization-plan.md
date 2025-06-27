
# Routes Modularization Refactoring Plan - Updated

## Mission
Refactor the massive `server/routes.ts` file (3000+ lines) into domain-specific route modules of max 300 lines each, following the existing system map architecture without breaking any existing functionality.

## Critical Constraints Respected
- **I1 - Existing Features Must Not Break**: All endpoints maintain exact same behavior
- **I2 - Always Reassess**: Each module will be tested independently before integration
- **Replit Safety**: No changes to build process, HMR, or WebSocket functionality
- **Backward Compatibility**: All existing API endpoints work unchanged
- **Import Dependencies**: Maintain all existing service imports and dependencies

## Updated Analysis: Import Dependencies

After analyzing `server/routes.ts`, the following critical imports must be preserved:

### Core Service Dependencies
```typescript
// These imports are used throughout routes.ts and must be available to all modules
import { aiService } from "./services/ai-service";
import { memoryEnhancedAIService } from "./services/memory-enhanced-ai-service";
import { memoryService } from "./services/memory-service";
import { enhancedMemoryService } from "./services/enhanced-memory-service";
import { transcriptionService } from "./services/transcription-service";
import { cacheService } from "./services/cache-service";
import { categoryService } from "./services/category-service";
import { attachmentRetentionService } from "./services/attachment-retention-service";
import { goFileService } from "./services/go-file-service";
import { healthConsentService } from "./services/health-consent-service";
```

### Database and Schema Dependencies
```typescript
import { db } from "./db";
import { storage } from "./storage";
import { conversations, conversationMessages, memoryEntries, files, fileCategories } from "@shared/schema";
```

## Updated Refactoring Strategy

### Phase 1: Create Shared Dependencies Module

#### 1.1 Route Dependencies (`server/routes/route-dependencies.ts`)
```typescript
// Centralized export of all shared dependencies
export { aiService } from "../services/ai-service";
export { memoryEnhancedAIService } from "../services/memory-enhanced-ai-service";
export { memoryService } from "../services/memory-service";
export { enhancedMemoryService } from "../services/enhanced-memory-service";
export { transcriptionService } from "../services/transcription-service";
export { cacheService } from "../services/cache-service";
export { categoryService } from "../services/category-service";
export { attachmentRetentionService } from "../services/attachment-retention-service";
export { goFileService } from "../services/go-file-service";
export { healthConsentService } from "../services/health-consent-service";
export { db } from "../db";
export { storage } from "../storage";
export * from "@shared/schema";
```

#### 1.2 Shared Middleware and Utils (`server/routes/route-utils.ts`)
```typescript
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import { join } from 'path';
import { existsSync } from 'fs';

// Fixed user ID constant
export const FIXED_USER_ID = 1;

// Shared Zod schemas (extracted from current routes.ts)
export const messageSchema = z.object({
  content: z.string(),
  conversationId: z.string().nullable().optional(),
  coachingMode: z.string().optional().default("weight-loss"),
  aiProvider: z.enum(["openai", "google"]).optional().default("openai"),
  aiModel: z.string().optional().default("gpt-4o"),
  attachments: z.array(z.object({
    id: z.string(),
    fileName: z.string(),
    displayName: z.string().optional(),
    fileType: z.string(),
    fileSize: z.number(),
    url: z.string().optional(),
    retentionInfo: z.any().optional(),
    categoryId: z.string().optional(),
  })).optional(),
  automaticModelSelection: z.boolean().optional().default(false),
  streaming: z.boolean().optional().default(false)
});

export const deviceConnectSchema = z.object({
  deviceName: z.string().min(1),
  deviceType: z.string().min(1)
});

// Multer configurations
export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

export const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf', 'text/'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    cb(isAllowed ? null : new Error('File type not supported'), isAllowed);
  }
});

// Helper functions
export function calculateOverallHitRate(stats: Record<string, any>): string {
  let totalHits = 0, totalRequests = 0;
  Object.values(stats).forEach((stat: any) => {
    totalHits += stat.hits || 0;
    totalRequests += (stat.hits || 0) + (stat.misses || 0);
  });
  return totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) + '%' : '0%';
}

export function getDeviceFeatures(deviceType: string): string[] {
  const features = {
    'smartwatch': ['Step tracking', 'Heart rate', 'Sleep tracking'],
    'scale': ['Weight', 'Body fat', 'Muscle mass'],
    'fitness-tracker': ['Step tracking', 'Sleep tracking', 'Calorie burn'],
    'default': ['Basic tracking']
  };
  return features[deviceType as keyof typeof features] || features.default;
}
```

### Phase 2: Create Domain Route Modules

#### 2.1 Chat Routes (`server/routes/chat-routes.ts`) - ~280 lines
```typescript
import { Express } from "express";
import { messageSchema, audioUpload, FIXED_USER_ID } from "./route-utils";
import { 
  aiService, 
  storage, 
  db, 
  conversations, 
  conversationMessages,
  transcriptionService 
} from "./route-dependencies";
import { eq, desc } from "drizzle-orm";

export function registerChatRoutes(app: Express): void {
  // GET /api/messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(FIXED_USER_ID);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // POST /api/messages/stream
  app.post("/api/messages/stream", async (req, res) => {
    // ... streaming implementation (extracted from current routes.ts)
  });

  // POST /api/messages  
  app.post("/api/messages", async (req, res) => {
    // ... regular message processing (extracted from current routes.ts)
  });

  // GET /api/conversations
  app.get("/api/conversations", async (req, res) => {
    // ... conversations list (extracted from current routes.ts)
  });

  // GET /api/conversations/:id/messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    // ... conversation messages (extracted from current routes.ts)
  });

  // POST /api/transcribe/openai
  app.post("/api/transcribe/openai", audioUpload.single('audio'), async (req, res) => {
    // ... OpenAI transcription (extracted from current routes.ts)
  });

  // POST /api/transcribe/google  
  app.post("/api/transcribe/google", audioUpload.single('audio'), async (req, res) => {
    // ... Google transcription (extracted from current routes.ts)
  });

  // GET /api/transcription/providers
  app.get("/api/transcription/providers", async (req, res) => {
    // ... provider capabilities (extracted from current routes.ts)
  });
}
```

#### 2.2 Health Data Routes (`server/routes/health-routes.ts`) - ~300 lines
```typescript
import { Express } from "express";
import { FIXED_USER_ID } from "./route-utils";
import { 
  storage, 
  healthConsentService,
  db,
  healthDataAccessLog 
} from "./route-dependencies";
import { HealthDataParser } from "../services/health-data-parser";
import { HealthDataDeduplicationService } from "../services/health-data-deduplication";
import multer from "multer";

const healthDataUpload = multer({
  storage: multer.diskStorage({
    destination: 'uploads',
    filename: (req, file, cb) => cb(null, `health-${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 1000 * 1024 * 1024 }
});

export function registerHealthRoutes(app: Express): void {
  // GET /api/health-data
  app.get("/api/health-data", async (req, res) => {
    // ... health data retrieval (extracted from current routes.ts)
  });

  // GET /api/health-data/categories
  app.get("/api/health-data/categories", async (req, res) => {
    // ... categorized health data (extracted from current routes.ts)
  });

  // DELETE /api/health-data/reset
  app.delete("/api/health-data/reset", async (req, res) => {
    // ... health data reset (extracted from current routes.ts)
  });

  // POST /api/health-data/parse
  app.post("/api/health-data/parse", healthDataUpload.single('file'), async (req, res) => {
    // ... file parsing (extracted from current routes.ts)
  });

  // POST /api/health-data/import
  app.post("/api/health-data/import", healthDataUpload.single('file'), async (req, res) => {
    // ... data import (extracted from current routes.ts)
  });

  // POST /api/health-data/native-sync
  app.post("/api/health-data/native-sync", async (req, res) => {
    // ... native health sync (extracted from current routes.ts)
  });

  // Health consent endpoints
  // GET /api/health-consent
  // PATCH /api/health-consent
  // GET /api/health-consent/access-log
}
```

#### 2.3 Memory Routes (`server/routes/memory-routes.ts`) - ~300 lines
```typescript
import { Express } from "express";
import { FIXED_USER_ID } from "./route-utils";
import { 
  memoryService, 
  enhancedMemoryService,
  memoryEnhancedAIService,
  performanceMemoryCore 
} from "./route-dependencies";

export function registerMemoryRoutes(app: Express): void {
  // GET /api/memories/overview
  app.get("/api/memories/overview", async (req, res) => {
    // ... memory overview (extracted from current routes.ts)
  });

  // GET /api/memories
  app.get("/api/memories", async (req, res) => {
    // ... memory list (extracted from current routes.ts)
  });

  // DELETE /api/memories/bulk
  app.delete("/api/memories/bulk", async (req, res) => {
    // ... bulk delete (extracted from current routes.ts)
  });

  // DELETE /api/memories/:id
  app.delete("/api/memories/:id", async (req, res) => {
    // ... single delete (extracted from current routes.ts)
  });

  // POST /api/memories/manual
  app.post("/api/memories/manual", async (req, res) => {
    // ... manual memory creation (extracted from current routes.ts)
  });

  // Enhanced memory endpoints
  // POST /api/memory/enhanced-detect
  // POST /api/memory/enhanced-retrieve
  // POST /api/memory/chatgpt-enhancement-test
}
```

#### 2.4 File Management Routes (`server/routes/file-routes.ts`) - ~250 lines
```typescript
import { Express } from "express";
import { fileUpload, FIXED_USER_ID } from "./route-utils";
import { 
  storage, 
  categoryService, 
  attachmentRetentionService,
  goFileService,
  db,
  files,
  fileCategories 
} from "./route-dependencies";

export function registerFileRoutes(app: Express): void {
  // GET /api/files
  app.get('/api/files', async (req, res) => {
    // ... file listing (extracted from current routes.ts)
  });

  // POST /api/upload
  app.post("/api/upload", fileUpload.single('file'), async (req, res) => {
    // ... file upload with Go acceleration (extracted from current routes.ts)
  });

  // POST /api/files/delete
  app.post('/api/files/delete', async (req, res) => {
    // ... file deletion (extracted from current routes.ts)
  });

  // PATCH /api/files/categorize
  app.patch('/api/files/categorize', async (req, res) => {
    // ... file categorization (extracted from current routes.ts)
  });

  // Category management
  // GET /api/categories
  // POST /api/categories
  // PUT /api/categories/:id
  // DELETE /api/categories/:id
}
```

#### 2.5 Settings & Devices Routes (`server/routes/settings-routes.ts`) - ~200 lines
```typescript
import { Express } from "express";
import { deviceConnectSchema, FIXED_USER_ID, getDeviceFeatures } from "./route-utils";
import { 
  storage, 
  aiService, 
  attachmentRetentionService 
} from "./route-dependencies";

export function registerSettingsRoutes(app: Express): void {
  // GET /api/settings
  app.get("/api/settings", async (req, res) => {
    // ... user settings (extracted from current routes.ts)
  });

  // PATCH /api/settings
  app.patch("/api/settings", async (req, res) => {
    // ... settings update (extracted from current routes.ts)
  });

  // Device management
  // GET /api/devices
  // POST /api/devices
  // DELETE /api/devices/:id
  // PATCH /api/devices/:id

  // AI models and retention settings
  // GET /api/ai-models
  // GET /api/retention-settings
  // PATCH /api/retention-settings
}
```

#### 2.6 Performance & Monitoring Routes (`server/routes/monitoring-routes.ts`) - ~200 lines
```typescript
import { Express } from "express";
import { calculateOverallHitRate } from "./route-utils";
import { cacheService } from "./route-dependencies";

export function registerMonitoringRoutes(app: Express): void {
  // GET /api/cache/stats
  app.get("/api/cache/stats", async (req, res) => {
    // ... cache statistics (extracted from current routes.ts)
  });

  // POST /api/cache/clear
  app.post("/api/cache/clear", async (req, res) => {
    // ... cache clearing (extracted from current routes.ts)
  });

  // Performance testing endpoints
  // GET /api/accelerate/health
  // POST /api/accelerate/start
  // POST /api/accelerate/batch-process

  // Memory performance endpoints
  // POST /api/memory/phase2-test
  // POST /api/memory/background-processing-test
  // GET /api/memory/performance-report
}
```

### Phase 3: Updated Main Routes Index

#### 3.1 New Routes Index (`server/routes/index.ts`)
```typescript
import { Express } from "express";
import { createServer, type Server } from "http";
import { registerChatRoutes } from "./chat-routes";
import { registerHealthRoutes } from "./health-routes";
import { registerMemoryRoutes } from "./memory-routes";
import { registerFileRoutes } from "./file-routes";
import { registerSettingsRoutes } from "./settings-routes";
import { registerMonitoringRoutes } from "./monitoring-routes";

export async function registerAllRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Serve uploaded files (keep this in main for path resolution)
  app.use('/uploads', (req, res, next) => {
    const filePath = join(process.cwd(), 'uploads', req.path);
    if (existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });
  
  // Register domain-specific route modules
  registerChatRoutes(app);
  registerHealthRoutes(app);
  registerMemoryRoutes(app);
  registerFileRoutes(app);
  registerSettingsRoutes(app);
  registerMonitoringRoutes(app);
  
  return httpServer;
}
```

### Phase 4: Backend Compatibility

#### 4.1 Update Server Index (`server/index.ts`)
**CHANGE REQUIRED**: Update import to use new modular routes:

```typescript
// BEFORE:
import { registerRoutes } from "./routes";

// AFTER: 
import { registerAllRoutes } from "./routes/index";

// In the async function:
const server = await registerAllRoutes(app);
```

#### 4.2 Maintain Backward Compatibility
Create a temporary bridge file `server/routes.ts` during migration:

```typescript
// Temporary compatibility bridge - will be removed after migration
import { Express } from "express";
import { createServer, type Server } from "http";
import { registerAllRoutes } from "./routes/index";

export async function registerRoutes(app: Express): Promise<Server> {
  console.warn('[DEPRECATION] Using legacy routes.ts - please update to use routes/index.ts');
  return registerAllRoutes(app);
}
```

## Migration Implementation Strategy

### Step 1: Create Infrastructure (Day 1)
1. Create `server/routes/` directory
2. Create `route-dependencies.ts` and `route-utils.ts`
3. Test that shared dependencies resolve correctly

### Step 2: Extract One Module at a Time (Days 2-5)
1. **Start with Settings Routes** (lowest risk, fewest dependencies)
2. **Move to File Routes** (well-isolated functionality)
3. **Extract Chat Routes** (most critical, test thoroughly)
4. **Move Health Routes** (complex but well-defined)
5. **Extract Memory Routes** (newest features, good rollback candidate)
6. **Finish with Monitoring Routes** (development/debug features)

### Step 3: Update Main Index (Day 6)
1. Update `server/index.ts` to use new routes
2. Remove temporary compatibility bridge
3. Delete original `server/routes.ts`

### Step 4: Validation (Day 7)
1. Full application testing
2. All API endpoints functional
3. Performance regression testing
4. Memory usage validation

## Safety Mechanisms

### Feature Flags
```typescript
// In route-utils.ts
export const ROUTE_MODULES_ENABLED = {
  chat: true,
  health: true,
  memory: true,
  files: true,
  settings: true,
  monitoring: true
};
```

### Rollback Plan
1. Keep original `routes.ts` as `routes.ts.backup`
2. Instant rollback via server restart with old file
3. Feature flags allow selective disable of modules

### Testing Strategy
1. **Unit Tests**: Each module exports testable functions
2. **Integration Tests**: Full HTTP endpoint testing
3. **Performance Tests**: Response time regression
4. **Memory Tests**: Memory usage validation

## Expected Benefits

### Maintainability
- **300 line limit** per module makes code reviewable
- **Clear separation** of concerns by domain
- **Easier debugging** with isolated functionality

### Development Velocity
- **Parallel development** on different domains
- **Reduced merge conflicts** with smaller files
- **Faster builds** with targeted changes

### System Performance
- **Selective imports** reduce memory footprint
- **Lazy loading** potential for route modules
- **Better caching** of unchanged modules

## Conclusion

This updated plan provides a **safe, incremental migration** that:

1. **Preserves all imports and dependencies** - no functionality broken
2. **Maintains exact API compatibility** - all endpoints unchanged
3. **Enables parallel development** - team can work on different domains
4. **Provides instant rollback** - safety-first approach
5. **Follows existing patterns** - consistent with current architecture

The modular structure will significantly improve maintainability while ensuring zero disruption to the existing stable application.

**Implementation Timeline**: 7 days
**Risk Level**: **LOW** - Comprehensive safety measures and rollback plan
**Impact**: **HIGH** - Dramatically improved code maintainability and development velocity
