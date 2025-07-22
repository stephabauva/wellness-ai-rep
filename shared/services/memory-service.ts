/**
 * @used-by chat/chat-routes - Memory detection in chat messages
 * @used-by memory/memory-routes - Direct memory operations
 * @used-by shared/chat-helpers - Chat memory integration
 * @cross-domain true
 * @critical-path true
 * @service-type core
 * @impact Changes affect chat memory detection and storage
 */
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from "@shared/database/db";
import { 
  memoryEntries, 
  memoryTriggers, 
  memoryAccessLog, 
  conversations,
  conversationMessages,
  type InsertMemoryEntry,
  type InsertMemoryTrigger,
  type InsertMemoryAccessLog,
  type MemoryEntry,
  type MemoryCategory
} from '../../shared/schema';
import { eq, desc, and, sql, gt } from 'drizzle-orm';
import { cacheService } from "@shared/services/cache-service";
import { goMemoryService } from '../../server/services/go-memory-service';
import { logger } from "@shared/services/logger-service";
import {
  generateSemanticHash,
  cosineSimilaritySync,
  createSimilarityCacheKey
} from './memory/memory-utils';
import { MemoryCache } from './memory/memory-cache';
import { AIMemoryDetector, type MemoryDetectionResult } from './memory/ai-detection';
import { EmbeddingService } from './memory/embedding-service';
import { MemoryQualityService, type MemoryQualityMetrics } from './memory/quality-metrics';
import { MemoryRetrievalService } from './memory/retrieval-service';
import { BackgroundProcessingManager } from './memory/background-processing-manager';
import { MemoryContentValidator } from './memory/content-validation';
import { MemoryCacheManager } from './memory/cache-management';
import type { RelevantMemory } from './memory/memory-types';
import { buildSystemPromptWithMemories } from './memory/prompt-utils';
import { mapAndSortMemories, mapMemoryFields, processRecentMemoriesForOverview } from './memory/memory-mappers';
import { calculateCosineSimilarityWithFallback } from './memory/similarity-utils';
import { getCachedSimilarityWithFallback } from './memory/cache-utils';
import { checkSemanticDuplicate } from './memory/database-utils';
import { MemoryPerformanceUtils } from './memory/performance-utils';
import { MemoryHashUtils } from './memory/hash-utils';
import { MemoryDatabaseOperations } from './memory/database-operations';
import { MemoryLoggingUtils } from './memory/logging-utils';
import { MemoryQueryOperations } from './memory/query-operations';
import { MemorySimilarityOperations } from './memory/similarity-operations';


class MemoryService {
  private openai: OpenAI;
  private google: GoogleGenerativeAI;
  
  // Cache manager and services
  private memoryCache: MemoryCache;
  private aiDetector: AIMemoryDetector;
  private embeddingService: EmbeddingService;
  private qualityService: MemoryQualityService;
  private retrievalService: MemoryRetrievalService;
  private backgroundProcessingManager: BackgroundProcessingManager;
  private contentValidator: MemoryContentValidator;
  private cacheManager: MemoryCacheManager;
  private performanceUtils: MemoryPerformanceUtils;
  private hashUtils: MemoryHashUtils;
  private databaseOps: MemoryDatabaseOperations;
  private loggingUtils: MemoryLoggingUtils;
  private queryOps: MemoryQueryOperations;
  private similarityOps: MemorySimilarityOperations;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.google = new GoogleGenerativeAI(
      process.env.GOOGLE_API_KEY || ''
    );
    
    // Initialize cache manager
    this.memoryCache = new MemoryCache();
    
    // Initialize AI detector
    this.aiDetector = new AIMemoryDetector(this.openai);
    
    // Initialize embedding service
    this.embeddingService = new EmbeddingService(this.openai);
    
    // Initialize quality metrics service
    this.qualityService = new MemoryQualityService();
    
    // Initialize memory retrieval service
    this.retrievalService = new MemoryRetrievalService(this.embeddingService, this.memoryCache);
    
    // Initialize background processing manager
    this.backgroundProcessingManager = new BackgroundProcessingManager(
      this.memoryCache,
      this.aiDetector,
      this.embeddingService
    );
    
    // Initialize content validator
    this.contentValidator = new MemoryContentValidator();
    
    // Initialize cache manager
    this.cacheManager = new MemoryCacheManager(this.memoryCache);
    
    // Initialize performance utilities
    this.performanceUtils = new MemoryPerformanceUtils(
      this.backgroundProcessingManager,
      this.cacheManager
    );
    
