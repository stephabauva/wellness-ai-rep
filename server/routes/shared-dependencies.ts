// MAX_LINES: 50 - Shared Dependencies for route modules
import type { Express } from "express";
import { storage } from "../storage";
import { aiService } from "../services/ai-service";
import { memoryEnhancedAIService } from "../services/memory-enhanced-ai-service";
import { memoryService } from "../services/memory-service";
import { enhancedMemoryService } from "../services/enhanced-memory-service";
import { advancedMemoryAIService } from '../services/advanced-memory-ai-service';
import { memoryRelationshipEngine } from '../services/memory-relationship-engine';
import { performanceMemoryCore } from '../services/performance-memory-core';
import { generatePDFReport } from "../services/pdf-service";
import { transcriptionService } from "../services/transcription-service";
import { cacheService } from "../services/cache-service";
import { categoryService } from "../services/category-service";
import { attachmentRetentionService } from "../services/attachment-retention-service";
import { goFileService } from "../services/go-file-service";
import { HealthDataParser } from "../services/health-data-parser";

import { enhancedBackgroundProcessor } from "../services/enhanced-background-processor";
import { memoryFeatureFlags } from "../services/memory-feature-flags";
import { memoryPerformanceMonitor } from "../services/memory-performance-monitor";
import { chatGPTMemoryEnhancement } from "../services/chatgpt-memory-enhancement";

import { db } from "../db";
import { eq, desc, and, or } from "drizzle-orm";
import { 
  conversations, conversationMessages, memoryEntries, insertFileCategorySchema,
  files, fileCategories, insertFileSchema, atomicFacts, memoryRelationships,
  memoryConsolidationLog, memoryGraphMetrics, userHealthConsent, healthDataAccessLog,
  users, enhancedSettingsUpdateSchema, healthConsentSettingsSchema,
  insertHealthDataSchema, type UserPreferences
} from "@shared/schema";
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid"; import { join } from 'path';
import { existsSync, statSync, unlinkSync } from 'fs';
import path from 'path'; import fs from 'fs';
import { spawn } from 'child_process';

export {
  storage, aiService, memoryEnhancedAIService, memoryService, enhancedMemoryService,
  advancedMemoryAIService, memoryRelationshipEngine, performanceMemoryCore, generatePDFReport,
  transcriptionService, cacheService, categoryService, attachmentRetentionService, goFileService,
  HealthDataParser, enhancedBackgroundProcessor, memoryFeatureFlags,
  memoryPerformanceMonitor, chatGPTMemoryEnhancement, db, eq, desc, and, or,
  conversations, conversationMessages, memoryEntries, insertFileCategorySchema, files, fileCategories,
  insertFileSchema, atomicFacts, memoryRelationships, memoryConsolidationLog, memoryGraphMetrics,
  users, enhancedSettingsUpdateSchema,
  insertHealthDataSchema, multer, z, nanoid, join, existsSync, statSync, unlinkSync, path, fs, spawn
};
export type { Express, UserPreferences };