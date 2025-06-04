import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatService } from "./services/openai-service";
import { memoryService } from "./services/memory-service";
import { generatePDFReport } from "./services/pdf-service";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "./db";
import { conversations, conversationMessages, memoryEntries } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// Message payload schema
const messageSchema = z.object({
  content: z.string().min(1),
  conversationId: z.string().optional(),
  coachingMode: z.string().optional().default("weight-loss"),
  aiProvider: z.enum(["openai", "google"]).optional().default("openai"),
  aiModel: z.string().optional().default("gpt-4o")
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
  aiModel: z.string().optional()
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
      const { content, conversationId, coachingMode, aiProvider, aiModel } = messageSchema.parse(req.body);
      const userId = 1; // Default user ID
      
      // Get or create conversation
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const [newConversation] = await db.insert(conversations).values({
          userId,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : '')
        }).returning();
        currentConversationId = newConversation.id;
      }

      // Save user message to conversation
      const [userMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId,
        role: 'user',
        content
      }).returning();

      // Also save to legacy messages for compatibility
      const legacyUserMessage = await storage.createMessage({
        userId,
        content,
        isUserMessage: true
      });

      // Get conversation history for context
      const conversationHistory = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, currentConversationId))
        .orderBy(desc(conversationMessages.createdAt))
        .limit(10);

      // Get AI response with memory enhancement
      const aiConfig = { provider: aiProvider, model: aiModel };
      const aiResult = await chatService.getChatResponse(
        content,
        userId,
        currentConversationId,
        legacyUserMessage.id,
        coachingMode,
        conversationHistory.reverse(),
        aiConfig
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
      const healthData = await storage.getHealthData(1, String(range)); // Default user ID
      res.json(healthData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health data" });
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
