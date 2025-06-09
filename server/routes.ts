import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/ai-service";
import { memoryService } from "./services/memory-service";
import { generatePDFReport } from "./services/pdf-service";
import { transcriptionService } from "./services/transcription-service";
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "./db";
import { conversations, conversationMessages, memoryEntries } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { join } from 'path';
import { existsSync } from 'fs';
import path from 'path';
import fs from 'fs';
import { attachmentRetentionService } from "./services/attachment-retention-service";
import { statSync, unlinkSync } from 'fs';

// Attachment schema for client
const attachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  displayName: z.string().optional(),
  fileType: z.string(),
  fileSize: z.number()
});

// Message payload schema
const messageSchema = z.object({
  content: z.string(),
  conversationId: z.string().nullable().optional(),
  coachingMode: z.string().optional().default("weight-loss"),
  aiProvider: z.enum(["openai", "google"]).optional().default("openai"),
  aiModel: z.string().optional().default("gpt-4o"),
  attachments: z.array(attachmentSchema).optional(),
  automaticModelSelection: z.boolean().optional().default(false)
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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

  // Send a new message with memory enhancement
  app.post("/api/messages", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection } = messageSchema.parse(req.body);
      const userId = 1; // Default user ID

      let currentConversationId = conversationId;
      let conversationHistory: any[] = [];

      console.log(`Received message with conversation ID: ${currentConversationId}`);

      // 1. If we have a conversationId, fetch its history FIRST.
      if (currentConversationId) {
        console.log(`Fetching history for conversation: ${currentConversationId}`);

        // Validate that the conversation exists
        const existingConv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, currentConversationId))
          .limit(1);

        if (existingConv.length === 0) {
          console.warn(`Conversation ${currentConversationId} not found! Setting to null to create new one.`);
          currentConversationId = null;
        } else {
          const historyFromDb = await db
            .select()
            .from(conversationMessages)
            .where(eq(conversationMessages.conversationId, currentConversationId))
            .orderBy(conversationMessages.createdAt)
            .limit(20);
          conversationHistory = historyFromDb;
          console.log(`Fetched conversation history: ${conversationHistory.length} messages for conversation ${currentConversationId}`);

          // Debug: Log the conversation history details
          if (conversationHistory.length > 0) {
            console.log(`History preview: ${conversationHistory.map(m => `${m.role}: ${m.content?.substring(0, 50)}...`).join(' | ')}`);
          }
        }
      }

      // 2. If no conversationId, create a new one now.
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
        conversationHistory = []; // Empty history for new conversation
      }

      // 3. Save the new user message to the database.
      // This happens AFTER we've fetched the previous history.
      const [savedUserMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId,
        role: 'user',
        content,
        metadata: attachments && attachments.length > 0 ? { attachments } : undefined
      }).returning();

      console.log(`Saved user message ${savedUserMessage.id} to conversation ${currentConversationId}`);

      // Also save to legacy messages for compatibility
      const legacyUserMessage = await storage.createMessage({
        userId,
        content: content + (attachments && attachments.length > 0 ? ` [${attachments.length} attachment(s)]` : ''),
        isUserMessage: true
      });

      // 4. Call the AI service with raw, un-formatted data.
      // The service will handle building the context.
      const aiConfig = { provider: aiProvider, model: aiModel };
      const aiResult = await aiService.getChatResponse(
        content, // Pass the original, raw message content
        userId,
        currentConversationId,
        legacyUserMessage.id,
        coachingMode,
        conversationHistory, // Pass the clean history (without the current message)
        aiConfig,
        attachments || [], // Pass the raw attachments array
        automaticModelSelection || false
      );

      // Save AI response to conversation
      const [savedAiMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId,
        role: 'assistant',
        content: aiResult.response
      }).returning();

      console.log(`Saved AI message ${savedAiMessage.id} to conversation ${currentConversationId}`);

      // Also save to legacy messages for compatibility
      const legacyAiMessage = await storage.createMessage({
        userId,
        content: aiResult.response,
        isUserMessage: false
      });

      const response = { 
        userMessage: legacyUserMessage, 
        aiMessage: legacyAiMessage,
        conversationId: currentConversationId,
        memoryInfo: aiResult.memoryInfo
      };

      console.log(`Sending response with conversation ID: ${currentConversationId}`);
      res.status(201).json(response);
    } catch (error) {
      console.error('Chat error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process message" });
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

      res.json(user.preferences || {});
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

      res.json(updatedUser.preferences);
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

  // Get available AI models
  app.get("/api/ai-models", async (req, res) => {
    try {
      const models = chatService.getAvailableModels();
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

      // Get all conversations with messages that have attachments
      const conversationsWithMessages = await db
        .select()
        .from(conversations)
        .leftJoin(
          conversationMessages,
          eq(conversations.id, conversationMessages.conversationId)
        )
        .where(eq(conversations.userId, userId));

      const files: any[] = [];
      const processedFiles = new Set<string>();

      for (const row of conversationsWithMessages) {
        const message = row.conversation_messages;
        if (!message?.metadata?.attachments) continue;

        const attachments = message.metadata.attachments as any[];

        for (const attachment of attachments) {
          if (processedFiles.has(attachment.fileName)) continue;
          processedFiles.add(attachment.fileName);

          // Check if file actually exists on disk
          const filePath = join(process.cwd(), 'uploads', attachment.fileName);
          if (!existsSync(filePath)) {
            console.log(`Skipping non-existent file in listing: ${attachment.fileName}`);
            continue;
          }

          // Get retention info for this file
          const retentionInfo = attachmentRetentionService.getRetentionInfo(
            attachment.displayName || attachment.fileName,
            attachment.fileType,
            message.content
          );

          files.push({
            id: attachment.fileName, // Use fileName as ID
            fileName: attachment.fileName,
            displayName: attachment.displayName || attachment.originalName || attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize || 0,
            uploadDate: message.timestamp,
            retentionInfo,
            url: `/uploads/${attachment.fileName}`
          });
        }
      }

      // Sort by upload date (newest first)
      files.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

      res.json(files);
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

  // Delete a memory
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

  // File upload endpoint
  app.post("/api/upload", fileUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

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

      // Save file to disk
      const { writeFileSync } = await import('fs');
      writeFileSync(filePath, req.file.buffer);

      const originalFileName = req.file.originalname;
      const uniqueFileName = fileName;

      // Get retention information for the uploaded file
      const retentionInfo = attachmentRetentionService.getRetentionInfo(
        originalFileName,
        req.file.mimetype
      );

      res.json({
        success: true,
        file: {
          id: fileId,
          fileName: uniqueFileName,
          displayName: originalFileName,
          originalName: originalFileName,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          url: `/uploads/${uniqueFileName}`,
          retentionInfo
        }
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

  return httpServer;
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