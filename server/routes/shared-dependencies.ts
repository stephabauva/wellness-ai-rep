// MAX_LINES: 50 - Shared Dependencies for route modules - Using Service Registry
import type { Express } from "express";
import { 
  storage, aiService, memoryService, generatePDFReport, cacheService, 
  chatGPTMemoryEnhancement, db, eq, desc, and, or,
  conversations, conversationMessages, memoryEntries, insertFileCategorySchema, 
  files, fileCategories, insertFileSchema, atomicFacts, memoryRelationships,
  memoryConsolidationLog, memoryGraphMetrics, userHealthConsent, healthDataAccessLog,
  users, enhancedSettingsUpdateSchema, healthConsentSettingsSchema,
  insertHealthDataSchema, multer, z, nanoid, join, existsSync, statSync, 
  unlinkSync, path, fs, spawn,
  getMemoryServices, getHealthServices, getFileManagerServices, getSharedServices
} from "../services/service-registry";

// Legacy exports for backward compatibility - routes should migrate to use service getters
export {
  storage, aiService, memoryService, generatePDFReport, cacheService, 
  chatGPTMemoryEnhancement, db, eq, desc, and, or,
  conversations, conversationMessages, memoryEntries, insertFileCategorySchema, 
  files, fileCategories, insertFileSchema, atomicFacts, memoryRelationships,
  memoryConsolidationLog, memoryGraphMetrics, userHealthConsent, healthDataAccessLog,
  users, enhancedSettingsUpdateSchema, healthConsentSettingsSchema,
  insertHealthDataSchema, multer, z, nanoid, join, existsSync, statSync, 
  unlinkSync, path, fs, spawn,
  getMemoryServices, getHealthServices, getFileManagerServices, getSharedServices
};

// Deprecated exports - use service getters instead
export const enhancedMemoryService = async () => (await getMemoryServices()).enhancedMemoryService;
export const memoryRelationshipEngine = async () => (await getMemoryServices()).memoryRelationshipEngine;
export const performanceMemoryCore = async () => (await getMemoryServices()).performanceMemoryCore;
export const memoryFeatureFlags = async () => (await getMemoryServices()).memoryFeatureFlags;
export const memoryPerformanceMonitor = async () => (await getMemoryServices()).memoryPerformanceMonitor;
export const HealthDataParser = async () => (await getHealthServices()).healthDataParser;
export const HealthDataDeduplicationService = async () => (await getHealthServices()).healthDataDeduplication;
export const healthConsentService = async () => (await getHealthServices()).healthConsentService;
export const transcriptionService = async () => (await getFileManagerServices()).transcriptionService;
export const categoryService = async () => (await getFileManagerServices()).categoryService;
export const attachmentRetentionService = async () => (await getFileManagerServices()).attachmentRetentionService;
export const goFileService = async () => (await getFileManagerServices()).goFileService;
export const enhancedBackgroundProcessor = async () => (await getSharedServices()).enhancedBackgroundProcessor;

import type { UserPreferences } from '@shared/schema';

export type { Express, UserPreferences };