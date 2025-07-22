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
  }



  // Add task to background queue
  private addBackgroundTask(type: 'memory_processing' | 'embedding_generation' | 'similarity_calculation', payload: any, priority: number = 1): void {
    this.backgroundProcessingManager.addBackgroundTask(type, payload, priority);
  }


  // Get cached vector similarity with background calculation
  private getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    const cached = this.cacheManager.getCachedSimilarity(vectorA, vectorB);
    
    if (cached !== null) {
      return cached;
    }
    
    // Schedule background calculation if not cached
    const cacheKey = createSimilarityCacheKey(vectorA, vectorB);
    this.backgroundProcessingManager.addBackgroundTask('similarity_calculation', {
      vectorA, vectorB, cacheKey
    }, 2);
    
    return null;
  }

  // Fast semantic deduplication using imported utility
  private generateSemanticHash(message: string): string {
    return generateSemanticHash(message);
  }

  private async checkSemanticDuplicate(userId: number, semanticHash: string): Promise<boolean> {
    try {
      const existing = await db
        .select({ id: memoryEntries.id })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          sql`${memoryEntries.content} ILIKE '%' || ${semanticHash.slice(0, 8)} || '%'`,
          eq(memoryEntries.isActive, true)
        ))
        .limit(1);

      return existing.length > 0;
    } catch (error) {
      console.error('[MemoryService] Duplicate check failed:', error);
      return false;
    }
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
    try {
      const embedding = await this.generateEmbedding(content);
      
      const memoryData: InsertMemoryEntry = {
        userId,
        content,
        category: options.category,
        labels: options.labels || [],
        importanceScore: options.importance_score,
        keywords: options.keywords || [],
        embedding: JSON.stringify(embedding),
        sourceConversationId: options.sourceConversationId || null,
        sourceMessageId: options.sourceMessageId || null,
      };

      const [memory] = await db.insert(memoryEntries).values(memoryData).returning();
      return memory;
    } catch (error) {
      console.error('Error saving memory entry:', error);
      return null;
    }
  }

  // Calculate cosine similarity between two vectors
  // Tier 3 A: Use Go service for performance-critical similarity calculations
  async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    // Try Go service first for better performance
    if (goMemoryService.isAvailable() && a.length > 100) {
      try {
        return await goMemoryService.calculateCosineSimilarity(a, b);
      } catch (error) {
        console.warn('[MemoryService] Go service fallback to TypeScript implementation:', error);
      }
    }
    
    // Fallback to TypeScript implementation
    return this.cosineSimilaritySync(a, b);
  }

  // Synchronous cosine similarity using imported utility
  cosineSimilaritySync(a: number[], b: number[]): number {
    return cosineSimilaritySync(a, b);
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
    try {
      const accessLogs: InsertMemoryAccessLog[] = memories.map(memory => ({
        memoryEntryId: memory.id,
        conversationId: conversationId || null,
        relevanceScore: memory.relevanceScore,
        usedInResponse,
      }));

      if (accessLogs.length > 0) {
        await db.insert(memoryAccessLog).values(accessLogs);

        // Update access count and last accessed timestamp
        for (const memory of memories) {
          await db
            .update(memoryEntries)
            .set({ 
              accessCount: sql`${memoryEntries.accessCount} + 1`,
              lastAccessed: new Date()
            })
            .where(eq(memoryEntries.id, memory.id));
        }
      }
    } catch (error) {
      logger.error('Error logging memory usage', error as Error, { service: 'memory' });
    }
  }

  // Build system prompt with relevant memories
  buildSystemPromptWithMemories(memories: RelevantMemory[], basePersona?: string): string {
    return buildSystemPromptWithMemories(memories, basePersona);
  }

  // Tier 2 C: Optimized user memories with caching and filtering
  async getUserMemories(userId: number, category?: MemoryCategory): Promise<MemoryEntry[]> {
    try {
      // Force fresh data by bypassing cache
      const allMemories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.importanceScore));

      // Apply category filter if specified
      let filteredMemories = allMemories;
      if (category) {
        filteredMemories = allMemories.filter((memory: any) => memory.category === category);
      }

      // Map and sort memories using utility functions
      const sortedMemories = mapAndSortMemories(filteredMemories);
      
      logger.memory('getUserMemories', { userId, count: sortedMemories.length });
      return sortedMemories;
    } catch (error) {
      logger.error('Error getting user memories', error as Error, { service: 'memory' });
      return [];
    }
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
    try {
      const { page, limit, offset, category } = options;
      
      // Build optimized query with database-level filtering and pagination
      let query = db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true),
          ...(category ? [eq(memoryEntries.category, category)] : [])
        ))
        .orderBy(desc(memoryEntries.importanceScore), desc(memoryEntries.createdAt));

      // Get total count for pagination info
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true),
          ...(category ? [eq(memoryEntries.category, category)] : [])
        ));

      // Execute both queries in parallel for better performance
      const [memories, countResult] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
      ]);

      const totalCount = countResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = offset + limit < totalCount;

      // Map database fields to frontend expected format
      const mappedMemories = memories.map(mapMemoryFields);

      logger.memory('getUserMemoriesPaginated', { 
        userId, 
        count: mappedMemories.length 
      });

      return {
        memories: mappedMemories,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore
        }
      };
    } catch (error) {
      logger.error('Error getting paginated user memories', error as Error, { service: 'memory' });
      return {
        memories: [],
        pagination: {
          page: options.page,
          limit: options.limit,
          totalCount: 0,
          totalPages: 0,
          hasMore: false
        }
      };
    }
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
    try {
      // Run optimized parallel queries for better performance
      const [categoryCounts, recentMemories, qualityMetrics] = await Promise.all([
        // Get category counts with single aggregation query
        db
          .select({
            category: memoryEntries.category,
            count: sql<number>`count(*)`
          })
          .from(memoryEntries)
          .where(and(
            eq(memoryEntries.userId, userId),
            eq(memoryEntries.isActive, true)
          ))
          .groupBy(memoryEntries.category),
        
        // Get only the 3 most recent memories
        db
          .select({
            id: memoryEntries.id,
            content: memoryEntries.content,
            category: memoryEntries.category,
            createdAt: memoryEntries.createdAt
          })
          .from(memoryEntries)
          .where(and(
            eq(memoryEntries.userId, userId),
            eq(memoryEntries.isActive, true)
          ))
          .orderBy(desc(memoryEntries.createdAt))
          .limit(3),
        
        // Get quality metrics
        this.qualityService.getMemoryQualityMetrics(userId)
      ]);

      // Process category counts
      const categories: Record<string, number> = {
        preferences: 0,
        personal_context: 0,
        instructions: 0,
        food_diet: 0,
        goals: 0
      };

      let total = 0;
      for (const categoryCount of categoryCounts) {
        const count = Number(categoryCount.count);
        categories[categoryCount.category] = count;
        total += count;
      }

      // Process recent memories with truncated content
      const processedRecentMemories = processRecentMemoriesForOverview(recentMemories);

      logger.memory('getMemoryOverviewOptimized', { userId, count: processedRecentMemories.length });

      return {
        total,
        categories,
        recentMemories: processedRecentMemories,
        qualityMetrics: {
          qualityScore: qualityMetrics.qualityScore,
          duplicateRate: qualityMetrics.duplicateRate,
          potentialDuplicates: qualityMetrics.potentialDuplicates,
          averageImportanceScore: qualityMetrics.averageImportanceScore,
          averageFreshness: qualityMetrics.averageFreshness
        }
      };
    } catch (error) {
      logger.error('Error getting optimized memory overview', error as Error, { service: 'memory' });
      return {
        total: 0,
        categories: {
          preferences: 0,
          personal_context: 0,
          instructions: 0,
          food_diet: 0,
          goals: 0
        },
        recentMemories: [],
        qualityMetrics: {
          qualityScore: 0,
          duplicateRate: 0,
          potentialDuplicates: 0,
          averageImportanceScore: 0,
          averageFreshness: 0
        }
      };
    }
  }

  // Memory Quality Metrics
  async getMemoryQualityMetrics(userId: number): Promise<MemoryQualityMetrics> {
    return this.qualityService.getMemoryQualityMetrics(userId);
  }


  // Tier 2 C: Delete memory with optimized cache invalidation
  async deleteMemory(memoryId: string, userId: number): Promise<boolean> {
    try {
      const [deleted] = await db
        .update(memoryEntries)
        .set({ isActive: false })
        .where(and(
          eq(memoryEntries.id, memoryId),
          eq(memoryEntries.userId, userId)
        ))
        .returning();

      if (deleted) {
        // Clear user cache
        this.cacheManager.clearUserCache(userId);
        
        logger.debug(`Memory ${memoryId} marked as inactive and cache cleared`, { service: 'memory' });
      }

      return !!deleted;
    } catch (error) {
      logger.error('Error deleting memory', error as Error, { service: 'memory' });
      return false;
    }
  }

  // Get memory service performance stats
  getPerformanceStats(): {
    backgroundQueueSize: number;
    activeCaches: number;
    pendingUpdates: number;
    cacheHitRate: string;
  } {
    return this.backgroundProcessingManager.getPerformanceStats();
  }

  // Force cache cleanup for memory management
  forceCacheCleanup(): void {
    this.cacheManager.forceCacheCleanup();
  }

  // Preload user memories for better performance
  async preloadUserMemories(userId: number): Promise<void> {
    try {
      await this.getUserMemories(userId);
      console.log(`[MemoryService] Preloaded memories for user ${userId}`);
    } catch (error) {
      console.error('[MemoryService] Failed to preload user memories:', error);
    }
  }
}

export const memoryService = new MemoryService();