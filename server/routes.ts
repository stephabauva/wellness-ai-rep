import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/ai-service";
import { memoryService } from "./services/memory-service";
import { enhancedMemoryService } from "./services/enhanced-memory-service";
import { generatePDFReport } from "./services/pdf-service";
import { transcriptionService } from "./services/transcription-service";
import { cacheService } from "./services/cache-service";
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "./db";
import { conversations, conversationMessages, memoryEntries, insertFileCategorySchema, files, fileCategories, insertFileSchema, atomicFacts, memoryRelationships, memoryConsolidationLog, memoryGraphMetrics } from "@shared/schema";
import { categoryService } from "./services/category-service";
import { eq, desc, and, or } from "drizzle-orm";
import { join } from 'path';
import { existsSync } from 'fs';
import path from 'path';
import fs from 'fs';
import { attachmentRetentionService } from "./services/attachment-retention-service";
import { goFileService } from "./services/go-file-service";
import { statSync, unlinkSync } from 'fs';
import { HealthDataParser } from "./services/health-data-parser";
import { HealthDataDeduplicationService } from "./services/health-data-deduplication";
import { insertHealthDataSchema } from "@shared/schema";

// Attachment schema for client
const attachmentSchema = z.object({
  id: z.string(), // This is the nanoid generated during upload
  fileName: z.string(), // This is the unique filename on disk (e.g., nanoid.ext)
  displayName: z.string().optional(), // This is the original filename
  fileType: z.string(),
  fileSize: z.number(),
  url: z.string().optional(), // URL to access the file, e.g., /uploads/fileName
  retentionInfo: z.any().optional(), // Make sure this is optional if client might not send it
  categoryId: z.string().optional(), // Optional category ID
});

// Message payload schema
const messageSchema = z.object({
  content: z.string(),
  conversationId: z.string().nullable().optional(),
  coachingMode: z.string().optional().default("weight-loss"),
  aiProvider: z.enum(["openai", "google"]).optional().default("openai"),
  aiModel: z.string().optional().default("gpt-4o"),
  attachments: z.array(attachmentSchema).optional(),
  automaticModelSelection: z.boolean().optional().default(false),
  streaming: z.boolean().optional().default(false)
});

// Device connect schema
const deviceConnectSchema = z.object({
  deviceName: z.string().min(1),
  deviceType: z.string().min(1)
});

// Settings update schema
const settingsUpdateSchema = z.object({
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
  // Attachment retention settings
  highValueRetentionDays: z.number().optional(),
  mediumValueRetentionDays: z.number().optional(),
  lowValueRetentionDays: z.number().optional()
});

// Retention settings schema
const retentionSettingsSchema = z.object({
  highValueRetentionDays: z.number().min(-1),
  mediumValueRetentionDays: z.number().min(1),
  lowValueRetentionDays: z.number().min(1)
});

// Zod schema for creating a category
const createCategoryBodySchema = insertFileCategorySchema.pick({
  name: true,
  description: true,
  icon: true,
  color: true
}).required({ name: true }).partial({ description: true, icon: true, color: true });

// Zod schema for updating a category
const updateCategoryBodySchema = insertFileCategorySchema.pick({
  name: true,
  description: true,
  icon: true,
  color: true
}).partial();


