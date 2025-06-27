
# Routes Modularization Refactoring Plan - Comprehensive Update

## Mission
Refactor the massive `server/routes.ts` file (3000+ lines) into domain-specific route modules of max 300 lines each, following the existing system map architecture without breaking any existing functionality.

## Critical Constraints Respected
- **I1 - Existing Features Must Not Break**: All endpoints maintain exact same behavior
- **I2 - Always Reassess**: Each module will be tested independently before integration
- **Replit Safety**: No changes to build process, HMR, or WebSocket functionality
- **Backward Compatibility**: All existing API endpoints work unchanged
- **Import Dependencies**: Maintain all existing service imports and dependencies

## Comprehensive Analysis: Current Routes File Dependencies

After analyzing `server/routes.ts`, the following critical imports and patterns must be preserved:

### Core Service Dependencies (ALL MUST BE PRESERVED)
```typescript
// AI & Memory Services
import { aiService } from "./services/ai-service";
import { memoryEnhancedAIService } from "./services/memory-enhanced-ai-service";
import { memoryService } from "./services/memory-service";
import { enhancedMemoryService } from "./services/enhanced-memory-service";
import { advancedMemoryAIService } from './services/advanced-memory-ai-service';
import { memoryRelationshipEngine } from './services/memory-relationship-engine';
import { performanceMemoryCore } from './services/performance-memory-core';
import { ChatGPTMemoryEnhancement } from "./services/chatgpt-memory-enhancement";

// File & Processing Services
import { transcriptionService } from "./services/transcription-service";
import { cacheService } from "./services/cache-service";
import { categoryService } from "./services/category-service";
import { attachmentRetentionService } from "./services/attachment-retention-service";
import { goFileService } from "./services/go-file-service";
import { healthConsentService } from "./services/health-consent-service";
import { HealthDataParser } from "./services/health-data-parser";
import { HealthDataDeduplicationService } from "./services/health-data-deduplication";

// Background Processing
import { enhancedBackgroundProcessor } from "./services/enhanced-background-processor";
import { memoryFeatureFlags } from "./services/memory-feature-flags";
import { memoryPerformanceMonitor } from "./services/memory-performance-monitor";

// Database and Schema
import { db } from "./db";
import { storage } from "./storage";
import { conversations, conversationMessages, memoryEntries, files, fileCategories, 
         atomicFacts, memoryRelationships, memoryConsolidationLog, memoryGraphMetrics, 
         userHealthConsent, healthDataAccessLog, users } from "@shared/schema";

// External Dependencies
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, desc, and, or } from "drizzle-orm";
import { join } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
```

### Critical Global Variables and Functions
```typescript
// Fixed user constant
const FIXED_USER_ID = 1;

// ChatGPT Memory Enhancement Service instance
const chatGPTMemoryEnhancement = new ChatGPTMemoryEnhancement();

// Go service auto-start functionality
let goServiceProcess: any = null;

// Go service startup function (used in multiple places)
async function startGoAccelerationService(): Promise<void>

// Helper functions used across routes
function calculateOverallHitRate(stats: Record<string, any>): string
function calculateTotalMemoryUsage(stats: Record<string, any>): number
function getDeviceFeatures(deviceType: string): string[]
function generateSampleHealthData(dataTypes: string[], timeRangeDays: number): SampleHealthRecord[]
```

### Multer Configurations (CRITICAL for file uploads)
```typescript
// Health data upload configuration
const healthDataUpload = multer({
  storage: multer.diskStorage({
    destination: 'uploads',
    filename: (req, file, cb) => cb(null, `health-${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 1000 * 1024 * 1024 }
});

