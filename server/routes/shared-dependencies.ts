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
export const enhancedMemoryService = () => getMemoryServices().enhancedMemoryService;
export const memoryRelationshipEngine = () => getMemoryServices().memoryRelationshipEngine;
export const performanceMemoryCore = () => getMemoryServices().performanceMemoryCore;
export const memoryFeatureFlags = () => getMemoryServices().memoryFeatureFlags;
export const memoryPerformanceMonitor = () => getMemoryServices().memoryPerformanceMonitor;
export const HealthDataParser = () => getHealthServices().healthDataParser;
export const HealthDataDeduplicationService = () => getHealthServices().healthDataDeduplication;
export const healthConsentService = () => getHealthServices().healthConsentService;
export const transcriptionService = () => getFileManagerServices().transcriptionService;
export const categoryService = () => getFileManagerServices().categoryService;
export const attachmentRetentionService = () => getFileManagerServices().attachmentRetentionService;
export const goFileService = () => getFileManagerServices().goFileService;
export const enhancedBackgroundProcessor = () => getSharedServices().enhancedBackgroundProcessor;

import type { UserPreferences } from '@shared/schema';

export type { Express, UserPreferences };