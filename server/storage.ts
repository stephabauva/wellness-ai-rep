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
  sampleHealthData,
  type SampleHealthData,
  type InsertSampleHealthData,
  connectedDevices,
  type ConnectedDevice,
  type InsertConnectedDevice,
  coachingModes,
  type AtomicFact,
  type MemoryRelationship,
  type MemoryConsolidationLog,
  type MemoryGraphMetrics,
  type EnhancedSettingsUpdate,
  type UserPreferences,
  userPreferenceSchema,
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
  updateUserSettings(id: number, settings: EnhancedSettingsUpdate): Promise<User>;
  
  // Message methods
  getMessages(userId: number): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Health data methods
  getHealthData(userId: number, timeRange: string): Promise<HealthData[]>;
  getHealthDataNoCache(userId: number, timeRange: string): Promise<HealthData[]>;
  createHealthData(data: InsertHealthData): Promise<HealthData>;
  createHealthDataBatch(data: InsertHealthData[]): Promise<HealthData[]>;
  clearAllHealthData(userId: number): Promise<void>;
  deleteHealthDataByType(userId: number, dataType: string): Promise<{ deletedCount: number }>;
  
  // Sample health data methods
  loadSampleHealthData(userId: number): Promise<{ recordsLoaded: number }>;
  
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
      memoryDetectionProvider: "google",
      memoryDetectionModel: "gemini-2.0-flash-lite",
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
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name ?? null,
      email: insertUser.email ?? null,
      preferences: insertUser.preferences ?? {},
      transcriptionProvider: insertUser.transcriptionProvider ?? null,
      preferredLanguage: insertUser.preferredLanguage ?? null,
      automaticModelSelection: insertUser.automaticModelSelection ?? null,
      aiProvider: insertUser.aiProvider ?? null,
      aiModel: insertUser.aiModel ?? null,
      memoryDetectionProvider: insertUser.memoryDetectionProvider ?? null,
      memoryDetectionModel: insertUser.memoryDetectionModel ?? null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserSettings(id: number, settings: EnhancedSettingsUpdate): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    // Directly parse 'settings' to extract and validate preference fields
    // .partial() allows only a subset of preference fields to be present
    // Zod will strip any fields from 'settings' not in 'userPreferenceSchema' (its default behavior)
    const validatedPreferenceUpdates = userPreferenceSchema.partial().parse(settings);
    
    const updatedUser: User = {
        ...user,
        // Update top-level User fields from settings if they exist
        name: settings.name !== undefined ? settings.name : user.name,
        email: settings.email !== undefined ? settings.email : user.email,
        aiProvider: settings.aiProvider !== undefined ? settings.aiProvider : user.aiProvider,
        aiModel: settings.aiModel !== undefined ? settings.aiModel : user.aiModel,
        automaticModelSelection: settings.automaticModelSelection !== undefined ? settings.automaticModelSelection : user.automaticModelSelection,
        transcriptionProvider: settings.transcriptionProvider !== undefined ? settings.transcriptionProvider : user.transcriptionProvider,
        preferredLanguage: settings.preferredLanguage !== undefined ? settings.preferredLanguage : user.preferredLanguage,
        memoryDetectionProvider: settings.memoryDetectionProvider !== undefined ? settings.memoryDetectionProvider : user.memoryDetectionProvider,
        memoryDetectionModel: settings.memoryDetectionModel !== undefined ? settings.memoryDetectionModel : user.memoryDetectionModel,

        preferences: {
            ...user.preferences, // user.preferences is now UserPreferences (non-nullable)
            ...validatedPreferenceUpdates, // Spread the Zod-validated preference fields
        },
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
      case "1day":
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Set time to start of day to include full day range
    startDate.setHours(0, 0, 0, 0);
    
    console.log(`[MemStorage] Filtering health data for user ${userId}, range: ${timeRange}, startDate: ${startDate.toISOString()}`);
    const filteredData = allData.filter(data => data.timestamp != null && data.timestamp >= startDate);
    console.log(`[MemStorage] Found ${filteredData.length} of ${allData.length} total records for range ${timeRange}`);
    
    return filteredData;
  }

  // Method to get health data without cache (same as getHealthData for MemStorage)
  async getHealthDataNoCache(userId: number, timeRange: string): Promise<HealthData[]> {
    // MemStorage doesn't use cache, so this is the same as getHealthData
    return this.getHealthData(userId, timeRange);
  }
  
  async createHealthData(data: InsertHealthData): Promise<HealthData> {
    const id = this.healthDataId++;
    const userHealthData = this.healthData.get(data.userId) || [];
    
    const newHealthData: HealthData = {
      id,
      ...data,
      unit: data.unit ?? null,
      source: data.source ?? null,
      category: data.category ?? null,
      metadata: data.metadata ?? null, // Coalesce undefined to null
      timestamp: data.timestamp || new Date()
    };
    
    userHealthData.push(newHealthData);
    this.healthData.set(data.userId, userHealthData);
    return newHealthData;
  }

  async createHealthDataBatch(dataArray: InsertHealthData[]): Promise<HealthData[]> {
    const results: HealthData[] = [];
    
    for (const data of dataArray) {
      const id = this.healthDataId++;
      const userHealthData = this.healthData.get(data.userId) || [];
      
      const newHealthData: HealthData = {
        id,
        ...data,
        unit: data.unit ?? null,
        source: data.source ?? null,
        category: data.category ?? null,
        metadata: data.metadata ?? null, // Coalesce undefined to null
        timestamp: data.timestamp || new Date()
      };
      
      userHealthData.push(newHealthData);
      this.healthData.set(data.userId, userHealthData);
      results.push(newHealthData);
    }
    
    return results;
  }

  async clearAllHealthData(userId: number): Promise<void> {
    this.healthData.delete(userId);
  }

  async deleteHealthDataByType(userId: number, dataType: string): Promise<{ deletedCount: number }> {
    const userHealthData = this.healthData.get(userId) || [];
    const beforeCount = userHealthData.length;
    
    // Filter out records matching the dataType
    const filteredData = userHealthData.filter(item => item.dataType !== dataType);
    const deletedCount = beforeCount - filteredData.length;
    
    // Update the stored data
    this.healthData.set(userId, filteredData);
    
    return { deletedCount };
  }

  async loadSampleHealthData(userId: number): Promise<{ recordsLoaded: number }> {
    // Memory storage doesn't support sample data loading - this is for demo/testing only
    // Sample data should only be loaded when using database storage
    throw new Error("Sample data loading is only available with database storage. This feature is for demo/testing purposes only.");
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
      ...device,
      lastSync: device.lastSync ?? null,
      isActive: device.isActive ?? true, // Align with DB default(true)
      metadata: device.metadata ?? null,
      createdAt: new Date()
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
        ...((device.metadata && typeof device.metadata === 'object') ? device.metadata : {}),
        ...((settings && typeof settings === 'object') ? settings : {})
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
    const dataToInsert: InsertUser = { ...insertUser };

    if (dataToInsert.preferences) {
        try {
            // Validate/coerce if preferences are provided.
            // Ensures that what we pass to Drizzle is strictly UserPreferences.
            dataToInsert.preferences = userPreferenceSchema.parse(dataToInsert.preferences);
        } catch (e) {
            console.error("Invalid preferences format during user creation, using default. Error:", e);
            dataToInsert.preferences = {}; // Default to empty object on parse error
        }
    } else {
        // If preferences are not provided at all, assign an empty object
        // because the column is NOT NULL and has a DB default of {}.
        dataToInsert.preferences = {};
    }

    const [user] = await db.insert(users).values(dataToInsert).returning();
    return user;
  }
  
  async updateUserSettings(id: number, settings: EnhancedSettingsUpdate): Promise<User> {
    const [currentUser] = await db.select().from(users).where(eq(users.id, id));
    if (!currentUser) {
      throw new Error(`User with id ${id} not found`);
    }

    // Separate preferences from top-level user fields
    const {
      name, email, aiProvider, aiModel, automaticModelSelection,
      transcriptionProvider, preferredLanguage, memoryDetectionProvider, memoryDetectionModel,
      // health_consent is handled by its own service, not directly set here
      // retention days are also part of preferences or separate settings
      primaryGoal, coachStyle, reminderFrequency, focusAreas, darkMode,
      pushNotifications, emailSummaries, dataSharing, healthVisibilitySettings,
      highValueRetentionDays, mediumValueRetentionDays, lowValueRetentionDays,
      ...otherPossibleSettings // Should be empty if schema is matched
    } = settings;

    const preferencesToUpdate: Partial<UserPreferences> = {};
    if (primaryGoal !== undefined) preferencesToUpdate.primaryGoal = primaryGoal;
    if (coachStyle !== undefined) preferencesToUpdate.coachStyle = coachStyle;
    if (reminderFrequency !== undefined) preferencesToUpdate.reminderFrequency = reminderFrequency;
    if (focusAreas !== undefined) preferencesToUpdate.focusAreas = focusAreas;
    if (darkMode !== undefined) preferencesToUpdate.darkMode = darkMode;
    if (pushNotifications !== undefined) preferencesToUpdate.pushNotifications = pushNotifications;
    if (emailSummaries !== undefined) preferencesToUpdate.emailSummaries = emailSummaries;
    if (dataSharing !== undefined) preferencesToUpdate.dataSharing = dataSharing;
    if (healthVisibilitySettings !== undefined) preferencesToUpdate.healthVisibilitySettings = healthVisibilitySettings;
    if (highValueRetentionDays !== undefined) preferencesToUpdate.highValueRetentionDays = highValueRetentionDays;
    if (mediumValueRetentionDays !== undefined) preferencesToUpdate.mediumValueRetentionDays = mediumValueRetentionDays;
    if (lowValueRetentionDays !== undefined) preferencesToUpdate.lowValueRetentionDays = lowValueRetentionDays;

    const userFieldsToUpdate: Partial<User> = {};
    if (name !== undefined) userFieldsToUpdate.name = name;
    if (email !== undefined) userFieldsToUpdate.email = email;
    if (aiProvider !== undefined) userFieldsToUpdate.aiProvider = aiProvider;
    if (aiModel !== undefined) userFieldsToUpdate.aiModel = aiModel;
    if (automaticModelSelection !== undefined) userFieldsToUpdate.automaticModelSelection = automaticModelSelection;
    if (transcriptionProvider !== undefined) userFieldsToUpdate.transcriptionProvider = transcriptionProvider;
    if (preferredLanguage !== undefined) userFieldsToUpdate.preferredLanguage = preferredLanguage;
    if (memoryDetectionProvider !== undefined) userFieldsToUpdate.memoryDetectionProvider = memoryDetectionProvider;
    if (memoryDetectionModel !== undefined) userFieldsToUpdate.memoryDetectionModel = memoryDetectionModel;

    const finalPreferences = {
      ...currentUser.preferences, // currentUser.preferences is now non-nullable
      ...preferencesToUpdate,
    };

    const [updatedUser] = await db
      .update(users)
      .set({
        ...userFieldsToUpdate,
        preferences: finalPreferences
      })
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
    // Check cache first (skip cache if timestamp parameter is present)
    const cached = await cacheService.getHealthData(userId, timeRange);
    if (cached) {
      console.log(`[DatabaseStorage] Returning cached health data for user ${userId}, range: ${timeRange}, count: ${cached.length}`);
      return cached;
    }

    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "1day":
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Set time to start of day to include full day range
    startDate.setHours(0, 0, 0, 0);
    
    console.log(`[DatabaseStorage] Fetching health data for user ${userId}, range: ${timeRange}, startDate: ${startDate.toISOString()}`);
    
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
    
    console.log(`[DatabaseStorage] Found ${data.length} health records for range ${timeRange}`);
    
    // Cache the results for future requests
    cacheService.setHealthData(userId, timeRange, data);
    
    return data;
  }
  
  // Method to get health data without cache (for debugging)
  async getHealthDataNoCache(userId: number, timeRange: string): Promise<HealthData[]> {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "1day":
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Set time to start of day to include full day range
    startDate.setHours(0, 0, 0, 0);
    
    console.log(`[DatabaseStorage] Fetching health data WITHOUT CACHE for user ${userId}, range: ${timeRange}, startDate: ${startDate.toISOString()}`);
    
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
    
    console.log(`[DatabaseStorage] Found ${data.length} health records for range ${timeRange} (no cache)`);
    return data;
  }

  async createHealthData(data: InsertHealthData): Promise<HealthData> {
    const [newData] = await db
      .insert(healthData)
      .values({
        ...data,
        timestamp: data.timestamp || new Date()
      })
      .returning();
    
    // Invalidate health data cache for this user
    cacheService.invalidateUserData(data.userId);
    
    return newData;
  }

  async createHealthDataBatch(dataArray: InsertHealthData[]): Promise<HealthData[]> {
    const BATCH_SIZE = 1000; // Process in chunks to avoid memory issues
    const results: HealthData[] = [];
    
    for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
      const batch = dataArray.slice(i, i + BATCH_SIZE);
      
      const batchResults = await db
        .insert(healthData)
        .values(
          batch.map(data => ({
            ...data,
            timestamp: data.timestamp || new Date()
          }))
        )
        .returning();
      
      results.push(...batchResults);
      
      // Log progress for large imports
      if (dataArray.length > 1000) {
        console.log(`Batch insert progress: ${Math.min(i + BATCH_SIZE, dataArray.length)}/${dataArray.length} records`);
      }
    }
    
    // Invalidate health data cache for all affected users
    const userIds = Array.from(new Set(dataArray.map(d => d.userId)));
    userIds.forEach(userId => cacheService.invalidateUserData(userId));
    
    return results;
  }

  async clearAllHealthData(userId: number): Promise<void> {
    await db
      .delete(healthData)
      .where(eq(healthData.userId, userId));
    
    // Invalidate health data cache for this user
    cacheService.invalidateUserData(userId);
  }

  async deleteHealthDataByType(userId: number, dataType: string): Promise<{ deletedCount: number }> {
    const result = await db
      .delete(healthData)
      .where(
        and(
          eq(healthData.userId, userId),
          eq(healthData.dataType, dataType)
        )
      );
    
    // Invalidate health data cache for this user
    cacheService.invalidateUserData(userId);
    
    return { deletedCount: result.rowCount || 0 };
  }

  async loadSampleHealthData(userId: number): Promise<{ recordsLoaded: number }> {
    // Clear existing health data for the user
    await this.clearAllHealthData(userId);
    
    // Get all sample data from the sample table
    const sampleData = await db.select().from(sampleHealthData);
    
    // Convert sample data to health data format with userId
    const insertData = sampleData.map((sample: any) => ({
      userId,
      dataType: sample.dataType,
      value: sample.value,
      unit: sample.unit,
      timestamp: sample.timestamp,
      source: sample.source,
      category: sample.category,
      metadata: sample.metadata
    }));
    
    // Insert the data in batches
    const createdData = await this.createHealthDataBatch(insertData);
    
    return { recordsLoaded: createdData.length };
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
        ...((currentDevice.metadata && typeof currentDevice.metadata === 'object') ? currentDevice.metadata : {}),
        ...((settings.metadata && typeof settings.metadata === 'object') ? settings.metadata : {})
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
  

}

// Initialize in-memory storage (fallback for when database is not available)
export const storage = new DatabaseStorage();
