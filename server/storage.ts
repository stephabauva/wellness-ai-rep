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
      createdAt: new Date()
    };
    this.users.set(1, defaultUser);
    
    // Create initial messages
    const initialMessages: ChatMessage[] = [
      {
        id: this.messageId++,
        userId: 1,
        content: "Hello Sarah! 👋 Welcome back to your Weight Loss coaching session. How are you feeling today?",
        isUserMessage: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes ago
      },
      {
        id: this.messageId++,
        userId: 1,
        content: "I'm feeling pretty good! I managed to go for a run yesterday, but I'm a bit sore today.",
        isUserMessage: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 9) // 9 minutes ago
      },
      {
        id: this.messageId++,
        userId: 1,
        content: "Great job on the run, Sarah! 🏃‍♀️ Post-exercise soreness is completely normal, especially when you're getting back into your routine.\n\nI see from your connected fitness tracker that you completed a 25-minute run at a good pace. That's excellent progress!\n\nWould you like me to suggest some gentle recovery stretches for today? Or would you prefer to focus on nutrition planning to complement your workout?",
        isUserMessage: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 8) // 8 minutes ago
      },
      {
        id: this.messageId++,
        userId: 1,
        content: "I'd love some stretching suggestions, please!",
        isUserMessage: true,
        timestamp: new Date(Date.now() - 1000 * 60 * 7) // 7 minutes ago
      },
      {
        id: this.messageId++,
        userId: 1,
        content: "Here are some gentle recovery stretches that will help with your soreness:\n\n- Standing quad stretch: 30 seconds each leg\n- Seated hamstring stretch: 30 seconds each leg\n- Calf stretch against wall: 30 seconds each leg\n- Child's pose: Hold for 1 minute\n- Gentle torso twists: 10 each side\n\nRemember to breathe deeply and never stretch to the point of pain. Would you like me to send a reminder to do these stretches later today?",
        isUserMessage: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 6) // 6 minutes ago
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
      },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) // 30 days ago
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
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15) // 15 days ago
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
      ...device,
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

export const storage = new MemStorage();