    // Initialize hash utilities
    this.hashUtils = new MemoryHashUtils();
    
    // Initialize database operations
    this.databaseOps = new MemoryDatabaseOperations(
      this.cacheManager,
      this.generateEmbedding.bind(this)
    );
    
    // Initialize logging utilities
    this.loggingUtils = new MemoryLoggingUtils();
    
    // Initialize query operations
    this.queryOps = new MemoryQueryOperations(this.qualityService);
    
    // Initialize similarity operations
    this.similarityOps = new MemorySimilarityOperations(
      this.cacheManager,
      this.backgroundProcessingManager
    );
  }



  // Add task to background queue
  private addBackgroundTask(type: 'memory_processing' | 'embedding_generation' | 'similarity_calculation', payload: any, priority: number = 1): void {
    this.backgroundProcessingManager.addBackgroundTask(type, payload, priority);
  }


  // Get cached vector similarity with background calculation
  private getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    return this.similarityOps.getCachedSimilarity(vectorA, vectorB);
  }

  // Fast semantic deduplication using hash utilities
  private generateSemanticHash(message: string): string {
    return this.hashUtils.generateSemanticHash(message);
  }

  private async checkSemanticDuplicate(userId: number, semanticHash: string): Promise<boolean> {
    return this.hashUtils.checkSemanticDuplicate(userId, semanticHash);
  }

  // Fast pattern-based memory detection
  private detectMemoryWorthyFast(message: string): {
    shouldRemember: boolean;
    category: MemoryCategory;
    importance: number;
    extractedInfo: string;
    keywords: string[];
  } {
    return this.contentValidator.detectMemoryWorthyFast(message);
  }

  // Detect explicit memory triggers like "remember this" or "don't forget"
  detectExplicitMemoryTriggers(message: string): { type: string; content: string; confidence: number } | null {
    return this.contentValidator.detectExplicitMemoryTriggers(message);
  }

  // Validate memory content quality to prevent nonsensical memories
  private validateMemoryContent(extractedInfo: string, category: MemoryCategory): boolean {
    return this.contentValidator.validateMemoryContent(extractedInfo, category);
  }

  // AI-powered detection of memory-worthy content
  async detectMemoryWorthy(message: string, conversationHistory: any[] = []): Promise<MemoryDetectionResult> {
    return this.aiDetector.detectMemoryWorthy(message, conversationHistory, this.contentValidator.validateMemoryContent.bind(this.contentValidator));
  }

  // Generate embeddings for semantic search with caching
  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingService.generateEmbedding(text);
  }

  // Create memory entry (wrapper for enhanced memory service compatibility)
  async createMemory(
    userId: number,
    content: string,
    category: string,
    importance: number,
    conversationId?: string,
    messageId?: number,
    keywords?: string[]
  ): Promise<MemoryEntry | null> {
    return this.saveMemoryEntry(userId, content, {
      category: category as MemoryCategory,
      importance_score: importance,
      sourceConversationId: conversationId && conversationId.trim() !== '' ? conversationId : undefined,
      sourceMessageId: messageId,
      keywords: keywords
    });
  }

  // Save memory entry to database
  async saveMemoryEntry(
    userId: number, 
    content: string, 
    options: {
      category: MemoryCategory;
      labels?: string[];
      importance_score: number;
      sourceConversationId?: string;
      sourceMessageId?: number;
      keywords?: string[];
    }
  ): Promise<MemoryEntry | null> {
    return this.databaseOps.saveMemoryEntry(userId, content, options);
  }

  // Calculate cosine similarity between two vectors
  // Tier 3 A: Use Go service for performance-critical similarity calculations
  async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    return this.similarityOps.cosineSimilarity(a, b);
  }

  // Synchronous cosine similarity using imported utility
  cosineSimilaritySync(a: number[], b: number[]): number {
    return this.similarityOps.cosineSimilaritySync(a, b);
  }

  // Retrieve relevant memories based on context
  async getContextualMemories(
    userId: number, 
    conversationHistory: any[], 
    currentMessage: string
  ): Promise<RelevantMemory[]> {
    return this.retrievalService.getContextualMemories(userId, conversationHistory, currentMessage);
  }

  // Process message for memory extraction with background processing
  async processMessageForMemory(
    userId: number, 
    message: string, 
    conversationId: string, 
    messageId: number,
    conversationHistory: any[] = []
  ): Promise<{
    explicitMemory?: MemoryEntry;
    autoDetectedMemory?: MemoryEntry;
    triggers: any[];
  }> {
    const results: {
      explicitMemory?: MemoryEntry;
      autoDetectedMemory?: MemoryEntry;
      triggers: any[];
    } = { triggers: [] };

    try {
      // Check for explicit triggers (immediate processing for user-requested saves)
      const explicitTrigger = this.contentValidator.detectExplicitMemoryTriggers(message);
      if (explicitTrigger) {
        // Save explicit memory trigger
        const triggerData: InsertMemoryTrigger = {
          messageId,
          triggerType: explicitTrigger.type,
          triggerPhrase: explicitTrigger.content,
          confidence: explicitTrigger.confidence,
        };

        const [trigger] = await db.insert(memoryTriggers).values(triggerData).returning();
        results.triggers.push(trigger);

        // Save the memory immediately for explicit requests
        const memory = await this.saveMemoryEntry(userId, explicitTrigger.content, {
          category: 'instructions',
          importance_score: 0.9,
          sourceConversationId: conversationId,
          sourceMessageId: messageId,
        });

        if (memory) {
          results.explicitMemory = memory;
          // Update trigger with memory ID
          await db
            .update(memoryTriggers)
            .set({ memoryEntryId: memory.id, processed: true })
            .where(eq(memoryTriggers.id, trigger.id));
          
          // Debounced cache invalidation for immediate updates
          this.cacheManager.invalidateUserMemoryCache(userId, 500); // Faster invalidation for explicit saves
        }
      }

      // Tier 2 C: Background processing for automatic memory detection
      // This prevents blocking the main response flow
      
      // Always queue background memory processing for user messages (messageId can be undefined during streaming)
      this.backgroundProcessingManager.addBackgroundTask('memory_processing', {
        userId,
        message,
        conversationId,
        messageId: messageId || null,
        conversationHistory
      }, 3); // Medium priority

      return results;
    } catch (error) {
      logger.error('Error processing message for memory', error as Error, { service: 'memory' });
      return { triggers: [] };
    }
  }

  // Log memory usage for analytics
  async logMemoryUsage(
    memories: RelevantMemory[], 
    conversationId: string, 
    usedInResponse: boolean = true
  ): Promise<void> {
    return this.loggingUtils.logMemoryUsage(memories, conversationId, usedInResponse);
  }

  // Build system prompt with relevant memories
  buildSystemPromptWithMemories(memories: RelevantMemory[], basePersona?: string): string {
    return buildSystemPromptWithMemories(memories, basePersona);
  }

  // Tier 2 C: Optimized user memories with caching and filtering
  async getUserMemories(userId: number, category?: MemoryCategory): Promise<MemoryEntry[]> {
    return this.queryOps.getUserMemories(userId, category);
  }

  // Optimized paginated user memories for better performance
  async getUserMemoriesPaginated(userId: number, options: {
    page: number;
    limit: number;
    offset: number;
    category?: MemoryCategory;
  }): Promise<{
    memories: MemoryEntry[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    return this.queryOps.getUserMemoriesPaginated(userId, options);
  }

  // Optimized memory overview for faster performance
  async getMemoryOverviewOptimized(userId: number): Promise<{
    total: number;
    categories: Record<string, number>;
    recentMemories: Array<{
      id: string;
      content: string;
      category: string;
      createdAt: string;
    }>;
    qualityMetrics: {
      qualityScore: number;
      duplicateRate: number;
      potentialDuplicates: number;
      averageImportanceScore: number;
      averageFreshness: number;
    };
  }> {
    return this.queryOps.getMemoryOverviewOptimized(userId);
  }

  // Memory Quality Metrics
  async getMemoryQualityMetrics(userId: number): Promise<MemoryQualityMetrics> {
    return this.queryOps.getMemoryQualityMetrics(userId);
  }


  // Tier 2 C: Delete memory with optimized cache invalidation
  async deleteMemory(memoryId: string, userId: number): Promise<boolean> {
    return this.databaseOps.deleteMemory(memoryId, userId);
  }

  // Get memory service performance stats
  getPerformanceStats(): {
    backgroundQueueSize: number;
    activeCaches: number;
    pendingUpdates: number;
    cacheHitRate: string;
  } {
    return this.performanceUtils.getPerformanceStats();
  }

  // Force cache cleanup for memory management
  forceCacheCleanup(): void {
    this.performanceUtils.forceCacheCleanup();
  }

  // Preload user memories for better performance
  async preloadUserMemories(userId: number): Promise<void> {
    return this.performanceUtils.preloadUserMemories(userId, (userId) => this.getUserMemories(userId));
  }
}

export const memoryService = new MemoryService();