// Audio upload configuration
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// General file upload configuration
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
```

### Zod Schemas (CRITICAL for validation)
```typescript
const messageSchema = z.object({...});
const deviceConnectSchema = z.object({...});
const settingsUpdateSchema = z.object({...});
const retentionSettingsSchema = z.object({...});
const createCategoryBodySchema = insertFileCategorySchema.pick({...});
const updateCategoryBodySchema = insertFileCategorySchema.pick({...});
```

## Updated Refactoring Strategy

### Phase 1: Create Shared Infrastructure

#### 1.1 Shared Dependencies Module (`server/routes/shared-dependencies.ts`)
```typescript
// Export ALL services and dependencies used across route modules
export { aiService } from "../services/ai-service";
export { memoryEnhancedAIService } from "../services/memory-enhanced-ai-service";
export { memoryService } from "../services/memory-service";
export { enhancedMemoryService } from "../services/enhanced-memory-service";
export { advancedMemoryAIService } from '../services/advanced-memory-ai-service';
export { memoryRelationshipEngine } from '../services/memory-relationship-engine';
export { performanceMemoryCore } from '../services/performance-memory-core';
export { transcriptionService } from "../services/transcription-service";
export { cacheService } from "../services/cache-service";
export { categoryService } from "../services/category-service";
export { attachmentRetentionService } from "../services/attachment-retention-service";
export { goFileService } from "../services/go-file-service";
export { healthConsentService } from "../services/health-consent-service";
export { HealthDataParser } from "../services/health-data-parser";
export { HealthDataDeduplicationService } from "../services/health-data-deduplication";
export { enhancedBackgroundProcessor } from "../services/enhanced-background-processor";
export { memoryFeatureFlags } from "../services/memory-feature-flags";
export { memoryPerformanceMonitor } from "../services/memory-performance-monitor";
export { ChatGPTMemoryEnhancement } from "../services/chatgpt-memory-enhancement";

export { db } from "../db";
export { storage } from "../storage";
export * from "@shared/schema";

export { eq, desc, and, or } from "drizzle-orm";
export { join } from 'path';
export { existsSync } from 'fs';
export { spawn } from 'child_process';
export { nanoid } from "nanoid";
export { z } from "zod";
```

#### 1.2 Shared Utilities Module (`server/routes/shared-utils.ts`)
```typescript
import multer from "multer";
import { z } from "zod";
import { insertFileCategorySchema } from "@shared/schema";

// Fixed user ID constant
export const FIXED_USER_ID = 1;

// Global service instances
export const chatGPTMemoryEnhancement = new (await import("../services/chatgpt-memory-enhancement")).ChatGPTMemoryEnhancement();

// Zod schemas (extracted from current routes.ts)
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

export const settingsUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  primaryGoal: z.string().optional(),
  coachStyle: z.string().optional(),
  reminderFrequency: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  darkMode: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  emailSummaries: z.boolean().optional(),
  dataSharing: z.boolean().optional(),
  aiProvider: z.enum(["openai", "google"]).optional(),
  aiModel: z.string().optional(),
  transcriptionProvider: z.enum(["webspeech", "openai", "google"]).optional(),
  preferredLanguage: z.string().optional(),
  automaticModelSelection: z.boolean().optional(),
  memoryDetectionProvider: z.enum(["google", "openai", "none"]).optional(),
  memoryDetectionModel: z.string().optional(),
  highValueRetentionDays: z.number().optional(),
  mediumValueRetentionDays: z.number().optional(),
  lowValueRetentionDays: z.number().optional()
});

export const retentionSettingsSchema = z.object({
  highValueRetentionDays: z.number().min(-1),
  mediumValueRetentionDays: z.number().min(1),
  lowValueRetentionDays: z.number().min(1)
});

export const createCategoryBodySchema = insertFileCategorySchema.pick({
  name: true,
  description: true,
  icon: true,
  color: true
}).required({ name: true }).partial({ description: true, icon: true, color: true });

export const updateCategoryBodySchema = insertFileCategorySchema.pick({
  name: true,
  description: true,
  icon: true,
  color: true
}).partial();

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

