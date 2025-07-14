// Service Registry - Domain-aware service abstraction layer
// @used-by server/routes/shared-dependencies.ts
// MAX_LINES: 100

import type { Express } from "express";

// Core shared services that are legitimately shared
import { storage } from "@shared/database/storage";
import { aiService } from "../../shared/services/ai-service";
import { memoryService } from "@shared/services/memory-service";
import { generatePDFReport } from "./pdf-service";
import { cacheService } from "../../shared/services/cache-service";
import { chatGPTMemoryEnhancement } from "@shared/services/chatgpt-memory-enhancement";
import { db } from "@shared/database/db";

// Database imports
import { eq, desc, and, or } from "drizzle-orm";
import { 
  conversations, conversationMessages, memoryEntries, insertFileCategorySchema,
  files, fileCategories, insertFileSchema, atomicFacts, memoryRelationships,
  memoryConsolidationLog, memoryGraphMetrics, userHealthConsent, healthDataAccessLog,
  users, enhancedSettingsUpdateSchema, healthConsentSettingsSchema,
  insertHealthDataSchema, type UserPreferences
} from "@shared/schema";

// External libraries
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import { join } from 'path';
import { existsSync, statSync, unlinkSync } from 'fs';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// Domain service registry - lazy loading to avoid circular dependencies
interface ServiceRegistry {
  memory: {
    enhancedMemoryService?: any;
    memoryRelationshipEngine?: any;
    performanceMemoryCore?: any;
    memoryFeatureFlags?: any;
    memoryPerformanceMonitor?: any;
  };
  health: {
    healthDataParser?: any;
    healthDataDeduplication?: any;
    healthConsentService?: any;
  };
  fileManager: {
    goFileService?: any;
    transcriptionService?: any;
    categoryService?: any;
    attachmentRetentionService?: any;
  };
  shared: {
    enhancedBackgroundProcessor?: any;
  };
}

const serviceRegistry: ServiceRegistry = {
  memory: {},
  health: {},
  fileManager: {},
  shared: {}
};

// Lazy service loaders to avoid circular dependencies
export const getMemoryServices = async () => {
  if (!serviceRegistry.memory.enhancedMemoryService) {
    const enhancedMemoryModule = await import('./enhanced-memory-service.js');
    serviceRegistry.memory.enhancedMemoryService = enhancedMemoryModule.enhancedMemoryService;
    const memoryRelationshipModule = await import('./memory-relationship-engine.js');
    serviceRegistry.memory.memoryRelationshipEngine = memoryRelationshipModule.memoryRelationshipEngine;
    const performanceMemoryModule = await import('./performance-memory-core.js');
    serviceRegistry.memory.performanceMemoryCore = performanceMemoryModule.performanceMemoryCore;
    const memoryFeatureFlagsModule = await import('./memory-feature-flags.js');
    serviceRegistry.memory.memoryFeatureFlags = memoryFeatureFlagsModule.memoryFeatureFlags;
    const memoryPerformanceMonitorModule = await import('./memory-performance-monitor.js');
    serviceRegistry.memory.memoryPerformanceMonitor = memoryPerformanceMonitorModule.memoryPerformanceMonitor;
  }
  return serviceRegistry.memory;
};

export const getHealthServices = async () => {
  if (!serviceRegistry.health.healthDataParser) {
    const healthDataParserModule = await import('./health-data-parser.js');
    serviceRegistry.health.healthDataParser = healthDataParserModule.HealthDataParser;
    const healthDataDeduplicationModule = await import('./health-data-deduplication.js');
    serviceRegistry.health.healthDataDeduplication = healthDataDeduplicationModule.HealthDataDeduplicationService;
    const healthConsentModule = await import('./health-consent-service.js');
    serviceRegistry.health.healthConsentService = healthConsentModule.healthConsentService;
  }
  return serviceRegistry.health;
};

export const getFileManagerServices = async () => {
  if (!serviceRegistry.fileManager.goFileService) {
    const goFileServiceModule = await import('./go-file-service.js');
    serviceRegistry.fileManager.goFileService = goFileServiceModule.goFileService;
    const transcriptionServiceModule = await import('./transcription-service.js');
    serviceRegistry.fileManager.transcriptionService = transcriptionServiceModule.transcriptionService;
    const categoryServiceModule = await import('./category-service.js');
    serviceRegistry.fileManager.categoryService = categoryServiceModule.categoryService;
    const attachmentRetentionServiceModule = await import('./attachment-retention-service.js');
    serviceRegistry.fileManager.attachmentRetentionService = attachmentRetentionServiceModule.attachmentRetentionService;
  }
  return serviceRegistry.fileManager;
};

export const getSharedServices = async () => {
  if (!serviceRegistry.shared.enhancedBackgroundProcessor) {
    const enhancedBackgroundProcessorModule = await import('./enhanced-background-processor.js');
    serviceRegistry.shared.enhancedBackgroundProcessor = enhancedBackgroundProcessorModule.enhancedBackgroundProcessor;
  }
  return serviceRegistry.shared;
};

// Export the core shared services directly (these are legitimately shared)
export {
  storage, aiService, memoryService, generatePDFReport, cacheService, 
  chatGPTMemoryEnhancement, db, eq, desc, and, or,
  conversations, conversationMessages, memoryEntries, insertFileCategorySchema, 
  files, fileCategories, insertFileSchema, atomicFacts, memoryRelationships,
  memoryConsolidationLog, memoryGraphMetrics, userHealthConsent, healthDataAccessLog,
  users, enhancedSettingsUpdateSchema, healthConsentSettingsSchema,
  insertHealthDataSchema, multer, z, nanoid, join, existsSync, statSync, 
  unlinkSync, path, fs, spawn
};

export type { Express, UserPreferences };