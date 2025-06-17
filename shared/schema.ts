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
  aiProvider: text("ai_provider").default("google"),
  aiModel: text("ai_model").default("gemini-2.0-flash-exp"),
  memoryDetectionProvider: text("memory_detection_provider").default("google"),
  memoryDetectionModel: text("memory_detection_model").default("gemini-2.0-flash-lite"),
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
  aiProvider: true,
  aiModel: true,
  memoryDetectionProvider: true,
  memoryDetectionModel: true,
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
  timestamp: true,
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
  // Phase 1: ChatGPT Memory Enhancement additions
  semanticHash: text("semantic_hash"), // For deduplication
  updateCount: integer("update_count").default(1), // Track memory updates
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

// Atomic facts schema for Phase 2: Semantic Memory Graph
export const atomicFacts = pgTable("atomic_facts", {
  id: uuid("id").primaryKey().defaultRandom(),
  memoryEntryId: uuid("memory_entry_id").notNull().references(() => memoryEntries.id, { onDelete: 'cascade' }),
  factContent: text("fact_content").notNull(),
  factType: text("fact_type").notNull(), // preference, attribute, relationship, behavior, goal
  confidence: real("confidence").notNull().default(0.8),
  isVerified: boolean("is_verified").default(false),
  sourceContext: text("source_context"), // Original message context
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAtomicFactSchema = createInsertSchema(atomicFacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Memory relationships schema for Phase 2: Semantic Memory Graph
export const memoryRelationships = pgTable("memory_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceMemoryId: uuid("source_memory_id").notNull().references(() => memoryEntries.id, { onDelete: 'cascade' }),
  targetMemoryId: uuid("target_memory_id").notNull().references(() => memoryEntries.id, { onDelete: 'cascade' }),
  relationshipType: text("relationship_type").notNull(), // contradicts, supports, elaborates, supersedes, related
  strength: real("strength").notNull().default(0.5), // 0.0 to 1.0
  confidence: real("confidence").notNull().default(0.7),
  detectedAt: timestamp("detected_at").defaultNow(),
  lastValidated: timestamp("last_validated").defaultNow(),
  isActive: boolean("is_active").default(true),
  validationCount: integer("validation_count").default(1),
  metadata: jsonb("metadata"), // Additional context about the relationship
});

export const insertMemoryRelationshipSchema = createInsertSchema(memoryRelationships).omit({
  id: true,
  detectedAt: true,
  lastValidated: true,
  isActive: true,
  validationCount: true,
});

// Memory consolidation log schema for tracking merge operations
export const memoryConsolidationLog = pgTable("memory_consolidation_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull(),
  consolidationType: text("consolidation_type").notNull(), // merge, supersede, resolve_contradiction, cluster
  sourceMemoryIds: text("source_memory_ids").array().notNull(),
  resultMemoryId: uuid("result_memory_id"),
  confidence: real("confidence").notNull(),
  reasonDescription: text("reason_description"),
  automaticProcess: boolean("automatic_process").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemoryConsolidationLogSchema = createInsertSchema(memoryConsolidationLog).omit({
  id: true,
  createdAt: true,
});

// Memory graph metrics for performance tracking
export const memoryGraphMetrics = pgTable("memory_graph_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull(),
  totalMemories: integer("total_memories").notNull(),
  totalRelationships: integer("total_relationships").notNull(),
  avgRelationshipsPerMemory: real("avg_relationships_per_memory"),
  contradictionCount: integer("contradiction_count").default(0),
  consolidationCount: integer("consolidation_count").default(0),
  graphDensity: real("graph_density"), // relationships / possible_relationships
  lastCalculated: timestamp("last_calculated").defaultNow(),
});

export type AtomicFact = typeof atomicFacts.$inferSelect;
export type InsertAtomicFact = z.infer<typeof insertAtomicFactSchema>;

export type MemoryRelationship = typeof memoryRelationships.$inferSelect;
export type InsertMemoryRelationship = z.infer<typeof insertMemoryRelationshipSchema>;

export type MemoryConsolidationLog = typeof memoryConsolidationLog.$inferSelect;
export type InsertMemoryConsolidationLog = z.infer<typeof insertMemoryConsolidationLogSchema>;

export type MemoryGraphMetrics = typeof memoryGraphMetrics.$inferSelect;

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

// Files table - dedicated table for all uploaded files
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  categoryId: uuid("category_id").references(() => fileCategories.id),
  fileName: text("file_name").notNull(), // Unique filename on disk
  displayName: text("display_name").notNull(), // Original filename
  filePath: text("file_path").notNull(), // Full path to file on disk
  fileType: text("file_type").notNull(), // MIME type
  fileSize: integer("file_size").notNull(), // Size in bytes
  uploadSource: text("upload_source").notNull().default("direct"), // "direct" (file manager) or "chat" (AI conversation)
  conversationId: uuid("conversation_id").references(() => conversations.id), // Link to conversation if uploaded via chat
  messageId: uuid("message_id").references(() => conversationMessages.id), // Link to specific message if uploaded via chat
  retentionPolicy: text("retention_policy").notNull().default("medium"), // "high" (permanent), "medium" (90 days), "low" (30 days)
  retentionDays: integer("retention_days"), // Specific retention days (null = permanent)
  scheduledDeletion: timestamp("scheduled_deletion"), // When file should be deleted
  isDeleted: boolean("is_deleted").default(false), // Soft delete flag
  deletedAt: timestamp("deleted_at"), // When file was deleted
  metadata: jsonb("metadata"), // Additional file metadata (thumbnails, processing status, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// File access log - track when files are accessed/downloaded
export const fileAccessLog = pgTable("file_access_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => files.id),
  userId: integer("user_id").notNull().references(() => users.id),
  accessType: text("access_type").notNull(), // "view", "download", "ai_analysis"
  conversationId: uuid("conversation_id").references(() => conversations.id), // If accessed during AI conversation
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFileAccessLogSchema = createInsertSchema(fileAccessLog).omit({
  id: true,
  createdAt: true,
});

// File retention settings - user-configurable retention policies
export const fileRetentionSettings = pgTable("file_retention_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  categoryId: uuid("category_id").references(() => fileCategories.id), // Category-specific settings
  retentionPolicy: text("retention_policy").notNull(), // "high", "medium", "low", "custom"
  retentionDays: integer("retention_days"), // Override default retention days
  autoDelete: boolean("auto_delete").default(true), // Whether to automatically delete expired files
  notifyBeforeDeletion: boolean("notify_before_deletion").default(true), // Send notification before deletion
  notificationDays: integer("notification_days").default(7), // Days before deletion to notify
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFileRetentionSettingsSchema = createInsertSchema(fileRetentionSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export file types
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type FileAccessLog = typeof fileAccessLog.$inferSelect;
export type InsertFileAccessLog = z.infer<typeof insertFileAccessLogSchema>;

export type FileRetentionSettings = typeof fileRetentionSettings.$inferSelect;
export type InsertFileRetentionSettings = z.infer<typeof insertFileRetentionSettingsSchema>;

// Phase 1: User Health Consent Management Schema
export const userHealthConsent = pgTable("user_health_consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(), // 'lifestyle', 'cardiovascular', 'body_composition', 'medical', 'advanced'
  consentType: text("consent_type").notNull(), // 'ai_access', 'retention', 'sharing'
  isEnabled: boolean("is_enabled").default(false),
  retentionDays: integer("retention_days").default(90),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserHealthConsentSchema = createInsertSchema(userHealthConsent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Health data access log for GDPR compliance
export const healthDataAccessLog = pgTable("health_data_access_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  dataType: text("data_type").notNull(),
  accessType: text("access_type").notNull(), // 'ai_query', 'export', 'display'
  consentVerified: boolean("consent_verified").default(false),
  accessedAt: timestamp("accessed_at").defaultNow(),
});

export const insertHealthDataAccessLogSchema = createInsertSchema(healthDataAccessLog).omit({
  id: true,
  accessedAt: true,
});

// Export consent types
export type UserHealthConsent = typeof userHealthConsent.$inferSelect;
export type InsertUserHealthConsent = z.infer<typeof insertUserHealthConsentSchema>;

export type HealthDataAccessLog = typeof healthDataAccessLog.$inferSelect;
export type InsertHealthDataAccessLog = z.infer<typeof insertHealthDataAccessLogSchema>;

// Health consent settings interface for settings UI
export interface HealthConsentSettings {
  data_visibility: {
    visible_categories: string[];
    hidden_categories: string[];
    dashboard_preferences: Record<string, any>;
  };
  ai_access_consent: {
    lifestyle: boolean;
    cardiovascular: boolean;
    body_composition: boolean;
    medical: boolean;
    advanced: boolean;
  };
  retention_policies: {
    lifestyle_days: number;
    cardiovascular_days: number;
    body_composition_days: number;
    medical_days: number;
    advanced_days: number;
  };
  export_controls: {
    auto_export_enabled: boolean;
    export_format: 'pdf' | 'json' | 'csv';
    include_ai_interactions: boolean;
  };
}

// Settings update schema (moved from routes.ts)
export const settingsUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  primaryGoal: z.string().optional(),
  coachStyle: z.string().optional(),
  reminderFrequency: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  darkMode: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  emailSummaries: z.boolean().optional(),
  dataSharing: z.boolean().optional(),
  aiProvider: z.enum(["openai", "google"]).optional(),
  aiModel: z.string().optional(),
  transcriptionProvider: z.enum(["webspeech", "openai", "google"]).optional(),
  preferredLanguage: z.string().optional(),
  automaticModelSelection: z.boolean().optional(),
  memoryDetectionProvider: z.enum(["google", "openai", "none"]).optional(),
  memoryDetectionModel: z.string().optional(),
  // Attachment retention settings
  highValueRetentionDays: z.number().optional(),
  mediumValueRetentionDays: z.number().optional(),
  lowValueRetentionDays: z.number().optional()
});

// Health consent settings validation schema
export const healthConsentSettingsSchema = z.object({
  data_visibility: z.object({
    visible_categories: z.array(z.string()),
    hidden_categories: z.array(z.string()),
    dashboard_preferences: z.record(z.any()).default({}),
  }),
  ai_access_consent: z.object({
    lifestyle: z.boolean(),
    cardiovascular: z.boolean(),
    body_composition: z.boolean(),
    medical: z.boolean(),
    advanced: z.boolean(),
  }),
  retention_policies: z.object({
    lifestyle_days: z.number(),
    cardiovascular_days: z.number(),
    body_composition_days: z.number(),
    medical_days: z.number(),
    advanced_days: z.number(),
  }),
  export_controls: z.object({
    auto_export_enabled: z.boolean(),
    export_format: z.enum(['pdf', 'json', 'csv']),
    include_ai_interactions: z.boolean(),
  }),
});

// Enhanced settings update schema with health consent
export const enhancedSettingsUpdateSchema = settingsUpdateSchema.extend({
  health_consent: healthConsentSettingsSchema.optional(),
});

// Extended user settings type
export interface UserSettingsFormValues {
  username: string;
  email: string;
  name?: string;
  preferences?: any;
  transcriptionProvider: string;
  preferredLanguage: string;
  automaticModelSelection: boolean;
  aiProvider: string;
  aiModel: string;
  memoryDetectionProvider: string;
  memoryDetectionModel: string;
  health_consent?: HealthConsentSettings;
}