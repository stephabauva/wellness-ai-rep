import { 
  users, 
  type User, 
  type InsertUser,
  chatMessages,
  type ChatMessage,
  type InsertChatMessage,
  healthData,
  type HealthData,
  type InsertHealthData,
  connectedDevices,
  type ConnectedDevice,
  type InsertConnectedDevice,
  coachingModes
} from "@shared/schema";
import { nanoid } from "nanoid";
import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "./db";

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSettings(id: number, settings: any): Promise<User>;
  
  // Message methods
  getMessages(userId: number): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Health data methods
  getHealthData(userId: number, timeRange: string): Promise<HealthData[]>;
  createHealthData(data: InsertHealthData): Promise<HealthData>;
  
  // Device methods
  getDevices(userId: number): Promise<ConnectedDevice[]>;
  getDevice(id: number): Promise<ConnectedDevice | undefined>;
  createDevice(device: InsertConnectedDevice): Promise<ConnectedDevice>;
  updateDevice(id: number, settings: any): Promise<ConnectedDevice>;
  removeDevice(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, ChatMessage[]>;
  private healthData: Map<number, HealthData[]>;
  private devices: Map<number, ConnectedDevice>;
  private userId: number;
  private messageId: number;
  private healthDataId: number;
  private deviceId: number;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.healthData = new Map();
    this.devices = new Map();
    this.userId = 1;
    this.messageId = 1;
    this.healthDataId = 1;
    this.deviceId = 1;
    
    // Initialize with a default user
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default user
    const defaultUser: User = {
      id: 1,
      username: "janesmith",
      password: "password", // In a real app, this would be hashed
      name: "Jane Smith",
      email: "jane.smith@example.com",
      preferences: {
        primaryGoal: "weight-loss",
        coachStyle: "motivational",
        reminderFrequency: "daily",
        focusAreas: ["nutrition", "exercise", "sleep"],
        darkMode: false,
        pushNotifications: true,
        emailSummaries: true,
        dataSharing: false,
        aiProvider: "google",
        aiModel: "gemini-2.0-flash-exp"
      },
      createdAt: new Date()
    };
    this.users.set(1, defaultUser);
    
    // Create welcome message
    const initialMessages: ChatMessage[] = [
      {
        id: this.messageId++,
        userId: 1,
        content: "Welcome to your AI wellness coach! I'm here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you're focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I'm ready to help. What would you like to work on today?",
        isUserMessage: false,
        timestamp: new Date()
      }
    ];
    this.messages.set(1, initialMessages);
    
    // Create initial health data (mock data for demo purposes)
    const today = new Date();
    const healthDataEntries: HealthData[] = [];
    
    // Steps data
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      healthDataEntries.push({
        id: this.healthDataId++,
        userId: 1,
        dataType: "steps",
        value: (6000 + Math.floor(Math.random() * 5000)).toString(),
        unit: "steps",
        timestamp: date,
        source: "smartwatch"
      });
      
      healthDataEntries.push({
        id: this.healthDataId++,
        userId: 1,
        dataType: "sleep",
        value: (6 + Math.random() * 2).toFixed(1),
        unit: "hours",
        timestamp: date,
        source: "smartwatch"
      });
      
      healthDataEntries.push({
        id: this.healthDataId++,
        userId: 1,
        dataType: "heartRate",
        value: (65 + Math.floor(Math.random() * 15)).toString(),
        unit: "bpm",
        timestamp: date,
        source: "smartwatch"
      });
    }
    
    // Weight data
    healthDataEntries.push({
      id: this.healthDataId++,
      userId: 1,
      dataType: "weight",
      value: "165",
      unit: "lbs",
      timestamp: new Date(today.setDate(today.getDate() - 1)),
      source: "scale"
    });
    
    this.healthData.set(1, healthDataEntries);
    
    // Create connected devices
    const smartwatch: ConnectedDevice = {
      id: this.deviceId++,
      userId: 1,
      deviceName: "FitTrack Smartwatch",
      deviceType: "smartwatch",
      lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isActive: true,
      metadata: {
        features: ["Step tracking", "Heart rate", "Sleep tracking", "Exercise detection"]
      }
    };
    
    const scale: ConnectedDevice = {
      id: this.deviceId++,
      userId: 1,
      deviceName: "HealthScale Pro",
      deviceType: "scale",
      lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      isActive: true,
      metadata: {
        features: ["Weight", "Body fat", "Muscle mass", "BMI"]
      }
    };
    
    this.devices.set(smartwatch.id, smartwatch);
    this.devices.set(scale.id, scale);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserSettings(id: number, settings: any): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      preferences: {
        ...user.preferences,
        ...settings
      }
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Message methods
  async getMessages(userId: number): Promise<ChatMessage[]> {
    return this.messages.get(userId) || [];
  }
  
  async createMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.messageId++;
    const userMessages = this.messages.get(message.userId) || [];
    
    const newMessage: ChatMessage = {
      id,
      ...message,
      timestamp: new Date()
    };
    
    userMessages.push(newMessage);
    this.messages.set(message.userId, userMessages);
    return newMessage;
  }
  
  // Health data methods
  async getHealthData(userId: number, timeRange: string): Promise<HealthData[]> {
    const allData = this.healthData.get(userId) || [];
    
    // Filter based on time range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7days":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30days":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90days":
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    return allData.filter(data => data.timestamp >= startDate);
  }
  
  async createHealthData(data: InsertHealthData): Promise<HealthData> {
    const id = this.healthDataId++;
    const userHealthData = this.healthData.get(data.userId) || [];
    
    const newHealthData: HealthData = {
      id,
      ...data,
      timestamp: new Date()
    };
    
    userHealthData.push(newHealthData);
    this.healthData.set(data.userId, userHealthData);
    return newHealthData;
  }
  
  // Device methods
  async getDevices(userId: number): Promise<ConnectedDevice[]> {
    return Array.from(this.devices.values()).filter(device => device.userId === userId);
  }
  
  async getDevice(id: number): Promise<ConnectedDevice | undefined> {
    return this.devices.get(id);
  }
  
  async createDevice(device: InsertConnectedDevice): Promise<ConnectedDevice> {
    const id = this.deviceId++;
    
    const newDevice: ConnectedDevice = {
      id,
      ...device
    };
    
    this.devices.set(id, newDevice);
    return newDevice;
  }
  
  async updateDevice(id: number, settings: any): Promise<ConnectedDevice> {
    const device = await this.getDevice(id);
    if (!device) {
      throw new Error(`Device with id ${id} not found`);
    }
    
    const updatedDevice: ConnectedDevice = {
      ...device,
      metadata: {
        ...device.metadata,
        ...settings
      },
      lastSync: new Date()
    };
    
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async removeDevice(id: number): Promise<void> {
    if (!this.devices.has(id)) {
      throw new Error(`Device with id ${id} not found`);
    }
    
    this.devices.delete(id);
  }
}

