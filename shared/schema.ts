import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  preferences: true,
});

// Chat message schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  isUserMessage: boolean("is_user_message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  content: true,
  isUserMessage: true,
});

// Health data schema
export const healthData = pgTable("health_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  dataType: text("data_type").notNull(), // e.g., steps, sleep, weight, etc.
  value: text("value").notNull(),
  unit: text("unit"),
  timestamp: timestamp("timestamp").defaultNow(),
  source: text("source"), // device/manual input
});

export const insertHealthDataSchema = createInsertSchema(healthData).pick({
  userId: true,
  dataType: true,
  value: true,
  unit: true,
  source: true,
});

// Connected devices schema
export const connectedDevices = pgTable("connected_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceName: text("device_name").notNull(),
  deviceType: text("device_type").notNull(), // e.g., smartwatch, scale, etc.
  lastSync: timestamp("last_sync"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
});

export const insertConnectedDeviceSchema = createInsertSchema(connectedDevices).pick({
  userId: true,
  deviceName: true,
  deviceType: true,
  lastSync: true,
  isActive: true,
  metadata: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type HealthData = typeof healthData.$inferSelect;
export type InsertHealthData = z.infer<typeof insertHealthDataSchema>;

export type ConnectedDevice = typeof connectedDevices.$inferSelect;
export type InsertConnectedDevice = z.infer<typeof insertConnectedDeviceSchema>;

// Coaching types
export const coachingModes = ['weight-loss', 'muscle-gain', 'fitness', 'mental-wellness', 'nutrition'] as const;
export type CoachingMode = typeof coachingModes[number];
