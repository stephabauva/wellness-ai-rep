import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom vector type for embeddings (we'll handle vector operations manually)
const vectorType = (name: string, dimensions: number) => text(name);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  preferences: jsonb("preferences"),
  transcriptionProvider: text("transcription_provider").default("webspeech"),
  preferredLanguage: text("preferred_language").default("en"),
  automaticModelSelection: boolean("automatic_model_selection").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  preferences: true,
  transcriptionProvider: true,
  preferredLanguage: true,
  automaticModelSelection: true,
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
  category: text("category"), // body_composition, cardiovascular, lifestyle, medical, advanced
  metadata: jsonb("metadata"), // Additional context like time of day, meal relation, etc.
});

export const insertHealthDataSchema = createInsertSchema(healthData).pick({
  userId: true,
  dataType: true,
  value: true,
  unit: true,
  source: true,
  category: true,
  metadata: true,
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
  createdAt: timestamp("created_at").defaultNow(),
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

// File Categories Table
export const fileCategories = pgTable("file_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"), // For storing icon name or SVG string
  color: text("color"), // For storing hex color or Tailwind class
  isCustom: boolean("is_custom").default(false).notNull(),
  userId: integer("user_id").references(() => users.id), // Nullable for system categories
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FileCategory = typeof fileCategories.$inferSelect;
export type InsertFileCategory = typeof fileCategories.$inferInsert;
export const insertFileCategorySchema = createInsertSchema(fileCategories);


// Conversation schema for memory system
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

// Memory entries schema
export const memoryEntries = pgTable("memory_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // preference, personal_info, context, instruction
  importanceScore: real("importance_score").notNull().default(0.5),
  keywords: text("keywords").array(),
  embedding: jsonb("embedding"), // Vector array as JSON
  sourceConversationId: uuid("source_conversation_id"),
  sourceMessageId: integer("source_message_id"),
  lastAccessed: timestamp("last_accessed").defaultNow(),
  accessCount: integer("access_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntries).omit({
  id: true,
  lastAccessed: true,
  accessCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

// Memory triggers schema
export const memoryTriggers = pgTable("memory_triggers", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: integer("message_id").notNull(),
  triggerType: text("trigger_type").notNull(), // explicit_save, auto_detected
  triggerPhrase: text("trigger_phrase"),
  confidence: real("confidence").default(0.5),
  processed: boolean("processed").default(false),
  memoryEntryId: uuid("memory_entry_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemoryTriggerSchema = createInsertSchema(memoryTriggers).pick({
  messageId: true,
  triggerType: true,
  triggerPhrase: true,
  confidence: true,
  memoryEntryId: true,
});

// Memory access log schema
export const memoryAccessLog = pgTable("memory_access_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  memoryEntryId: uuid("memory_entry_id").notNull(),
  conversationId: uuid("conversation_id"),
  relevanceScore: real("relevance_score"),
  usedInResponse: boolean("used_in_response").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemoryAccessLogSchema = createInsertSchema(memoryAccessLog).pick({
  memoryEntryId: true,
  conversationId: true,
  relevanceScore: true,
  usedInResponse: true,
});

// Enhanced chat messages to support conversations
export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationMessageSchema = createInsertSchema(conversationMessages).pick({
  conversationId: true,
  role: true,
  content: true,
  metadata: true,
});

// Export memory types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type MemoryEntry = typeof memoryEntries.$inferSelect;
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;

export type MemoryTrigger = typeof memoryTriggers.$inferSelect;
export type InsertMemoryTrigger = z.infer<typeof insertMemoryTriggerSchema>;

export type MemoryAccessLog = typeof memoryAccessLog.$inferSelect;
export type InsertMemoryAccessLog = z.infer<typeof insertMemoryAccessLogSchema>;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;

// Memory categories
export const memoryCategories = ['preference', 'personal_info', 'context', 'instruction'] as const;
export type MemoryCategory = typeof memoryCategories[number];

// Coaching types
export const coachingModes = ['weight-loss', 'muscle-gain', 'fitness', 'mental-wellness', 'nutrition'] as const;
export type CoachingMode = typeof coachingModes[number];

// Transcription provider types
export const transcriptionProviders = ['webspeech', 'openai', 'google'] as const;
export type TranscriptionProvider = typeof transcriptionProviders[number];

// Language preferences for transcription
export const supportedLanguages = [
  { code: 'en', name: 'English', openaiCode: 'en', googleCode: 'en-US' },
  { code: 'es', name: 'Spanish', openaiCode: 'es', googleCode: 'es-ES' },
  { code: 'fr', name: 'French', openaiCode: 'fr', googleCode: 'fr-FR' },
  { code: 'de', name: 'German', openaiCode: 'de', googleCode: 'de-DE' },
  { code: 'it', name: 'Italian', openaiCode: 'it', googleCode: 'it-IT' },
  { code: 'pt', name: 'Portuguese', openaiCode: 'pt', googleCode: 'pt-PT' },
  { code: 'ru', name: 'Russian', openaiCode: 'ru', googleCode: 'ru-RU' },
  { code: 'zh', name: 'Chinese', openaiCode: 'zh', googleCode: 'zh-CN' },
  { code: 'ja', name: 'Japanese', openaiCode: 'ja', googleCode: 'ja-JP' },
  { code: 'ko', name: 'Korean', openaiCode: 'ko', googleCode: 'ko-KR' },
  { code: 'auto', name: 'Auto-detect', openaiCode: undefined, googleCode: 'en-US' }
] as const;
export const languageCodes = supportedLanguages.map(l => l.code);
export type LanguageCode = typeof languageCodes[number];

// Health data categories and types
export const healthDataCategories = [
  'body_composition', 
  'cardiovascular', 
  'lifestyle', 
  'medical', 
  'advanced'
] as const;
export type HealthDataCategory = typeof healthDataCategories[number];

// Comprehensive health data types organized by category
export const healthMetrics = {
  body_composition: [
    'weight', 'bmi', 'body_fat_percentage', 'subcutaneous_fat', 'visceral_fat',
    'body_water_percentage', 'muscle_mass', 'bone_mass', 'bmr', 'metabolic_age'
  ],
  cardiovascular: [
    'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 
    'resting_heart_rate', 'hrv', 'cholesterol_ldl', 'cholesterol_hdl', 
    'cholesterol_triglycerides', 'cholesterol_total', 'oxygen_saturation'
  ],
  lifestyle: [
    'sleep_duration', 'sleep_quality', 'sleep_deep', 'sleep_light', 'sleep_rem',
    'steps', 'daily_activity', 'exercise_duration', 'calories_burned', 
    'calories_intake', 'hydration', 'stress_level', 'mood', 'menstrual_cycle'
  ],
  medical: [
    'blood_glucose_fasting', 'blood_glucose_postprandial', 'blood_glucose_random',
    'hba1c', 'insulin_dosage', 'carbohydrate_intake', 'ketone_levels',
    'medication_adherence', 'body_temperature'
  ],
  advanced: [
    'vo2_max', 'lactate_threshold', 'ecg_data', 'skin_temperature',
    'glycemic_load', 'glycemic_index'
  ]
} as const;

export type HealthMetricType = 
  | typeof healthMetrics.body_composition[number]
  | typeof healthMetrics.cardiovascular[number]
  | typeof healthMetrics.lifestyle[number]
  | typeof healthMetrics.medical[number]
  | typeof healthMetrics.advanced[number];
export const insertMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  content: true,
  isUserMessage: true,
});

export const selectMessageSchema = createInsertSchema(chatMessages);

// File attachment schema
export const fileAttachmentSchema = z.object({
  fileName: z.string(),
  fileSize: z.number(),
  fileType: z.string(),
  fileUrl: z.string().optional(),
  fileData: z.string().optional(), // base64 encoded for small files
});

export type FileAttachment = z.infer<typeof fileAttachmentSchema>;

// Extended message schema with attachments
export const messageWithAttachmentsSchema = selectMessageSchema.extend({
  attachments: z.array(fileAttachmentSchema).optional(),
});

export type MessageWithAttachments = z.infer<typeof messageWithAttachmentsSchema>;