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
import { cacheService } from "../services/cache-service";
import { nutritionAggregationService, type DailyNutritionSummary, type NutritionUpdateRequest, type NutritionMealSummary } from "../../server/services/nutrition-aggregation-service.js";
import { createDefaultUser, createWelcomeMessage, createComprehensiveHealthData, createConnectedDevices } from "./mock-data";
import { createNutritionEntries, createNutritionHealthData, type NutritionData } from "./nutrition-utils";
import { calculateStartDate } from "./time-range-utils";
import { NutritionDelegationMixin } from "./nutrition-delegation";
import { processUserSettingsSimple, processUserSettingsDetailed, applyUserSettingsToUser } from "./user-settings-utils";
import { prepareDeviceUpdateSettings, createUpdatedDevice } from "./device-utils";

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
  createNutritionDataFromInference(
    userId: number,
    nutritionData: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      metadata: any;
    },
    conversationId?: string
  ): Promise<HealthData[]>;
  clearAllHealthData(userId: number): Promise<void>;
  deleteHealthDataByType(userId: number, dataType: string): Promise<{ deletedCount: number }>;
  
  // Nutrition aggregation methods
  getDailyNutritionSummary(userId: number, date: Date): Promise<import('../../server/services/nutrition-aggregation-service').DailyNutritionSummary>;
  getNutritionSummariesByRange(userId: number, startDate: Date, endDate: Date): Promise<import('../../server/services/nutrition-aggregation-service').DailyNutritionSummary[]>;
  updateNutritionEntry(request: import('../../server/services/nutrition-aggregation-service').NutritionUpdateRequest): Promise<void>;
  getMealNutritionBreakdown(userId: number, date: Date): Promise<{ [mealType: string]: import('../../server/services/nutrition-aggregation-service').NutritionMealSummary }>;
  getWeeklyNutritionAverages(userId: number, startDate: Date): Promise<{
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
    averageFiber: number;
    averageSugar: number;
    averageSodium: number;
    daysWithData: number;
  }>;
  
  // Sample health data methods
  loadSampleHealthData(userId: number): Promise<{ recordsLoaded: number }>;
  
  // Device methods
  getDevices(userId: number): Promise<ConnectedDevice[]>;
  getDevice(id: number): Promise<ConnectedDevice | undefined>;
  createDevice(device: InsertConnectedDevice): Promise<ConnectedDevice>;
  updateDevice(id: number, settings: any): Promise<ConnectedDevice>;
  removeDevice(id: number): Promise<void>;
}

export class MemStorage extends NutritionDelegationMixin implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, ChatMessage[]>;
  private healthData: Map<number, HealthData[]>;
  private devices: Map<number, ConnectedDevice>;
  private userId: number;
  private messageId: number;
  private healthDataId: number;
  private deviceId: number;

  constructor() {
    super();
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
    const defaultUser = createDefaultUser();
    this.users.set(1, defaultUser);
    
    // Create welcome message
    const welcomeMessage = createWelcomeMessage(this.messageId++);
    this.messages.set(1, [welcomeMessage]);
    
    // Create comprehensive health data
    const healthDataEntries = createComprehensiveHealthData({ current: this.healthDataId });
    this.healthDataId = this.healthDataId + healthDataEntries.length;
    this.healthData.set(1, healthDataEntries);
    
    // Create connected devices
    const devices = createConnectedDevices({ current: this.deviceId });
    devices.forEach(device => {
      this.devices.set(device.id, device);
    });
    this.deviceId = this.deviceId + devices.length;
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
    
    // Use simple processing approach for memory storage
    const processed = processUserSettingsSimple(settings);
    const updatedUser = applyUserSettingsToUser(user, processed);
    
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
    const startDate = calculateStartDate(timeRange);
    
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

  async createNutritionDataFromInference(
    userId: number,
    nutritionData: NutritionData,
    conversationId?: string
  ): Promise<HealthData[]> {
    const nutritionEntries = createNutritionHealthData(
      userId,
      nutritionData,
      conversationId,
      () => this.healthDataId++
    );

    if (nutritionEntries.length === 0) {
      console.log('[MemStorage] No nutrition data to store');
      return [];
    }

    const userHealthData = this.healthData.get(userId) || [];
    userHealthData.push(...nutritionEntries);
    this.healthData.set(userId, userHealthData);

    console.log(`[MemStorage] Stored ${nutritionEntries.length} nutrition data entries for user ${userId}`);
    
    // Invalidate nutrition aggregation cache for the specific date
    const timestamp = new Date(nutritionData.metadata.timestamp);
    await nutritionAggregationService.invalidateCache(userId, timestamp);
    
    return nutritionEntries;
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
    
    const updatedDevice = createUpdatedDevice(device, settings);
    
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
  
  async removeDevice(id: number): Promise<void> {
    if (!this.devices.has(id)) {
      throw new Error(`Device with id ${id} not found`);
    }
    
    this.devices.delete(id);
  }

  // Nutrition aggregation methods inherited from NutritionDelegationMixin
}

// Database implementation

export class DatabaseStorage extends NutritionDelegationMixin implements IStorage {
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

    // Use detailed processing approach for database storage
    const processed = processUserSettingsDetailed(settings);
    
    const finalPreferences = {
      ...currentUser.preferences,
      ...processed.preferences,
    };

    const [updatedUser] = await db
      .update(users)
      .set({
        ...processed.userFields,
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

    const startDate = calculateStartDate(timeRange);
    
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
    const startDate = calculateStartDate(timeRange);
    
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

  async createNutritionDataFromInference(
    userId: number,
    nutritionData: NutritionData,
    conversationId?: string
  ): Promise<HealthData[]> {
    const nutritionEntries = createNutritionEntries(userId, nutritionData, conversationId);

    if (nutritionEntries.length === 0) {
      console.log('[DatabaseStorage] No nutrition data to store');
      return [];
    }

    console.log(`[DatabaseStorage] Storing ${nutritionEntries.length} nutrition data entries for user ${userId}`);
    const results = await this.createHealthDataBatch(nutritionEntries);
    
    // Invalidate nutrition aggregation cache for the specific date
    const timestamp = new Date(nutritionData.metadata.timestamp);
    await nutritionAggregationService.invalidateCache(userId, timestamp);
    
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
    
    // Use utility to prepare update settings with merged metadata and updated sync time
    const updatedSettings = prepareDeviceUpdateSettings(currentDevice, settings);
    
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

  // Nutrition aggregation methods inherited from NutritionDelegationMixin

}

// Initialize in-memory storage (fallback for when database is not available)
export const storage = new DatabaseStorage();
