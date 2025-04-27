import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatService } from "./services/openai-service";
import { generatePDFReport } from "./services/pdf-service";
import { z } from "zod";
import { nanoid } from "nanoid";

// Message payload schema
const messageSchema = z.object({
  content: z.string().min(1),
  coachingMode: z.string().optional().default("weight-loss")
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
  dataSharing: z.boolean().optional()
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
  
  // Send a new message
  app.post("/api/messages", async (req, res) => {
    try {
      const { content, coachingMode } = messageSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.createMessage({
        userId: 1, // Default user ID
        content,
        isUserMessage: true
      });
      
      // Get AI response from OpenAI
      const aiResponse = await chatService.getChatResponse(content, coachingMode);
      
      // Save AI message
      const aiMessage = await storage.createMessage({
        userId: 1, // Default user ID
        content: aiResponse,
        isUserMessage: false
      });
      
      res.status(201).json({ userMessage, aiMessage });
    } catch (error) {
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
