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
import { type NutritionData } from "./nutrition-utils";

// Storage interface definition
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserSettings(id: number, settings: EnhancedSettingsUpdate): Promise<User>;
  
  // Message methods
  getMessages(userId: number): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Health data methods
  getHealthData(userId: number, timeRange: string): Promise<HealthData[]>;
  getHealthDataNoCache(userId: number, timeRange: string): Promise<HealthData[]>;
  createHealthData(data: InsertHealthData): Promise<HealthData>;
  createHealthDataBatch(dataArray: InsertHealthData[]): Promise<HealthData[]>;
  createNutritionDataFromInference(userId: number, nutritionData: NutritionData, conversationId?: string): Promise<HealthData[]>;
  clearAllHealthData(userId: number): Promise<void>;
  deleteHealthDataByType(userId: number, dataType: string): Promise<{ deletedCount: number }>;
  loadSampleHealthData(userId: number): Promise<{ recordsLoaded: number }>;
  
  // Device methods
  getDevices(userId: number): Promise<ConnectedDevice[]>;
  getDevice(id: number): Promise<ConnectedDevice | undefined>;
  createDevice(device: InsertConnectedDevice): Promise<ConnectedDevice>;
  updateDevice(id: number, settings: any): Promise<ConnectedDevice>;
  removeDevice(id: number): Promise<void>;
}

// Import and re-export implementation classes
import { MemStorage } from "./memory-storage";
import { DatabaseStorage } from "./database-storage";

// Re-export implementation classes
export { MemStorage, DatabaseStorage };

// Initialize database storage as default
export const storage = new DatabaseStorage();
