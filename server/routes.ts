import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatService } from "./services/openai-service";
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
  automaticModelSelection: z.boolean().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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

      // Get or create conversation
      let currentConversationId = conversationId;

      // 1. If no conversationId, create a new one first.
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
      }

      // 2. Fetch conversation history BEFORE saving the new message
      // This ensures the current message is not included in the history
      const conversationHistory = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, currentConversationId))
        .orderBy(conversationMessages.createdAt)
        .limit(20);

      // 3. Save the new user message to the database.
      // This happens AFTER we've fetched the previous history.
      await db.insert(conversationMessages).values({
        conversationId: currentConversationId,
        role: 'user',
        content,
        metadata: attachments && attachments.length > 0 ? { attachments } : undefined
      }).returning();

      // Also save to legacy messages for compatibility
      const legacyUserMessage = await storage.createMessage({
        userId,
        // The legacy content can still have the simple attachment text
        content: content + (attachments && attachments.length > 0 ? ` [${attachments.length} attachment(s)]` : ''),
        isUserMessage: true
      });

      // 4. Call the AI service with raw data
      const aiConfig = { provider: aiProvider, model: aiModel };
      const aiResult = await chatService.getChatResponse(
        content,
        userId,
        currentConversationId,
        legacyUserMessage.id,
        coachingMode,
        conversationHistory, // Clean history without current message
        aiConfig,
        attachments || [],
        automaticModelSelection || false
      );

      // Save AI response to conversation
      const [aiMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId,
        role: 'assistant',
        content: aiResult.response
      }).returning();

      // Also save to legacy messages for compatibility
      const legacyAiMessage = await storage.createMessage({
        userId,
        content: aiResult.response,
        isUserMessage: false
      });

      res.status(201).json({ 
        userMessage: legacyUserMessage, 
        aiMessage: legacyAiMessage,
        conversationId: currentConversationId,
        memoryInfo: aiResult.memoryInfo
      });
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

  // Get conversation messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = req.params.id;
      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

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

      const fileInfo = {
        id: fileId,
        fileName: fileName, // This is the generated filename that's actually saved
        originalName: req.file.originalname,
        displayName: req.file.originalname, // This is what users see
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        file: fileInfo,
        message: `File "${req.file.originalname}" uploaded successfully`
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