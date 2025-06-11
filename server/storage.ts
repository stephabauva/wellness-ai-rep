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
import { cacheService } from "./services/cache-service";

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
        dataSharing: false
      },
      transcriptionProvider: "webspeech",
      preferredLanguage: "en",
      automaticModelSelection: true,
      aiProvider: "google",
      aiModel: "gemini-2.0-flash-exp",
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
    
    // Create comprehensive health data
    const today = new Date();
    const healthDataEntries: HealthData[] = [];
    
    // Body Composition Data (from smart scale)
    const bodyCompositionData = [
      { dataType: "weight", value: "165", unit: "lbs", category: "body_composition" },
      { dataType: "bmi", value: "22.8", unit: "kg/m²", category: "body_composition" },
      { dataType: "body_fat_percentage", value: "18.5", unit: "%", category: "body_composition" },
      { dataType: "subcutaneous_fat", value: "12.3", unit: "%", category: "body_composition" },
      { dataType: "visceral_fat", value: "6", unit: "level", category: "body_composition" },
      { dataType: "body_water_percentage", value: "58.2", unit: "%", category: "body_composition" },
      { dataType: "muscle_mass", value: "134.2", unit: "lbs", category: "body_composition" },
      { dataType: "bone_mass", value: "6.8", unit: "lbs", category: "body_composition" },
      { dataType: "bmr", value: "1580", unit: "kcal", category: "body_composition" },
      { dataType: "metabolic_age", value: "28", unit: "years", category: "body_composition" }
    ];

    // Cardiovascular Data (from various devices)
    const cardiovascularData = [
      { dataType: "blood_pressure_systolic", value: "118", unit: "mmHg", category: "cardiovascular" },
      { dataType: "blood_pressure_diastolic", value: "75", unit: "mmHg", category: "cardiovascular" },
      { dataType: "heart_rate", value: "72", unit: "bpm", category: "cardiovascular" },
      { dataType: "resting_heart_rate", value: "58", unit: "bpm", category: "cardiovascular" },
      { dataType: "hrv", value: "42", unit: "ms", category: "cardiovascular" },
      { dataType: "cholesterol_total", value: "185", unit: "mg/dL", category: "cardiovascular" },
      { dataType: "cholesterol_ldl", value: "110", unit: "mg/dL", category: "cardiovascular" },
      { dataType: "cholesterol_hdl", value: "55", unit: "mg/dL", category: "cardiovascular" },
      { dataType: "cholesterol_triglycerides", value: "100", unit: "mg/dL", category: "cardiovascular" },
      { dataType: "oxygen_saturation", value: "98", unit: "%", category: "cardiovascular" }
    ];

    // Medical Data (from lab tests and glucose monitors)
    const medicalData = [
      { dataType: "blood_glucose_fasting", value: "92", unit: "mg/dL", category: "medical" },
      { dataType: "blood_glucose_postprandial", value: "135", unit: "mg/dL", category: "medical" },
      { dataType: "hba1c", value: "5.2", unit: "%", category: "medical" },
      { dataType: "body_temperature", value: "98.6", unit: "°F", category: "medical" },
      { dataType: "ketone_levels", value: "0.3", unit: "mmol/L", category: "medical" }
    ];

    // Advanced Metrics (from fitness trackers and lab analysis)
    const advancedData = [
      { dataType: "vo2_max", value: "48", unit: "mL/kg/min", category: "advanced" },
      { dataType: "lactate_threshold", value: "152", unit: "bpm", category: "advanced" },
      { dataType: "skin_temperature", value: "89.2", unit: "°F", category: "advanced" }
    ];

    // Add static data (most recent values)
    [...bodyCompositionData, ...cardiovascularData, ...medicalData, ...advancedData].forEach(data => {
      healthDataEntries.push({
        id: this.healthDataId++,
        userId: 1,
        dataType: data.dataType,
        value: data.value,
        unit: data.unit,
        timestamp: new Date(today.getTime() - Math.random() * 24 * 60 * 60 * 1000), // Within last 24 hours
        source: data.category === "body_composition" ? "smart_scale" : 
                data.category === "cardiovascular" ? "smartwatch" :
                data.category === "medical" ? "lab_test" : "fitness_tracker",
        category: data.category,
        metadata: null
      });
    });
    
    // Time series data for trending (last 7 days)
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Lifestyle metrics with daily variation
      const lifestyleMetrics = [
        { 
          dataType: "steps", 
          value: (6000 + Math.floor(Math.random() * 5000)).toString(), 
          unit: "steps",
          source: "smartwatch" 
        },
        { 
          dataType: "sleep_duration", 
          value: (6 + Math.random() * 2).toFixed(1), 
          unit: "hours",
          source: "smartwatch" 
        },
        { 
          dataType: "sleep_deep", 
          value: (1.5 + Math.random() * 0.8).toFixed(1), 
          unit: "hours",
          source: "smartwatch" 
        },
        { 
          dataType: "sleep_light", 
          value: (3.5 + Math.random() * 1.2).toFixed(1), 
          unit: "hours",
          source: "smartwatch" 
        },
        { 
          dataType: "sleep_rem", 
          value: (1.0 + Math.random() * 0.8).toFixed(1), 
          unit: "hours",
          source: "smartwatch" 
        },
        { 
          dataType: "calories_burned", 
          value: (1800 + Math.floor(Math.random() * 600)).toString(), 
          unit: "kcal",
          source: "smartwatch" 
        },
        { 
          dataType: "calories_intake", 
          value: (1600 + Math.floor(Math.random() * 800)).toString(), 
          unit: "kcal",
          source: "nutrition_app" 
        },
        { 
          dataType: "hydration", 
          value: (1.2 + Math.random() * 1.0).toFixed(1), 
          unit: "L",
          source: "manual" 
        },
        { 
          dataType: "stress_level", 
          value: Math.floor(1 + Math.random() * 9).toString(), 
          unit: "1-10",
          source: "manual" 
        },
        { 
          dataType: "mood", 
          value: Math.floor(3 + Math.random() * 3).toString(), 
          unit: "1-5",
          source: "manual" 
        }
      ];

      lifestyleMetrics.forEach(metric => {
        healthDataEntries.push({
          id: this.healthDataId++,
          userId: 1,
          dataType: metric.dataType,
          value: metric.value,
          unit: metric.unit,
          timestamp: date,
          source: metric.source,
          category: "lifestyle",
          metadata: null
        });
      });
      
      // Some cardiovascular data that varies daily
      healthDataEntries.push({
        id: this.healthDataId++,
        userId: 1,
        dataType: "heart_rate",
        value: (65 + Math.floor(Math.random() * 15)).toString(),
        unit: "bpm",
        timestamp: date,
        source: "smartwatch",
        category: "cardiovascular",
        metadata: null
      });
    }
    
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
      },
      createdAt: new Date()
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
      },
      createdAt: new Date()
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
    
    // Extract AI configuration and other top-level fields
    const { aiProvider, aiModel, automaticModelSelection, transcriptionProvider, preferredLanguage, name, email, ...preferenceSettings } = settings;
    
    const updatedUser: User = {
      ...user,
      // Update top-level user fields
      ...(aiProvider && { aiProvider }),
      ...(aiModel && { aiModel }),
      ...(automaticModelSelection !== undefined && { automaticModelSelection }),
      ...(transcriptionProvider && { transcriptionProvider }),
      ...(preferredLanguage && { preferredLanguage }),
      ...(name && { name }),
      ...(email && { email }),
      // Update preferences for other settings
      preferences: {
        ...user.preferences,
        ...preferenceSettings
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
  
  // Health data methods with caching
  async getHealthData(userId: number, timeRange: string): Promise<HealthData[]> {
    // Check cache first
    const cached = await cacheService.getHealthData(userId, timeRange);
    if (cached) {
      return cached;
    }

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
    
    // Cache the results for future requests
    cacheService.setHealthData(userId, timeRange, data);
    
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
    
    // Invalidate health data cache for this user
    cacheService.invalidateUserData(data.userId);
    
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
    // Check cache first
    const cached = await cacheService.getDeviceSettings(id);
    if (cached) {
      return cached;
    }

    const [device] = await db
      .select()
      .from(connectedDevices)
      .where(eq(connectedDevices.id, id));
    
    // Cache the device settings
    if (device) {
      cacheService.setDeviceSettings(id, device);
    }
    
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

    // Invalidate device cache before update
    cacheService.invalidateDeviceData(id);
    
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
          dataSharing: false
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
export const storage = new DatabaseStorage();