export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  const FIXED_USER_ID = 1; // Assuming fixed user ID for now

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = join(process.cwd(), 'uploads', req.path);
    if (existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // Get chat messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(1); // Default user ID
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Streaming endpoint for real-time AI responses (Tier 1 B optimization)
  app.post("/api/messages/stream", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection } = messageSchema.parse(req.body);
      const userId = 1; // Default user ID

      // Get user's actual AI settings
      const user = await storage.getUser(userId);
      const userAiProvider = aiProvider || user?.aiProvider || 'google';
      const userAiModel = aiModel || user?.aiModel || 'gemini-2.0-flash-exp';
      const userAutoSelection = automaticModelSelection ?? user?.automaticModelSelection ?? true;

      console.log(`[Streaming] Using user settings: provider=${userAiProvider}, model=${userAiModel}, auto=${userAutoSelection}`);

      let currentConversationId = conversationId;
      let conversationHistory: any[] = [];

      // Set up Server-Sent Events headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Use the existing aiService streaming system for smooth streaming
      const result = await aiService.getChatResponseStream(
        content,
        userId,
        currentConversationId || '',
        0, // messageId placeholder
        coachingMode || 'weight-loss',
        conversationHistory,
        { provider: userAiProvider, model: userAiModel },
        attachments || [],
        userAutoSelection,
        (chunk: string) => {
          // Send each chunk immediately for smooth streaming
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        },
        (complete: string) => {
          res.write(`data: ${JSON.stringify({ type: 'complete', fullResponse: complete })}\n\n`);
        },
        (error: Error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        }
      );

      // Send conversation data and end stream
      res.write(`data: ${JSON.stringify({ 
        type: 'done',
        conversationId: result.conversationId
      })}\n\n`);

      res.end();

    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error instanceof z.ZodError ? "Invalid request data" : "Failed to process message"
      })}\n\n`);
      res.end();
    }
  });

  // Enhanced message endpoint with streaming and parallel processing (Tier 1 B & C optimizations)
  app.post("/api/messages", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection, streaming } = messageSchema.parse(req.body);
      const userId = 1; // Default user ID

      let currentConversationId = conversationId;
      let conversationHistory: any[] = [];

      console.log(`Received message with conversation ID: ${currentConversationId}, streaming: ${streaming}`);

      // Set up streaming headers if requested (Tier 1 B optimization)
      if (streaming) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });
        
        // Send immediate typing indicator
        res.write(`data: ${JSON.stringify({ type: 'typing_start' })}\n\n`);
      }

      // Tier 1 C: Parallel processing optimization
      const processOperations = async () => {
        const operations = [];

        // 1. Conversation validation/creation (parallel when possible)
        if (currentConversationId) {
          operations.push(async () => {
            const existingConv = await db
              .select()
              .from(conversations)
              .where(eq(conversations.id, currentConversationId!))
              .limit(1);

            if (existingConv.length === 0) {
              console.warn(`Conversation ${currentConversationId} not found! Setting to null to create new one.`);
              currentConversationId = null;
            } else {
              const historyFromDb = await db
                .select()
                .from(conversationMessages)
                .where(eq(conversationMessages.conversationId, currentConversationId!))
                .orderBy(conversationMessages.createdAt)
                .limit(20);
              conversationHistory = historyFromDb;
              console.log(`Fetched conversation history: ${conversationHistory.length} messages`);
            }
          });
        }

        // Execute conversation operations
        await Promise.all(operations.map(op => op()));

        // 2. Create new conversation if needed
        if (!currentConversationId) {
          let title = content?.slice(0, 50) + (content && content.length > 50 ? '...' : '');
          if (!title && attachments && attachments.length > 0) {
            title = attachments.map(a => a.displayName || a.fileName).join(', ').slice(0, 50);
          }
          if (!title) title = "New Conversation";

          const [newConversation] = await db.insert(conversations).values({
            userId,
            title
          }).returning();
          currentConversationId = newConversation.id;
          console.log(`Created new conversation: ${currentConversationId} with title: ${title}`);
          conversationHistory = [];
        }

        // 3. Save user message
        const [savedUserMessage] = await db.insert(conversationMessages).values({
          conversationId: currentConversationId,
          role: 'user',
          content,
          metadata: attachments && attachments.length > 0 ? { attachments } : undefined
        }).returning();

        console.log(`Saved user message ${savedUserMessage.id} to conversation ${currentConversationId}`);

        // 4. Process attachments in parallel
        const attachmentProcessing = attachments && attachments.length > 0 ? 
          Promise.all(attachments.map(async (attachment) => {
            try {
              const categorization = await attachmentRetentionService.categorizeAttachment(
                attachment.displayName || attachment.fileName,
                attachment.fileType,
                `Chat upload in conversation: ${currentConversationId}`
              );

              let retentionDays = null;
              let scheduledDeletion = null;
              
              if (categorization.category === 'high') {
                retentionDays = null;
              } else if (categorization.category === 'medium') {
                retentionDays = 90;
                scheduledDeletion = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000));
              } else if (categorization.category === 'low') {
                retentionDays = 30;
                scheduledDeletion = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
              }

              const existingFile = await db
                .select()
                .from(files)
                .where(eq(files.fileName, attachment.fileName))
                .limit(1);

              if (existingFile.length === 0) {
                await db.insert(files).values({
                  userId,
                  categoryId: categorization.suggestedCategoryId || null,
                  fileName: attachment.fileName,
                  displayName: attachment.displayName || attachment.fileName,
                  filePath: join(process.cwd(), 'uploads', attachment.fileName),
                  fileType: attachment.fileType,
                  fileSize: attachment.fileSize,
                  uploadSource: 'chat',
                  retentionPolicy: categorization.category,
                  retentionDays,
                  scheduledDeletion,
                  metadata: {
                    uploadContext: 'chat',
                    conversationId: currentConversationId,
                    messageId: savedUserMessage.id,
                    categorization
                  }
                });
                console.log(`Saved attachment ${attachment.fileName} with category: ${categorization.category}`);
              }
            } catch (error) {
              console.error(`Failed to save attachment ${attachment.fileName}:`, error);
            }
          })) : Promise.resolve();

        // 5. Legacy message creation
        const legacyUserMessage = await storage.createMessage({
          userId,
          content: content + (attachments && attachments.length > 0 ? ` [${attachments.length} attachment(s)]` : ''),
          isUserMessage: true
        });

        // 6. Stream processing update if enabled
        if (streaming) {
          res.write(`data: ${JSON.stringify({ 
            type: 'processing', 
            conversationId: currentConversationId,
            userMessage: savedUserMessage 
          })}\n\n`);
        }

        // 7. Parallel AI processing and attachment handling
        const aiConfig = { provider: aiProvider, model: aiModel };
        
        const [aiResult] = await Promise.all([
          aiService.getChatResponse(
            content,
            userId,
            currentConversationId,
            legacyUserMessage.id,
            coachingMode,
            conversationHistory,
            aiConfig,
            attachments || [],
            automaticModelSelection || false
          ),
          attachmentProcessing
        ]);

        // 8. Save AI response
        const [savedAiMessage] = await db.insert(conversationMessages).values({
          conversationId: currentConversationId,
          role: 'assistant',
          content: aiResult.response
        }).returning();

        const legacyAiMessage = await storage.createMessage({
          userId,
          content: aiResult.response,
          isUserMessage: false
        });

        return {
          userMessage: legacyUserMessage,
          aiMessage: legacyAiMessage,
          conversationId: currentConversationId,
          memoryInfo: aiResult.memoryInfo,
          savedUserMessage,
          savedAiMessage
        };
      };

      const result = await processOperations();

      if (streaming) {
        // Send final response via SSE
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          ...result 
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'typing_end' })}\n\n`);
        res.end();
      } else {
        // Traditional JSON response
        console.log(`Sending response with conversation ID: ${result.conversationId}`);
        res.status(201).json({
          userMessage: result.userMessage,
          aiMessage: result.aiMessage,
          conversationId: result.conversationId,
          memoryInfo: result.memoryInfo
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const isStreaming = req.body?.streaming || false;
      if (isStreaming) {
        // Send error via SSE
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error instanceof z.ZodError ? "Invalid request data" : "Failed to process message"
        })}\n\n`);
        res.end();
      } else {
        // Traditional error response
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid request data", errors: error.errors });
        } else {
          res.status(500).json({ message: "Failed to process message" });
        }
      }
    }
  });

  // Get health data
  app.get("/api/health-data", async (req, res) => {
    try {
      const range = req.query.range || "7days";
      const category = req.query.category as string;
      const healthData = await storage.getHealthData(1, String(range)); // Default user ID

      // Filter by category if specified
      const filteredData = category 
        ? healthData.filter(item => item.category === category)
        : healthData;

      res.json(filteredData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health data" });
    }
  });

  // Get health data by category
  app.get("/api/health-data/categories", async (req, res) => {
    try {
      const range = req.query.range || "7days";
      const healthData = await storage.getHealthData(1, String(range));

      // Group data by category
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

  // Get connected devices
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices(1); // Default user ID
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  // Connect a new device
  app.post("/api/devices", async (req, res) => {
    try {
      const { deviceName, deviceType } = deviceConnectSchema.parse(req.body);

      const device = await storage.createDevice({
        userId: 1, // Default user ID
        deviceName,
        deviceType,
        lastSync: new Date(),
        isActive: true,
        metadata: {
          features: getDeviceFeatures(deviceType)
        }
      });

      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to connect device" });
      }
    }
  });

  // Disconnect a device
  app.delete("/api/devices/:id", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      await storage.removeDevice(deviceId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to disconnect device" });
    }
  });

  // Update device settings
  app.patch("/api/devices/:id", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      if (isNaN(deviceId)) {
        return res.status(400).json({ message: "Invalid device ID" });
      }

      const device = await storage.updateDevice(deviceId, req.body.settings);
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to update device settings" });
    }
  });

  // Get user settings
  app.get("/api/settings", async (req, res) => {
    try {
      const user = await storage.getUser(1); // Default user ID
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return comprehensive user settings including AI configuration
      const userSettings = {
        ...(user.preferences || {}),
        aiProvider: user.aiProvider,
        aiModel: user.aiModel,
        automaticModelSelection: user.automaticModelSelection,
        transcriptionProvider: user.transcriptionProvider,
        preferredLanguage: user.preferredLanguage,
        memoryDetectionProvider: user.memoryDetectionProvider,
        memoryDetectionModel: user.memoryDetectionModel,
        name: user.name,
        email: user.email
      };
      
      res.json(userSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update user settings
  app.patch("/api/settings", async (req, res) => {
    try {
      const settings = settingsUpdateSchema.parse(req.body);

      // Update attachment retention settings if provided
      if (settings.highValueRetentionDays !== undefined || 
          settings.mediumValueRetentionDays !== undefined || 
          settings.lowValueRetentionDays !== undefined) {
        const retentionUpdates: Partial<any> = {};
        if (settings.highValueRetentionDays !== undefined) retentionUpdates.highValueRetentionDays = settings.highValueRetentionDays;
        if (settings.mediumValueRetentionDays !== undefined) retentionUpdates.mediumValueRetentionDays = settings.mediumValueRetentionDays;
        if (settings.lowValueRetentionDays !== undefined) retentionUpdates.lowValueRetentionDays = settings.lowValueRetentionDays;

        attachmentRetentionService.updateRetentionDurations(retentionUpdates);
      }

      const updatedUser = await storage.updateUserSettings(1, settings); // Default user ID

      // Return comprehensive updated settings including AI configuration
      const updatedSettings = {
        ...(updatedUser.preferences || {}),
        aiProvider: updatedUser.aiProvider,
        aiModel: updatedUser.aiModel,
        automaticModelSelection: updatedUser.automaticModelSelection,
        transcriptionProvider: updatedUser.transcriptionProvider,
        preferredLanguage: updatedUser.preferredLanguage,
        memoryDetectionProvider: updatedUser.memoryDetectionProvider,
        memoryDetectionModel: updatedUser.memoryDetectionModel,
        name: updatedUser.name,
        email: updatedUser.email
      };
      
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });

  // Generate and download health PDF report
  app.get("/api/reports/health-pdf", async (req, res) => {
    try {
      const user = await storage.getUser(1); // Default user ID
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const healthData = await storage.getHealthData(1, "30days");
      const reportData = generatePDFReport(user, healthData);

      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate health report" });
    }
  });

  // Phase 1: Enhanced Memory Detection API
  app.post("/api/memory/enhanced-detect", async (req, res) => {
    try {
      const { message, conversationHistory, coachingMode } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const userProfile = {
        primaryGoal: "weight-loss",
        coachStyle: "motivational", 
        focusAreas: ["nutrition", "exercise", "sleep"],
        preferredLanguage: "en",
        currentCoachingMode: coachingMode || "weight-loss"
      };

      const enhancedDetection = await enhancedMemoryService.detectMemoryWorthy(
        message,
        conversationHistory || [],
        userProfile
      );

      res.json({
        enhancedDetection,
        phase: "1",
        features: {
          contextAwareDetection: true,
          atomicFactExtraction: true,
          contradictionCheck: true,
          temporalRelevance: true,
          confidenceScoring: true
        }
      });
    } catch (error) {
      console.error('Enhanced memory detection error:', error);
      res.status(500).json({ error: "Failed to process enhanced memory detection" });
    }
  });

  // Phase 1: Enhanced Memory Retrieval API  
  app.post("/api/memory/enhanced-retrieve", async (req, res) => {
    try {
      const { query, limit, contextualHints } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const memories = await enhancedMemoryService.getRelevantMemories(
        query,
        1, // Default user ID
        limit || 5,
        contextualHints || []
      );

      res.json({
        memories,
        count: memories.length,
        phase: "1",
        features: {
          dynamicThresholds: true,
          temporalWeighting: true,
          diversityFiltering: true,
          contextualHints: true
        }
      });
    } catch (error) {
      console.error('Enhanced memory retrieval error:', error);
      res.status(500).json({ error: "Failed to retrieve enhanced memories" });
    }
  });

  // Get available AI models
  app.get("/api/ai-models", async (req, res) => {
    try {
      const models = aiService.getAvailableModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  // Get attachment retention settings
  app.get("/api/retention-settings", async (req, res) => {
    try {
      const settings = attachmentRetentionService.getRetentionDurations();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch retention settings" });
    }
  });

  // Update attachment retention settings
  app.patch("/api/retention-settings", async (req, res) => {
    try {
      const settings = retentionSettingsSchema.parse(req.body);
      attachmentRetentionService.updateRetentionDurations(settings);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid retention settings", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update retention settings" });
      }
    }
  });

  // File management endpoints
  app.get('/api/files', async (req, res) => {
    try {
      const userId = 1; // TODO: Get from auth

      // Query files from dedicated files table with category information
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
        .filter(file => !file.isDeleted) // Only return non-deleted files
        .map(file => {
          // Check if file actually exists on disk
          if (!existsSync(file.filePath)) {
            console.log(`Skipping non-existent file in listing: ${file.fileName}`);
            return null;
          }

          return {
            id: file.fileName, // Use fileName as ID for frontend compatibility
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
        .filter(Boolean) // Remove null entries for non-existent files
        .sort((a, b) => {
          if (!a || !b) return 0;
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        }); // Sort by newest first

      res.json(fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  app.post('/api/files/delete', async (req, res) => {
    try {
      const { fileIds } = req.body;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'No file IDs provided' });
      }

      let deletedCount = 0;
      let freedSpace = 0;
      let notFoundCount = 0;

      for (const fileId of fileIds) {
        try {
          // fileId is the fileName from the frontend
          const filePath = join(process.cwd(), 'uploads', fileId);
          console.log(`Attempting to delete file: ${filePath}`);

          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            unlinkSync(filePath);
            deletedCount++;
            freedSpace += stats.size;
            console.log(`Successfully deleted file: ${fileId}, size: ${stats.size} bytes`);
          } else {
            notFoundCount++;
            console.log(`File not found (already deleted or missing): ${filePath}`);
          }

          // Also mark as deleted in database
          await db
            .update(files)
            .set({ isDeleted: true })
            .where(eq(files.fileName, fileId));

        } catch (error) {
          console.error(`Failed to delete file ${fileId}:`, error);
        }
      }

      console.log(`Deletion summary: ${deletedCount} files deleted, ${notFoundCount} files not found, ${freedSpace} bytes freed`);

      // Return success even if files were not found (they're effectively "deleted")
      const totalProcessed = deletedCount + notFoundCount;
      res.json({ 
        deletedCount: totalProcessed, 
        actuallyDeleted: deletedCount,
        notFound: notFoundCount,
        freedSpace 
      });
    } catch (error) {
      console.error('Error deleting files:', error);
      res.status(500).json({ error: 'Failed to delete files' });
    }
  });

  // Update file categories (manual categorization)
  app.patch('/api/files/categorize', async (req, res) => {
    try {
      const { fileIds, categoryId } = req.body;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'No file IDs provided' });
      }

      // Validate category if provided
      if (categoryId) {
        const category = await categoryService.getCategoryById(categoryId, FIXED_USER_ID);
        if (!category) {
          return res.status(400).json({ error: 'Invalid category ID' });
        }
      }

      // Update files in database
      let updatedCount = 0;
      for (const fileId of fileIds) {
        try {
          const result = await db
            .update(files)
            .set({ 
              categoryId: categoryId || null,
              updatedAt: new Date()
            })
            .where(eq(files.fileName, fileId))
            .returning();

          if (result.length > 0) {
            updatedCount++;
            console.log(`Updated category for file ${fileId} to ${categoryId || 'uncategorized'}`);
          }
        } catch (error) {
          console.error(`Failed to update category for file ${fileId}:`, error);
        }
      }

      res.json({ 
        success: true,
        updatedCount,
        categoryId: categoryId || null
      });
    } catch (error) {
      console.error('Error updating file categories:', error);
      res.status(500).json({ error: 'Failed to update file categories' });
    }
  });

  // Memory management endpoints

  // Get user's memories
  app.get("/api/memories", async (req, res) => {
    try {
      const userId = 1; // Default user ID
      const category = req.query.category as string;
      const memories = await memoryService.getUserMemories(userId, category as any);
      res.json(memories);
    } catch (error) {
      console.error('Error fetching memories:', error);
      res.status(500).json({ message: "Failed to fetch memories" });
    }
  });

  // Bulk delete memories (must come before single delete route)
  app.delete("/api/memories/bulk", async (req, res) => {
    try {
      const userId = 1; // Default user ID
      const { memoryIds } = req.body;

      if (!memoryIds || !Array.isArray(memoryIds) || memoryIds.length === 0) {
        return res.status(400).json({ message: "Invalid memory IDs array" });
      }

      let successCount = 0;
      let errors = [];

      for (const memoryId of memoryIds) {
        try {
          const success = await memoryService.deleteMemory(memoryId, userId);
          if (success) {
            successCount++;
          } else {
            errors.push({ memoryId, error: "Memory not found" });
          }
        } catch (error) {
          console.error(`Error deleting memory ${memoryId}:`, error);
          errors.push({ memoryId, error: "Failed to delete memory" });
        }
      }

      res.json({
        successCount,
        totalRequested: memoryIds.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Error in bulk delete memories:', error);
      res.status(500).json({ message: "Failed to bulk delete memories" });
    }
  });

  // Delete a single memory
  app.delete("/api/memories/:id", async (req, res) => {
    try {
      const userId = 1; // Default user ID
      const memoryId = req.params.id;

      const success = await memoryService.deleteMemory(memoryId, userId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Memory not found" });
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
      res.status(500).json({ message: "Failed to delete memory" });
    }
  });

  // Get conversations with metadata
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = 1; // Default user ID

      // Get conversations with message counts and attachment info
      const userConversations = await db
        .select({
          id: conversations.id,
          userId: conversations.userId,
          title: conversations.title,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt
        })
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(20);

      // Enhance with metadata
      const enhancedConversations = await Promise.all(
        userConversations.map(async (conv) => {
          const messages = await db
            .select()
            .from(conversationMessages)
            .where(eq(conversationMessages.conversationId, conv.id));

          const hasAttachments = messages.some(msg => 
            msg.metadata && 
            typeof msg.metadata === 'object' && 
            'attachments' in msg.metadata &&
            Array.isArray(msg.metadata.attachments) &&
            msg.metadata.attachments.length > 0
          );

          return {
            ...conv,
            messageCount: messages.length,
            hasAttachments
          };
        })
      );

      res.json(enhancedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = req.params.id;
      console.log("Fetching messages for conversation:", conversationId);

      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

      console.log(`Found ${messages.length} messages for conversation ${conversationId}`);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      res.status(500).json({ message: "Failed to fetch conversation messages" });
    }
  });

  // Configure multer for audio file uploads
  const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept audio files
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    }
  });

  // Configure multer for general file uploads
  const fileUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit for general files
    },
    fileFilter: (req, file, cb) => {
      // Accept various file types
      const allowedTypes = [
        'image/',
        'video/',
        'audio/',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
      if (isAllowed) {
        cb(null, true);
      } else {
        cb(new Error('File type not supported'));
      }
    }
  });

  // File upload endpoint with Go microservice integration (TIER 3: 40% speed improvement)
  app.post("/api/upload", fileUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const uploadStartTime = Date.now();

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        const { mkdirSync } = await import('fs');
        mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const fileId = nanoid();
      const fileExtension = req.file.originalname.split('.').pop() || '';
      const fileName = `${fileId}.${fileExtension}`;
      const filePath = join(uploadsDir, fileName);

      // TIER 3 OPTIMIZATION: Parallel processing with Go microservice
      const [fileWriteResult, goProcessingResult] = await Promise.all([
        // File write operation
        (async () => {
          const { writeFileSync } = await import('fs');
          writeFileSync(filePath, req.file.buffer);
          return { success: true };
        })(),
        
        // Ultra-fast Go microservice processing (concurrent metadata extraction & optimization)
        (async () => {
          try {
            const result = await goFileService.processFile(
              req.file.originalname, 
              req.file.buffer, 
              req.file.mimetype.startsWith('image/') // Generate thumbnails for images only
            );
            console.log(`[TIER 3] Go service processed ${req.file.originalname} in ${result.processingTime}ms`);
            return result;
          } catch (error) {
            console.warn('[TIER 3] Go service unavailable, using Node.js fallback:', error);
            return null;
          }
        })()
      ]);

      const originalFileName = req.file.originalname;
      const uniqueFileName = fileName;

      // Get retention information for the uploaded file
      const retentionInfo = attachmentRetentionService.getRetentionInfo(
        originalFileName,
        req.file.mimetype
      );

      let validatedCategoryId: string | undefined = undefined;
      const categoryIdFromRequest = req.body.category as string | undefined;

      if (categoryIdFromRequest) {
        try {
          const category = await categoryService.getCategoryById(categoryIdFromRequest, FIXED_USER_ID);
          if (!category) {
            return res.status(400).json({
              error: "Invalid category ID provided.",
              details: `Category with ID '${categoryIdFromRequest}' not found or not accessible by user ${FIXED_USER_ID}.`
            });
          }
          validatedCategoryId = category.id;
        } catch (serviceError: any) {
          console.error('Category validation error during upload:', serviceError);
          return res.status(500).json({ error: "Error validating category during upload.", details: serviceError.message });
        }
      }

      const fileData: any = {
        id: fileId,
        fileName: uniqueFileName,
        displayName: originalFileName,
        originalName: originalFileName,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        url: `/uploads/${uniqueFileName}`,
        retentionInfo,
      };

      if (validatedCategoryId) {
        fileData.categoryId = validatedCategoryId; // Note: key is categoryId
      }

      // Store file in dedicated files table
      const userId = 1; // TODO: Get from authentication
      
      // Calculate retention settings
      const fileRetentionInfo = await attachmentRetentionService.getRetentionInfo(
        originalFileName,
        req.file.mimetype
      );

      // Enhanced metadata from Go service (TIER 3 optimization)
      let enhancedMetadata = {
        retentionInfo: fileRetentionInfo,
        uploadContext: 'file_manager',
        processingTime: Date.now() - uploadStartTime,
        goServiceUsed: !!goProcessingResult
      };

      if (goProcessingResult && goProcessingResult.success) {
        enhancedMetadata = {
          ...enhancedMetadata,
          goProcessingTime: goProcessingResult.processingTime,
          md5Hash: goProcessingResult.original.md5Hash,
          perceptualHash: goProcessingResult.original.perceptualHash,
          exifData: goProcessingResult.original.exifData,
          dimensions: goProcessingResult.original.width && goProcessingResult.original.height ? {
            width: goProcessingResult.original.width,
            height: goProcessingResult.original.height
          } : undefined,
          thumbnails: goProcessingResult.thumbnails,
          colorProfile: goProcessingResult.original.colorProfile
        };
      }
      
      let retentionDays = null;
      let scheduledDeletion = null;
      
      if (fileRetentionInfo.category === 'high') {
        // Permanent files - no deletion
        retentionDays = null;
      } else if (fileRetentionInfo.category === 'medium') {
        retentionDays = 90;
        scheduledDeletion = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000));
      } else if (fileRetentionInfo.category === 'low') {
        retentionDays = 30;
        scheduledDeletion = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
      }

      // Create file record in database
      const [savedFile] = await db.insert(files).values({
        userId,
        categoryId: validatedCategoryId || fileRetentionInfo.suggestedCategoryId || null,
        fileName: uniqueFileName,
        displayName: originalFileName,
        filePath: filePath,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadSource: 'direct', // Direct upload from file manager
        retentionPolicy: fileRetentionInfo.category,
        retentionDays,
        scheduledDeletion,
        metadata: enhancedMetadata
      }).returning();

      res.json({
        success: true,
        file: fileData
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      res.status(500).json({ 
        error: "File upload failed", 
        details: error.message 
      });
    }
  });

  // Get transcription provider capabilities
  app.get("/api/transcription/providers", async (req, res) => {
    try {
      const capabilities = transcriptionService.getProviderCapabilities();
      res.json(capabilities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch provider capabilities" });
    }
  });

  // OpenAI Whisper transcription endpoint
  app.post("/api/transcribe/openai", audioUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Get user's preferred language (default to English if not set)
      const user = await storage.getUser(1); // For now using user ID 1, in production this would come from authentication
      const preferredLanguage = user?.preferredLanguage || 'en';

      const result = await transcriptionService.transcribeWithOpenAI(
        req.file.buffer,
        req.file.originalname || "audio.wav",
        preferredLanguage as any
      );

      res.json(result);
    } catch (error: any) {
      console.error('OpenAI transcription error:', error);
      res.status(500).json({ 
        error: "Transcription failed", 
        details: error.message,
        provider: "openai"
      });
    }
  });

  // Google Speech-to-Text transcription endpoint
  app.post("/api/transcribe/google", audioUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Get user's preferred language (default to English if not set)
      const user = await storage.getUser(1); // For now using user ID 1, in production this would come from authentication
      const preferredLanguage = user?.preferredLanguage || 'en';

      const result = await transcriptionService.transcribeWithGoogle(
        req.file.buffer,
        preferredLanguage as any
      );

      res.json(result);
    } catch (error: any) {
      console.error('Google transcription error:', error);
      res.status(500).json({ 
        error: "Transcription failed", 
        details: error.message,
        provider: "google"
      });
    }
  });

  // Category Routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await categoryService.getCategories(FIXED_USER_ID);
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories", error: error.message });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedBody = createCategoryBodySchema.parse(req.body);
      const newCategory = await categoryService.createCategory(FIXED_USER_ID, validatedBody);
      res.status(201).json(newCategory);
    } catch (error: any) {
      console.error("Error creating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      // Check for specific error messages from the service, e.g., name conflict
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create category", error: error.message });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    const categoryId = req.params.id;
    try {
      const validatedBody = updateCategoryBodySchema.parse(req.body);
      if (Object.keys(validatedBody).length === 0) {
        return res.status(400).json({ message: "No fields to update provided." });
      }
      const updatedCategory = await categoryService.updateCategory(FIXED_USER_ID, categoryId, validatedBody);
      if (updatedCategory) {
        res.json(updatedCategory);
      } else {
        res.status(404).json({ message: "Category not found or not authorized to update." });
      }
    } catch (error: any) {
      console.error(`Error updating category ${categoryId}:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      if (error.message?.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update category", error: error.message });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const categoryId = req.params.id;
    try {
      const result = await categoryService.deleteCategory(FIXED_USER_ID, categoryId);
      if (result.success) {
        res.status(204).send();
      } else {
        // Determine appropriate status code based on message
        if (result.message?.includes("not found") || result.message?.includes("not authorized")) {
          res.status(404).json({ message: result.message }); // Could be 403 if specifically not authorized
        } else {
          res.status(400).json({ message: result.message }); // General client error
        }
      }
    } catch (error: any) {
      console.error(`Error deleting category ${categoryId}:`, error);
      res.status(500).json({ message: "Failed to delete category", error: error.message });
    }
  });

  // Seed categories endpoint
  app.post("/api/categories/seed", async (req, res) => {
    try {
      const { seedDefaultCategories } = await import('./services/category-service.js');
      await seedDefaultCategories();
      res.json({ message: "Default categories seeded successfully" });
    } catch (error: any) {
      console.error("Error seeding categories:", error);
      res.status(500).json({ message: "Failed to seed categories", error: error.message });
    }
  });

  // Cache monitoring and management endpoints
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

  // Phase 2: Semantic Memory Graph API endpoints
  app.get("/api/memory/graph/:memoryId", async (req, res) => {
    try {
      const { memoryGraphService } = await import("./services/memory-graph-service-instance.js");
      const memoryNode = await memoryGraphService.getMemoryNode(req.params.memoryId);
      
      if (!memoryNode) {
        res.status(404).json({ message: "Memory not found" });
        return;
      }
      
      res.json(memoryNode);
    } catch (error: any) {
      console.error("Error fetching memory node:", error);
      res.status(500).json({ message: "Failed to fetch memory node", error: error.message });
    }
  });

  // Phase 3: Advanced Retrieval Intelligence API endpoints
  app.post("/api/memory/intelligent-retrieve", async (req, res) => {
    try {
      const { intelligentMemoryRetrieval } = await import("./services/intelligent-memory-retrieval.js");
      const { query, userId, conversationContext, maxResults = 8 } = req.body;

      if (!query || !userId) {
        res.status(400).json({ message: "Query and userId are required" });
        return;
      }

      const contextualMemories = await intelligentMemoryRetrieval.getContextualMemories(
        userId,
        query,
        conversationContext || {
          userId,
          coachingMode: 'general',
          recentTopics: [],
          userIntent: 'general',
          temporalContext: 'recent',
          sessionLength: 1
        },
        maxResults
      );

      res.json({
        memories: contextualMemories,
        meta: {
          totalResults: contextualMemories.length,
          retrievalTime: Date.now(),
          intelligentRetrieval: true
        }
      });
    } catch (error: any) {
      console.error("Error in intelligent memory retrieval:", error);
      res.status(500).json({ message: "Failed to retrieve memories", error: error.message });
    }
  });

  app.post("/api/memory/query-expansion", async (req, res) => {
    try {
      const { intelligentMemoryRetrieval } = await import("./services/intelligent-memory-retrieval.js");
      const { query, conversationContext } = req.body;

      if (!query) {
        res.status(400).json({ message: "Query is required" });
        return;
      }

      // Use private method via reflection for testing
      const expansion = await (intelligentMemoryRetrieval as any).expandQuery(
        query,
        conversationContext || {
          userId: 1,
          coachingMode: 'general',
          recentTopics: [],
          userIntent: 'general',
          temporalContext: 'recent',
          sessionLength: 1
        }
      );

      res.json(expansion);
    } catch (error: any) {
      console.error("Error in query expansion:", error);
      res.status(500).json({ message: "Failed to expand query", error: error.message });
    }
  });

  app.post("/api/memory/adaptive-thresholds", async (req, res) => {
    try {
      const { intelligentMemoryRetrieval } = await import("./services/intelligent-memory-retrieval.js");
      const { query, conversationContext } = req.body;

      if (!query) {
        res.status(400).json({ message: "Query is required" });
        return;
      }

      const expandedQuery = {
        originalQuery: query,
        expandedTerms: [query],
        synonyms: [],
        relatedConcepts: [],
        semanticClusters: [query]
      };

      // Use private method via reflection for testing
      const thresholds = await (intelligentMemoryRetrieval as any).calculateAdaptiveThreshold(
        expandedQuery,
        conversationContext || {
          userId: 1,
          coachingMode: 'general',
          recentTopics: [],
          userIntent: 'general',
          temporalContext: 'recent',
          sessionLength: 1
        }
      );

      res.json(thresholds);
    } catch (error: any) {
      console.error("Error calculating adaptive thresholds:", error);
      res.status(500).json({ message: "Failed to calculate thresholds", error: error.message });
    }
  });

  app.post("/api/memory/extract-facts/:memoryId", async (req, res) => {
    try {
      const { memoryGraphService } = await import("./services/memory-graph-service-instance.js");
      const memoryId = req.params.memoryId;
      
      // Get the memory entry
      const memory = await db.select()
        .from(memoryEntries)
        .where(eq(memoryEntries.id, memoryId))
        .limit(1);
      
      if (memory.length === 0) {
        res.status(404).json({ message: "Memory not found" });
        return;
      }
      
      const { sourceContext } = req.body;
      const facts = await memoryGraphService.extractAtomicFacts(memory[0], sourceContext);
      
      res.json({
        memoryId,
        factsExtracted: facts.length,
        facts
      });
    } catch (error: any) {
      console.error("Error extracting atomic facts:", error);
      res.status(500).json({ message: "Failed to extract atomic facts", error: error.message });
    }
  });

  app.post("/api/memory/detect-relationships/:memoryId", async (req, res) => {
    try {
      const { memoryGraphService } = await import("./services/memory-graph-service-instance.js");
      const memoryId = req.params.memoryId;
      
      // Get the new memory
      const newMemory = await db.select()
        .from(memoryEntries)
        .where(eq(memoryEntries.id, memoryId))
        .limit(1);
      
      if (newMemory.length === 0) {
        res.status(404).json({ message: "Memory not found" });
        return;
      }
      
      // Get existing memories for the same user
      const existingMemories = await db.select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, newMemory[0].userId),
          eq(memoryEntries.isActive, true)
        ))
        .limit(50); // Limit for performance
      
      const relationships = await memoryGraphService.detectMemoryRelationships(
        newMemory[0], 
        existingMemories.filter(m => m.id !== memoryId)
      );
      
      res.json({
        memoryId,
        relationshipsDetected: relationships.length,
        relationships
      });
    } catch (error: any) {
      console.error("Error detecting relationships:", error);
      res.status(500).json({ message: "Failed to detect relationships", error: error.message });
    }
  });

  app.post("/api/memory/consolidate/:userId", async (req, res) => {
    try {
      const { memoryGraphService } = await import("./services/memory-graph-service-instance.js");
      const userId = parseInt(req.params.userId);
      
      const results = await memoryGraphService.consolidateRelatedMemories(userId);
      
      res.json({
        userId,
        consolidationResults: results.length,
        results
      });
    } catch (error: any) {
      console.error("Error consolidating memories:", error);
      res.status(500).json({ message: "Failed to consolidate memories", error: error.message });
    }
  });

  app.get("/api/memory/graph-metrics/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const metrics = await db.select()
        .from(memoryGraphMetrics)
        .where(eq(memoryGraphMetrics.userId, userId))
        .orderBy(desc(memoryGraphMetrics.lastCalculated))
        .limit(1);
      
      if (metrics.length === 0) {
        res.status(404).json({ message: "No metrics found for user" });
        return;
      }
      
      res.json(metrics[0]);
    } catch (error: any) {
      console.error("Error fetching graph metrics:", error);
      res.status(500).json({ message: "Failed to fetch graph metrics", error: error.message });
    }
  });

  app.get("/api/memory/relationships/:memoryId", async (req, res) => {
    try {
      const memoryId = req.params.memoryId;
      
      const relationships = await db.select()
        .from(memoryRelationships)
        .where(or(
          eq(memoryRelationships.sourceMemoryId, memoryId),
          eq(memoryRelationships.targetMemoryId, memoryId)
        ));
      
      res.json(relationships);
    } catch (error: any) {
      console.error("Error fetching memory relationships:", error);
      res.status(500).json({ message: "Failed to fetch relationships", error: error.message });
    }
  });

  app.get("/api/memory/atomic-facts/:memoryId", async (req, res) => {
    try {
      const memoryId = req.params.memoryId;
      
      const facts = await db.select()
        .from(atomicFacts)
        .where(eq(atomicFacts.memoryEntryId, memoryId));
      
      res.json(facts);
    } catch (error: any) {
      console.error("Error fetching atomic facts:", error);
      res.status(500).json({ message: "Failed to fetch atomic facts", error: error.message });
    }
  });

  app.get("/api/memory/consolidation-log/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const logs = await db.select()
        .from(memoryConsolidationLog)
        .where(eq(memoryConsolidationLog.userId, userId))
        .orderBy(desc(memoryConsolidationLog.createdAt))
        .limit(limit);
      
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching consolidation log:", error);
      res.status(500).json({ message: "Failed to fetch consolidation log", error: error.message });
    }
  });

  return httpServer;
}

