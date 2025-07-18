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
  connectedDevices,
  type ConnectedDevice,
  type InsertConnectedDevice,
  type EnhancedSettingsUpdate,
  userPreferenceSchema,
} from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { db } from "./db";
import { cacheService } from "../services/cache-service";
import { nutritionAggregationService } from "../../server/services/nutrition-aggregation-service.js";
import { createNutritionEntries, type NutritionData } from "./nutrition-utils";
import { calculateStartDate } from "./time-range-utils";
import { NutritionDelegationMixin } from "./nutrition-delegation";
import { processUserSettingsDetailed } from "./user-settings-utils";
import { prepareDeviceUpdateSettings } from "./device-utils";
import type { IStorage } from "./storage";

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