// Database implementation

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserSettings(id: number, settings: any): Promise<User> {
    const [currentUser] = await db.select().from(users).where(eq(users.id, id));
    if (!currentUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedPreferences = {
      ...currentUser.preferences,
      ...settings
    };
    
    const [updatedUser] = await db
      .update(users)
      .set({ preferences: updatedPreferences })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  // Message methods
  async getMessages(userId: number): Promise<ChatMessage[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.timestamp);
    
    return messages;
  }
  
  async createMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values({
        ...message,
        timestamp: new Date()
      })
      .returning();
    
    return newMessage;
  }
  
  // Health data methods
  async getHealthData(userId: number, timeRange: string): Promise<HealthData[]> {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "7days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90days":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }
    
    const data = await db
      .select()
      .from(healthData)
      .where(
        and(
          eq(healthData.userId, userId),
          gte(healthData.timestamp, startDate)
        )
      )
      .orderBy(desc(healthData.timestamp));
    
    return data;
  }
  
  async createHealthData(data: InsertHealthData): Promise<HealthData> {
    const [newData] = await db
      .insert(healthData)
      .values({
        ...data,
        timestamp: new Date()
      })
      .returning();
    
    return newData;
  }
  
  // Device methods
  async getDevices(userId: number): Promise<ConnectedDevice[]> {
    const devices = await db
      .select()
      .from(connectedDevices)
      .where(eq(connectedDevices.userId, userId));
    
    return devices;
  }
  
  async getDevice(id: number): Promise<ConnectedDevice | undefined> {
    const [device] = await db
      .select()
      .from(connectedDevices)
      .where(eq(connectedDevices.id, id));
    
    return device;
  }
  
  async createDevice(device: InsertConnectedDevice): Promise<ConnectedDevice> {
    const [newDevice] = await db
      .insert(connectedDevices)
      .values(device)
      .returning();
    
    return newDevice;
  }
  
  async updateDevice(id: number, settings: any): Promise<ConnectedDevice> {
    const [currentDevice] = await db
      .select()
      .from(connectedDevices)
      .where(eq(connectedDevices.id, id));
    
    if (!currentDevice) {
      throw new Error(`Device with id ${id} not found`);
    }
    
    // If metadata is being updated, merge it with existing metadata
    let updatedSettings = { ...settings };
    if (settings.metadata) {
      updatedSettings.metadata = {
        ...currentDevice.metadata,
        ...settings.metadata
      };
    }
    
    updatedSettings.lastSync = new Date();
    
    const [updatedDevice] = await db
      .update(connectedDevices)
      .set(updatedSettings)
      .where(eq(connectedDevices.id, id))
      .returning();
    
    return updatedDevice;
  }
  
  async removeDevice(id: number): Promise<void> {
    await db
      .delete(connectedDevices)
      .where(eq(connectedDevices.id, id));
  }
  
  // Initialize sample data (only if database is empty)
  async initializeSampleData(): Promise<void> {
    // Check if any users exist
    const userCount = await db.select().from(users).limit(1);
    
    // If no users, populate with sample data
    if (userCount.length === 0) {
      console.log("Initializing database with sample data...");
      
      // Create a default user
      const [defaultUser] = await db.insert(users).values({
        username: "janesmith",
        password: "password", // In a real app, this would be hashed
        name: "Jane Smith",
        email: "jane.smith@example.com",
        preferences: {
          primaryGoal: "weight-loss",
          coachStyle: "motivational",
          reminderFrequency: "daily",
          focusAreas: ["nutrition", "exercise", "sleep"],
          darkMode: false,
          pushNotifications: true,
          emailSummaries: true,
          dataSharing: false,
          aiProvider: "google",
          aiModel: "gemini-2.0-flash-exp"
        },
        createdAt: new Date()
      }).returning();
      
      // Sample messages
      await db.insert(chatMessages).values([
        {
          userId: defaultUser.id,
          content: "Hello Sarah! 👋 Welcome back to your Weight Loss coaching session. How are you feeling today?",
          isUserMessage: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes ago
        },
        {
          userId: defaultUser.id,
          content: "I'm feeling pretty good! I managed to go for a run yesterday, but I'm a bit sore today.",
          isUserMessage: true,
          timestamp: new Date(Date.now() - 1000 * 60 * 9) // 9 minutes ago
        },
        {
          userId: defaultUser.id,
          content: "Great job on the run, Sarah! 🏃‍♀️ Post-exercise soreness is completely normal, especially when you're getting back into your routine.\n\nI see from your connected fitness tracker that you completed a 25-minute run at a good pace. That's excellent progress!\n\nWould you like me to suggest some gentle recovery stretches for today? Or would you prefer to focus on nutrition planning to complement your workout?",
          isUserMessage: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 8) // 8 minutes ago
        },
        {
          userId: defaultUser.id,
          content: "I'd love some stretching suggestions, please!",
          isUserMessage: true,
          timestamp: new Date(Date.now() - 1000 * 60 * 7) // 7 minutes ago
        },
        {
          userId: defaultUser.id,
          content: "Here are some gentle recovery stretches that will help with your soreness:\n\n- Standing quad stretch: 30 seconds each leg\n- Seated hamstring stretch: a30 seconds each leg\n- Calf stretch against wall: 30 seconds each leg\n- Child's pose: Hold for 1 minute\n- Gentle torso twists: 10 each side\n\nRemember to breathe deeply and never stretch to the point of pain. Would you like me to send a reminder to do these stretches later today?",
          isUserMessage: false,
          timestamp: new Date(Date.now() - 1000 * 60 * 6) // 6 minutes ago
        }
      ]);
      
      // Connected devices
      await db.insert(connectedDevices).values([
        {
          userId: defaultUser.id,
          deviceName: "FitTrack Smartwatch",
          deviceType: "smartwatch",
          lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          isActive: true,
          metadata: {
            features: ["Step tracking", "Heart rate", "Sleep tracking", "Exercise detection"]
          }
        },
        {
          userId: defaultUser.id,
          deviceName: "HealthScale Pro",
          deviceType: "scale",
          lastSync: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          isActive: true,
          metadata: {
            features: ["Weight", "Body fat", "Muscle mass", "BMI"]
          }
        }
      ]);
      
      // Sample health data
      const today = new Date();
      const healthDataEntries = [];
      
      // Steps data for past 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        healthDataEntries.push({
          userId: defaultUser.id,
          dataType: "steps",
          value: (6000 + Math.floor(Math.random() * 5000)).toString(),
          unit: "steps",
          timestamp: date,
          source: "smartwatch"
        });
        
        healthDataEntries.push({
          userId: defaultUser.id,
          dataType: "sleep",
          value: (6 + Math.random() * 2).toFixed(1),
          unit: "hours",
          timestamp: date,
          source: "smartwatch"
        });
        
        healthDataEntries.push({
          userId: defaultUser.id,
          dataType: "heartRate",
          value: (65 + Math.floor(Math.random() * 15)).toString(),
          unit: "bpm",
          timestamp: date,
          source: "smartwatch"
        });
      }
      
      // Weight data for the most recent day
      healthDataEntries.push({
        userId: defaultUser.id,
        dataType: "weight",
        value: "165",
        unit: "lbs",
        timestamp: new Date(today.setDate(today.getDate() - 1)),
        source: "scale"
      });
      
      // Insert health data in chunks to avoid parameter limits
      const chunkSize = 10;
      for (let i = 0; i < healthDataEntries.length; i += chunkSize) {
        const chunk = healthDataEntries.slice(i, i + chunkSize);
        await db.insert(healthData).values(chunk);
      }
      
      console.log("Sample data initialized successfully!");
    }
  }
}

// Initialize in-memory storage (fallback for when database is not available)
export const storage = new MemStorage();