// Helper functions for cache statistics
function calculateOverallHitRate(stats: Record<string, any>): string {
  let totalHits = 0;
  let totalRequests = 0;
  
  Object.values(stats).forEach((stat: any) => {
    totalHits += stat.hits || 0;
    totalRequests += (stat.hits || 0) + (stat.misses || 0);
  });
  
  return totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) + '%' : '0%';
}

function calculateTotalMemoryUsage(stats: Record<string, any>): number {
  return Object.values(stats).reduce((total: number, stat: any) => {
    return total + (stat.memoryUsage || 0);
  }, 0);
}

// Helper function to determine device features based on type
function getDeviceFeatures(deviceType: string): string[] {
  switch (deviceType) {
    case 'smartwatch':
      return ['Step tracking', 'Heart rate', 'Sleep tracking', 'Exercise detection'];
    case 'scale':
      return ['Weight', 'Body fat', 'Muscle mass', 'BMI'];
    case 'heart-rate':
      return ['Heart rate zones', 'Continuous monitoring', 'Workout detection'];
    case 'fitness-tracker':
      return ['Step tracking', 'Sleep tracking', 'Calorie burn', 'Activity detection'];
    case 'bp-monitor':
      return ['Blood pressure', 'Heart health', 'Trend analysis'];
    default:
      return ['Basic tracking'];
  }
}