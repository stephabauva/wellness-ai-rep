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
export const getMemoryServices = () => {
  if (!serviceRegistry.memory.enhancedMemoryService) {
    serviceRegistry.memory.enhancedMemoryService = require('./enhanced-memory-service').enhancedMemoryService;
    serviceRegistry.memory.memoryRelationshipEngine = require('./memory-relationship-engine').memoryRelationshipEngine;
    serviceRegistry.memory.performanceMemoryCore = require('./performance-memory-core').performanceMemoryCore;
    serviceRegistry.memory.memoryFeatureFlags = require('./memory-feature-flags').memoryFeatureFlags;
    serviceRegistry.memory.memoryPerformanceMonitor = require('./memory-performance-monitor').memoryPerformanceMonitor;
  }
  return serviceRegistry.memory;
};

export const getHealthServices = () => {
  if (!serviceRegistry.health.healthDataParser) {
    serviceRegistry.health.healthDataParser = require('./health-data-parser').HealthDataParser;
    serviceRegistry.health.healthDataDeduplication = require('./health-data-deduplication').HealthDataDeduplicationService;
    serviceRegistry.health.healthConsentService = require('./health-consent-service').healthConsentService;
  }
  return serviceRegistry.health;
};

export const getFileManagerServices = () => {
  if (!serviceRegistry.fileManager.goFileService) {
    serviceRegistry.fileManager.goFileService = require('./go-file-service').goFileService;
    serviceRegistry.fileManager.transcriptionService = require('./transcription-service').transcriptionService;
    serviceRegistry.fileManager.categoryService = require('./category-service').categoryService;
    serviceRegistry.fileManager.attachmentRetentionService = require('./attachment-retention-service').attachmentRetentionService;
  }
  return serviceRegistry.fileManager;
};

export const getSharedServices = () => {
  if (!serviceRegistry.shared.enhancedBackgroundProcessor) {
    serviceRegistry.shared.enhancedBackgroundProcessor = require('./enhanced-background-processor').enhancedBackgroundProcessor;
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