export const healthDataUpload = multer({
  storage: multer.diskStorage({
    destination: 'uploads',
    filename: (req, file, cb) => cb(null, `health-${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 1000 * 1024 * 1024 }
});

// Go service management
export let goServiceProcess: any = null;

export async function startGoAccelerationService(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
      const healthCheck = await fetch('http://localhost:5001/accelerate/health', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (healthCheck?.ok) {
        console.log('Go acceleration service already running');
        return;
      }
    } catch {
      clearTimeout(timeoutId);
    }

    console.log('Starting Go acceleration service automatically...');
    
    spawn('bash', ['-c', 'cd go-file-accelerator && go mod download && go run main.go'], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore']
    });

    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const finalController = new AbortController();
    const finalTimeoutId = setTimeout(() => finalController.abort(), 2000);
    
    try {
      const finalCheck = await fetch('http://localhost:5001/accelerate/health', {
        signal: finalController.signal
      });
      clearTimeout(finalTimeoutId);
      
      if (finalCheck?.ok) {
        console.log('Go acceleration service started successfully for large file processing');
      } else {
        console.log('Go service startup completed but not responding - continuing with TypeScript processing');
      }
    } catch {
      clearTimeout(finalTimeoutId);
      console.log('Go service not responding after startup - continuing with TypeScript processing');
    }
  } catch (error) {
    console.log('Go service startup failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Helper functions
export function calculateOverallHitRate(stats: Record<string, any>): string {
  let totalHits = 0, totalRequests = 0;
  Object.values(stats).forEach((stat: any) => {
    totalHits += stat.hits || 0;
    totalRequests += (stat.hits || 0) + (stat.misses || 0);
  });
  return totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) + '%' : '0%';
}

export function calculateTotalMemoryUsage(stats: Record<string, any>): number {
  return Object.values(stats).reduce((total: number, stat: any) => {
    return total + (stat.memoryUsage || 0);
  }, 0);
}

export function getDeviceFeatures(deviceType: string): string[] {
  const features = {
    'smartwatch': ['Step tracking', 'Heart rate', 'Sleep tracking', 'Exercise detection'],
    'scale': ['Weight', 'Body fat', 'Muscle mass', 'BMI'],
    'heart-rate': ['Heart rate zones', 'Continuous monitoring', 'Workout detection'],
    'fitness-tracker': ['Step tracking', 'Sleep tracking', 'Calorie burn', 'Activity detection'],
    'bp-monitor': ['Blood pressure', 'Heart health', 'Trend analysis'],
    'default': ['Basic tracking']
  };
  return features[deviceType as keyof typeof features] || features.default;
}

interface SampleHealthRecord {
  type: string;
  value: string;
  unit: string;
  timestamp: string;
  source?: string;
  category?: string;
}

export function generateSampleHealthData(dataTypes: string[] = [], timeRangeDays: number = 30): SampleHealthRecord[] {
  const sampleData: SampleHealthRecord[] = [];
  const now = new Date();
  const requestedTypes = dataTypes.length > 0 ? dataTypes : ['steps', 'heart_rate', 'sleep', 'weight'];
  
  for (let i = 0; i < timeRangeDays; i++) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    
    requestedTypes.forEach(type => {
      switch (type) {
        case 'steps':
          sampleData.push({
            type: 'steps',
            value: (Math.floor(Math.random() * 5000) + 3000).toString(),
            unit: 'count',
            timestamp: date.toISOString()
          });
          break;
        case 'heart_rate':
          sampleData.push({
            type: 'heart_rate',
            value: (Math.floor(Math.random() * 40) + 60).toString(),
            unit: 'bpm',
            timestamp: date.toISOString()
          });
          break;
        case 'sleep':
          sampleData.push({
            type: 'sleep',
            value: (Math.floor(Math.random() * 120) + 420).toString(),
            unit: 'minutes',
            timestamp: date.toISOString()
          });
          break;
        case 'weight':
          if (i % 3 === 0) {
            sampleData.push({
              type: 'weight',
              value: (Math.floor(Math.random() * 20) + 65).toString(),
              unit: 'kg',
              timestamp: date.toISOString()
            });
          }
          break;
      }
    });
  }
  
  return sampleData;
}
```

### Phase 2: Create Domain Route Modules (Max 300 lines each)

#### 2.1 Chat Routes (`server/routes/chat-routes.ts`) - ~290 lines
```typescript
import { Express } from "express";
import { 
  messageSchema, 
  audioUpload, 
  FIXED_USER_ID,
  chatGPTMemoryEnhancement
} from "./shared-utils";
import { 
  aiService, 
  storage, 
  db, 
  conversations, 
  conversationMessages,
  transcriptionService,
  eq,
  desc
} from "./shared-dependencies";

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
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection } = messageSchema.parse(req.body);
      const userId = FIXED_USER_ID;

      const user = await storage.getUser(userId);
      const userAiProvider = aiProvider || user?.aiProvider || 'google';
      const userAiModel = aiModel || user?.aiModel || 'gemini-2.0-flash-exp';
      const userAutoSelection = automaticModelSelection ?? user?.automaticModelSelection ?? true;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const result = await aiService.getChatResponseStream(
        content,
        userId,
        conversationId || '',
        0,
        coachingMode || 'weight-loss',
        [],
        { provider: userAiProvider, model: userAiModel },
        attachments || [],
        userAutoSelection,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        },
        (complete: string) => {
          res.write(`data: ${JSON.stringify({ type: 'complete', fullResponse: complete })}\n\n`);
        },
        (error: Error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ 
        type: 'done',
        conversationId: result.conversationId
      })}\n\n`);

      res.end();

    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error instanceof Error ? error.message : "Failed to process message"
      })}\n\n`);
      res.end();
    }
  });

  // POST /api/messages (full implementation from original routes.ts)
  app.post("/api/messages", async (req, res) => {
    // [Complete implementation - extracted from original file]
    // This will include all the parallel processing optimizations,
    // attachment handling, conversation management, etc.
  });

  // GET /api/conversations
  app.get("/api/conversations", async (req, res) => {
    // [Complete implementation]
  });

  // GET /api/conversations/:id/messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    // [Complete implementation]
  });

  // POST /api/transcribe/openai
  app.post("/api/transcribe/openai", audioUpload.single('audio'), async (req, res) => {
    // [Complete implementation]
  });

  // POST /api/transcribe/google
  app.post("/api/transcribe/google", audioUpload.single('audio'), async (req, res) => {
    // [Complete implementation]
  });

  // GET /api/transcription/providers
  app.get("/api/transcription/providers", async (req, res) => {
    // [Complete implementation]
  });
}
```

#### 2.2 Health Routes (`server/routes/health-routes.ts`) - ~300 lines
```typescript
import { Express } from "express";
import { 
  FIXED_USER_ID, 
  healthDataUpload,
  generateSampleHealthData,
  startGoAccelerationService 
} from "./shared-utils";
import { 
  storage, 
  healthConsentService,
  db,
  healthDataAccessLog,
  HealthDataParser,
  HealthDataDeduplicationService,
  desc,
  eq
} from "./shared-dependencies";

export function registerHealthRoutes(app: Express): void {
  // GET /api/health-data
  app.get("/api/health-data", async (req, res) => {
    try {
      const range = req.query.range || "7days";
      const category = req.query.category as string;
      const healthData = await storage.getHealthData(FIXED_USER_ID, String(range));

      const filteredData = category 
        ? healthData.filter(item => item.category === category)
        : healthData;

      res.json(filteredData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health data" });
    }
  });

  // GET /api/health-data/categories
  app.get("/api/health-data/categories", async (req, res) => {
    try {
      const range = req.query.range || "7days";
      const healthData = await storage.getHealthData(FIXED_USER_ID, String(range));

      const categorizedData = healthData.reduce((acc, item) => {
        if (!item.category) return acc;
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, typeof healthData>);

      res.json(categorizedData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categorized health data" });
    }
  });

  // DELETE /api/health-data/reset
  app.delete("/api/health-data/reset", async (req, res) => {
    try {
      await storage.clearAllHealthData(FIXED_USER_ID);
      res.json({ message: "All health data has been cleared successfully" });
    } catch (error) {
      console.error('Error clearing health data:', error);
      res.status(500).json({ message: "Failed to clear health data" });
    }
  });

  // POST /api/health-data/parse
  app.post("/api/health-data/parse", healthDataUpload.single('file'), async (req, res) => {
    // [Complete implementation including Go service auto-start logic]
  });

  // POST /api/health-data/import
  app.post("/api/health-data/import", healthDataUpload.single('file'), async (req, res) => {
    // [Complete implementation with deduplication and batch processing]
  });

  // POST /api/health-data/native-sync
  app.post("/api/health-data/native-sync", async (req, res) => {
    // [Complete implementation for native health integration]
  });

  // Health consent endpoints
  app.get("/api/health-consent", async (req, res) => {
    // [Complete implementation]
  });

  app.patch("/api/health-consent", async (req, res) => {
    // [Complete implementation]
  });

  app.get("/api/health-consent/access-log", async (req, res) => {
    // [Complete implementation]
  });

  // Native health integration endpoints
  app.get("/api/native-health/capabilities", async (req, res) => {
    // [Complete implementation]
  });

  app.get("/api/native-health/permissions", async (req, res) => {
    // [Complete implementation]
  });

  app.post("/api/native-health/permissions", async (req, res) => {
    // [Complete implementation]
  });

  app.get("/api/native-health/supported-types", async (req, res) => {
    // [Complete implementation]
  });

  app.post("/api/native-health/test-sync", async (req, res) => {
    // [Complete implementation]
  });
}
```

#### 2.3 Memory Routes (`server/routes/memory-routes.ts`) - ~290 lines
```typescript
import { Express } from "express";
import { 
  FIXED_USER_ID,
  chatGPTMemoryEnhancement
} from "./shared-utils";
import { 
  memoryService, 
  enhancedMemoryService,
  memoryEnhancedAIService,
  performanceMemoryCore,
  enhancedBackgroundProcessor,
  memoryFeatureFlags,
  memoryPerformanceMonitor,
  db,
  memoryEntries,
  eq,
  desc
} from "./shared-dependencies";

export function registerMemoryRoutes(app: Express): void {
  // GET /api/memories/overview
  app.get("/api/memories/overview", async (req, res) => {
    try {
      const userId = FIXED_USER_ID;
      const allMemories = await memoryService.getUserMemories(userId);
      
      const categories = {
        preference: allMemories.filter(m => m.category === 'preference').length,
        personal_info: allMemories.filter(m => m.category === 'personal_info').length,
        context: allMemories.filter(m => m.category === 'context').length,
        instruction: allMemories.filter(m => m.category === 'instruction').length
      };
      
      res.json({
        total: allMemories.length,
        categories
      });
    } catch (error) {
      console.error('Error fetching memory overview:', error);
      res.status(500).json({ message: "Failed to fetch memory overview" });
    }
  });

  // GET /api/memories
  app.get("/api/memories", async (req, res) => {
    try {
      const userId = FIXED_USER_ID;
      const category = req.query.category as string;
      const memories = await memoryService.getUserMemories(userId, category as any);
      res.json(memories);
    } catch (error) {
      console.error('Error fetching memories:', error);
      res.status(500).json({ message: "Failed to fetch memories" });
    }
  });

  // DELETE /api/memories/bulk
  app.delete("/api/memories/bulk", async (req, res) => {
    // [Complete bulk delete implementation]
  });

  // DELETE /api/memories/:id
  app.delete("/api/memories/:id", async (req, res) => {
    // [Complete single delete implementation]
  });

  // POST /api/memories/manual
  app.post("/api/memories/manual", async (req, res) => {
    // [Complete manual memory creation with ChatGPT deduplication]
  });

  // Enhanced memory endpoints
  app.post("/api/memory/enhanced-detect", async (req, res) => {
    // [Complete enhanced detection implementation]
  });

  app.post("/api/memory/enhanced-retrieve", async (req, res) => {
    // [Complete enhanced retrieval implementation]
  });

  app.post("/api/memory/chatgpt-enhancement-test", async (req, res) => {
    // [Complete ChatGPT enhancement test implementation]
  });

  // Phase 2 Advanced Memory endpoints
  app.post('/api/memory/phase2-test', async (req, res) => {
    // [Complete phase 2 test implementation]
  });

  // Performance and monitoring endpoints
  app.post('/api/memory/background-processing-test', async (req, res) => {
    // [Complete background processing test]
  });

  app.get('/api/memory/performance-report', async (req, res) => {
    // [Complete performance report implementation]
  });

  // Debug endpoint
  app.post("/api/debug/memory-detection", async (req, res) => {
    // [Complete debug implementation]
  });
}
```

#### 2.4 File Routes (`server/routes/file-routes.ts`) - ~280 lines
```typescript
import { Express } from "express";
import { 
  fileUpload, 
  FIXED_USER_ID,
  startGoAccelerationService
} from "./shared-utils";
import { 
  storage, 
  categoryService, 
  attachmentRetentionService,
  goFileService,
  db,
  files,
  fileCategories,
  eq,
  existsSync,
  join,
  nanoid
} from "./shared-dependencies";

export function registerFileRoutes(app: Express): void {
  // GET /api/files
  app.get('/api/files', async (req, res) => {
    try {
      const userId = FIXED_USER_ID;

      const userFiles = await db
        .select({
          id: files.id,
          fileName: files.fileName,
          displayName: files.displayName,
          fileType: files.fileType,
          fileSize: files.fileSize,
          createdAt: files.createdAt,
          filePath: files.filePath,
          retentionPolicy: files.retentionPolicy,
          retentionDays: files.retentionDays,
          scheduledDeletion: files.scheduledDeletion,
          categoryId: files.categoryId,
          uploadSource: files.uploadSource,
          metadata: files.metadata,
          isDeleted: files.isDeleted,
          categoryName: fileCategories.name,
          categoryIcon: fileCategories.icon,
          categoryColor: fileCategories.color
        })
        .from(files)
        .leftJoin(fileCategories, eq(files.categoryId, fileCategories.id))
        .where(eq(files.userId, userId));

      const fileList = userFiles
        .filter(file => !file.isDeleted)
        .map(file => {
          if (!existsSync(file.filePath)) {
            console.log(`Skipping non-existent file in listing: ${file.fileName}`);
            return null;
          }

          return {
            id: file.fileName,
            fileName: file.fileName,
            displayName: file.displayName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            uploadDate: file.createdAt?.toISOString() || new Date().toISOString(),
            url: `/uploads/${file.fileName}`,
            retentionInfo: {
              category: file.retentionPolicy,
              retentionDays: file.retentionDays || (file.retentionPolicy === 'high' ? -1 : file.retentionDays),
              reason: (file.metadata as any)?.retentionInfo?.reason || 'Auto-categorized'
            },
            categoryId: file.categoryId,
            categoryName: file.categoryName,
            categoryIcon: file.categoryIcon,
            categoryColor: file.categoryColor,
            uploadSource: file.uploadSource,
            scheduledDeletion: file.scheduledDeletion?.toISOString() || null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (!a || !b) return 0;
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        });

      res.json(fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  // POST /api/upload
  app.post("/api/upload", fileUpload.single('file'), async (req, res) => {
    // [Complete file upload implementation with Go acceleration]
  });

  // POST /api/files/delete
  app.post('/api/files/delete', async (req, res) => {
    // [Complete file deletion implementation]
  });

  // PATCH /api/files/categorize
  app.patch('/api/files/categorize', async (req, res) => {
    // [Complete file categorization implementation]
  });

  // Category management endpoints
  app.get("/api/categories", async (req, res) => {
    // [Complete category listing implementation]
  });

  app.post("/api/categories", async (req, res) => {
    // [Complete category creation implementation]
  });

  app.put("/api/categories/:id", async (req, res) => {
    // [Complete category update implementation]
  });

  app.delete("/api/categories/:id", async (req, res) => {
    // [Complete category deletion implementation]
  });

  app.post("/api/categories/seed", async (req, res) => {
    // [Complete category seeding implementation]
  });
}
```

#### 2.5 Settings & Devices Routes (`server/routes/settings-routes.ts`) - ~250 lines
```typescript
import { Express } from "express";
import { 
  deviceConnectSchema, 
  FIXED_USER_ID, 
  getDeviceFeatures,
  settingsUpdateSchema,
  retentionSettingsSchema
} from "./shared-utils";
import { 
  storage, 
  aiService, 
  attachmentRetentionService,
  healthConsentService
} from "./shared-dependencies";

export function registerSettingsRoutes(app: Express): void {
  // GET /api/settings
  app.get("/api/settings", async (req, res) => {
    try {
      const user = await storage.getUser(FIXED_USER_ID);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const consentSettings = await healthConsentService.getUserConsentSettings(FIXED_USER_ID);
      const healthConsent = healthConsentService.transformConsentToSettings(consentSettings);

      const userSettings = {
        ...user.preferences,
        aiProvider: user.aiProvider,
        aiModel: user.aiModel,
        automaticModelSelection: user.automaticModelSelection,
        transcriptionProvider: user.transcriptionProvider,
        preferredLanguage: user.preferredLanguage,
        memoryDetectionProvider: user.memoryDetectionProvider,
        memoryDetectionModel: user.memoryDetectionModel,
        name: user.name,
        email: user.email,
        health_consent: healthConsent
      };
      
      res.json(userSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // PATCH /api/settings
  app.patch("/api/settings", async (req, res) => {
    // [Complete settings update implementation]
  });

  // Device management
  app.get("/api/devices", async (req, res) => {
    // [Complete device listing implementation]
  });

  app.post("/api/devices", async (req, res) => {
    // [Complete device connection implementation]
  });

  app.delete("/api/devices/:id", async (req, res) => {
    // [Complete device disconnection implementation]
  });

  app.patch("/api/devices/:id", async (req, res) => {
    // [Complete device update implementation]
  });

  // AI models and retention settings
  app.get("/api/ai-models", async (req, res) => {
    try {
      const models = aiService.getAvailableModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  app.get("/api/retention-settings", async (req, res) => {
    try {
      const settings = attachmentRetentionService.getRetentionDurations();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch retention settings" });
    }
  });

  app.patch("/api/retention-settings", async (req, res) => {
    // [Complete retention settings update implementation]
  });
}
```

#### 2.6 Performance & Monitoring Routes (`server/routes/monitoring-routes.ts`) - ~300 lines
```typescript
import { Express } from "express";
import { 
  calculateOverallHitRate,
  calculateTotalMemoryUsage,
  startGoAccelerationService
} from "./shared-utils";
import { 
  cacheService,
  enhancedBackgroundProcessor,
  memoryFeatureFlags,
  memoryPerformanceMonitor,
  spawn
} from "./shared-dependencies";

export function registerMonitoringRoutes(app: Express): void {
  // GET /api/cache/stats
  app.get("/api/cache/stats", async (req, res) => {
    try {
      const stats = cacheService.getStats();
      res.json({
        timestamp: new Date().toISOString(),
        cacheStats: stats,
        summary: {
          totalCaches: Object.keys(stats).length,
          overallHitRate: calculateOverallHitRate(stats),
          totalMemoryUsage: calculateTotalMemoryUsage(stats)
        }
      });
    } catch (error: any) {
      console.error("Error fetching cache stats:", error);
      res.status(500).json({ message: "Failed to fetch cache statistics", error: error.message });
    }
  });

  // POST /api/cache/clear
  app.post("/api/cache/clear", async (req, res) => {
    try {
      const { category } = req.body;
      
      if (category) {
        cacheService.clearCategory(category);
        res.json({ message: `Cache category '${category}' cleared successfully` });
      } else {
        cacheService.clearAll();
        res.json({ message: "All caches cleared successfully" });
      }
    } catch (error: any) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ message: "Failed to clear cache", error: error.message });
    }
  });

  app.post("/api/cache/warm/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await cacheService.warmCache(userId);
      res.json({ message: `Cache warmed for user ${userId}` });
    } catch (error: any) {
      console.error("Error warming cache:", error);
      res.status(500).json({ message: "Failed to warm cache", error: error.message });
    }
  });

  // Go acceleration service endpoints
  app.get('/api/accelerate/health', async (req, res) => {
    try {
      const response = await fetch('http://localhost:5001/accelerate/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        const healthData = await response.json();
        res.json({ 
          available: true, 
          service: healthData,
          proxyStatus: 'active'
        });
      } else {
        res.json({ 
          available: false, 
          error: `Service returned ${response.status}`,
          proxyStatus: 'service_error'
        });
      }
    } catch (error) {
      res.json({ 
        available: false, 
        error: 'Service unavailable',
        proxyStatus: 'offline'
      });
    }
  });

  app.post('/api/accelerate/start', async (req, res) => {
    // [Complete Go service auto-start implementation]
  });

  app.post('/api/accelerate/batch-process', async (req, res) => {
    // [Complete batch processing proxy implementation]
  });

  // Performance testing endpoints
  app.post('/api/memory/feature-flags-test', async (req, res) => {
    // [Complete feature flags test implementation]
  });

  app.get('/api/memory/performance-monitoring-test', async (req, res) => {
    // [Complete performance monitoring test implementation]
  });

  app.get('/api/memory/production-readiness-test', async (req, res) => {
    // [Complete production readiness test implementation]
  });
}
```

### Phase 3: Updated Main Routes Index

#### 3.1 New Routes Index (`server/routes/index.ts`)
```typescript
import { Express } from "express";
import { createServer, type Server } from "http";
import { join } from 'path';
import { existsSync } from 'fs';

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

#### 4.2 Temporary Backward Compatibility Bridge
Create `server/routes.ts.backup` (copy of original) and maintain temporary bridge:

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
2. Create `shared-dependencies.ts` and `shared-utils.ts`
3. Test that shared dependencies resolve correctly
4. Verify no import cycles or conflicts

### Step 2: Extract One Module at a Time (Days 2-7)
1. **Start with Monitoring Routes** (lowest risk, independent functionality)
2. **Move to Settings Routes** (well-isolated, minimal cross-dependencies)
3. **Extract File Routes** (moderate complexity, Go service integration)
4. **Move Health Routes** (complex but well-defined boundaries)
5. **Extract Memory Routes** (newest features, comprehensive testing needed)
6. **Finish with Chat Routes** (most critical, extensive testing required)

### Step 3: Update Main Index (Day 8)
1. Update `server/index.ts` to use new routes
2. Test all endpoints thoroughly
3. Remove temporary compatibility bridge
4. Archive original `server/routes.ts` as backup

### Step 4: Validation (Day 9)
1. Full application testing - all features functional
2. All API endpoints working correctly
3. Performance regression testing
4. Memory usage validation
5. Go service integration working
6. WebSocket and streaming functionality intact

## Safety Mechanisms

### Feature Flags for Route Modules
```typescript
// In shared-utils.ts
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
4. Git commit after each successful module migration

### Testing Strategy
1. **Unit Tests**: Each module exports testable functions
2. **Integration Tests**: Full HTTP endpoint testing
3. **Cross-Module Tests**: Ensure shared dependencies work correctly
4. **Performance Tests**: Response time regression monitoring
5. **Memory Tests**: Memory usage validation across modules

## Expected Benefits

### Maintainability
- **300 line limit** per module makes code reviewable
- **Clear separation** of concerns by domain
- **Easier debugging** with isolated functionality
- **Parallel development** possible on different domains

### Development Velocity
- **Reduced merge conflicts** with smaller files
- **Faster builds** with targeted changes
- **Better IDE performance** with smaller files
- **Easier onboarding** for new developers

### System Performance
- **Selective imports** reduce memory footprint
- **Better caching** of unchanged modules
- **Improved hot reload** performance in development

## Risk Assessment

### LOW RISK
- All dependencies properly analyzed and preserved
- Backward compatibility bridge maintains functionality
- Incremental migration with rollback at each step
- Comprehensive testing strategy

### MITIGATION STRATEGIES
- **Import Dependency Preservation**: All services and schemas moved to shared modules
- **Function Signature Consistency**: All endpoints maintain exact same behavior
- **Service Instance Management**: Global instances (like ChatGPT enhancement) properly shared
- **Multer Configuration Preservation**: All upload configurations maintained exactly
- **Go Service Integration**: Auto-start functionality preserved across modules

## Conclusion

This updated plan provides a **comprehensive, safe, incremental migration** that:

1. **Preserves all imports and dependencies** - comprehensive dependency analysis completed
2. **Maintains exact API compatibility** - all endpoints unchanged
3. **Enables parallel development** - clear domain separation
4. **Provides instant rollback** - safety-first approach with backups
5. **Follows existing patterns** - consistent with current architecture
6. **Respects Replit constraints** - no build process changes, maintains HMR

The modular structure will dramatically improve maintainability while ensuring zero disruption to the existing stable application.

**Implementation Timeline**: 9 days
**Risk Level**: **LOW** - Comprehensive safety measures and rollback plan
**Impact**: **HIGH** - Dramatically improved code maintainability and development velocity
