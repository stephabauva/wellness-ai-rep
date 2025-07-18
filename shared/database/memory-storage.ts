import { 
  type User, 
  type InsertUser,
  type ChatMessage,
  type InsertChatMessage,
  type HealthData,
  type InsertHealthData,
  type ConnectedDevice,
  type InsertConnectedDevice,
  type EnhancedSettingsUpdate,
} from "@shared/schema";
import { nutritionAggregationService } from "../../server/services/nutrition-aggregation-service.js";
import { createDefaultUser, createWelcomeMessage, createComprehensiveHealthData, createConnectedDevices } from "./mock-data";
import { createNutritionHealthData, type NutritionData } from "./nutrition-utils";
import { calculateStartDate } from "./time-range-utils";
import { NutritionDelegationMixin } from "./nutrition-delegation";
import { processUserSettingsSimple, applyUserSettingsToUser } from "./user-settings-utils";
import { createUpdatedDevice } from "./device-utils";
import type { IStorage } from "./storage";

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