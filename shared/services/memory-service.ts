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
import { BackgroundProcessor, type BackgroundTask } from './memory/background-processor';
import { MemoryCache } from './memory/memory-cache';
import { AIMemoryDetector, type MemoryDetectionResult } from './memory/ai-detection';
import { EmbeddingService } from './memory/embedding-service';
import { MemoryQualityService, type MemoryQualityMetrics } from './memory/quality-metrics';

interface RelevantMemory extends MemoryEntry {
  relevanceScore: number;
  retrievalReason: string;
}


class MemoryService {
  private openai: OpenAI;
  private google: GoogleGenerativeAI;
  
  // Background processor and cache manager
  private backgroundProcessor: BackgroundProcessor;
  private memoryCache: MemoryCache;
  private aiDetector: AIMemoryDetector;
  private embeddingService: EmbeddingService;
  private qualityService: MemoryQualityService;
  
  // Optimized caching patterns from optimized-memory-service
  private deduplicationCache = new Map<string, string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

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
    
    // Initialize background processor with task handlers
    this.backgroundProcessor = new BackgroundProcessor({
      memory_processing: this.processBackgroundMemoryTask.bind(this),
      embedding_generation: this.processBackgroundEmbeddingTask.bind(this),
      similarity_calculation: this.processBackgroundSimilarityTask.bind(this)
    });
  }



  // Add task to background queue
  private addBackgroundTask(type: 'memory_processing' | 'embedding_generation' | 'similarity_calculation', payload: any, priority: number = 1): void {
    this.backgroundProcessor.addBackgroundTask(type, payload, priority);
  }


  // Tier 2 C: Background memory processing task with ChatGPT deduplication
  private async processBackgroundMemoryTask(payload: any): Promise<void> {
    const { userId, message, conversationId, messageId, conversationHistory } = payload;
    
    try {
      console.log(`[MemoryService] Processing background memory task with ChatGPT deduplication for user ${userId}, message: "${message.substring(0, 50)}..."`);
      
      // Use ChatGPT deduplication system for enhanced memory processing
      const { chatGPTMemoryEnhancement } = await import('./chatgpt-memory-enhancement.js');
      
      // Validate conversationId format - must be valid UUID or null  
      let validConversationId = conversationId;
      if (conversationId && typeof conversationId === 'string') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(conversationId)) {
          validConversationId = null;
        }
      }
      
      // Process with ChatGPT-style deduplication
      await chatGPTMemoryEnhancement.processWithDeduplication(
        userId,
        message,
        validConversationId || ''
      );
      
      console.log(`[MemoryService] ChatGPT deduplication processing completed for user ${userId}`);
      
      // Invalidate user memory cache immediately for real-time updates
      this.memoryCache.invalidateUserMemoryCache(userId, 100); // Fast invalidation
      
      // Force immediate cache cleanup to ensure fresh data
      this.memoryCache.forceCacheCleanup();
      logger.debug('Cache forcefully invalidated for immediate UI refresh', { service: 'memory' });
      
    } catch (error) {
      logger.error('ChatGPT deduplication processing failed, falling back to standard processing', error as Error, { service: 'memory' });
      
      // Fallback to original memory processing if deduplication fails
      try {
        const autoDetection = await this.detectMemoryWorthy(message, conversationHistory);
        
        if (autoDetection.shouldRemember) {
          // Validate conversationId format - must be valid UUID or null
          let validConversationId: string | undefined = undefined;
          if (conversationId && typeof conversationId === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(conversationId)) {
              validConversationId = conversationId;
            }
          }
          
          const savedMemory = await this.saveMemoryEntry(userId, autoDetection.extractedInfo, {
            category: autoDetection.category,
            labels: autoDetection.labels,
            importance_score: autoDetection.importance,
            sourceConversationId: validConversationId,
            sourceMessageId: messageId,
            keywords: autoDetection.keywords,
          });
          
          if (savedMemory) {
            logger.debug(`Fallback memory saved: ${savedMemory.id}`, { service: 'memory' });
            this.memoryCache.invalidateUserMemoryCache(userId, 100);
            this.memoryCache.forceCacheCleanup();
          }
        }
      } catch (fallbackError) {
        logger.error('Both ChatGPT and fallback memory processing failed', fallbackError as Error, { service: 'memory' });
      }
    }
  }

  // Tier 2 C: Background embedding generation task
  private async processBackgroundEmbeddingTask(payload: any): Promise<void> {
    const { text, cacheKey } = payload;
    
    try {
      const embedding = await this.generateEmbedding(text);
      if (embedding.length > 0) {
        cacheService.setEmbedding(cacheKey, embedding, 'text-embedding-3-small');
      }
    } catch (error) {
      console.error('[MemoryService] Background embedding generation failed:', error);
    }
  }

  // Tier 2 C: Background similarity calculation task
  private async processBackgroundSimilarityTask(payload: any): Promise<void> {
    const { vectorA, vectorB, cacheKey } = payload;
    
    try {
      const similarity = await this.cosineSimilarity(vectorA, vectorB);
      this.memoryCache.setCachedSimilarity(cacheKey, similarity);
    } catch (error) {
      console.error('[MemoryService] Background similarity calculation failed:', error);
    }
  }


  // Get cached vector similarity with background calculation
  private getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    const cacheKey = this.createSimilarityCacheKey(vectorA, vectorB);
    const cached = this.memoryCache.getCachedSimilarity(cacheKey);
    
    if (cached !== null) {
      return cached;
    }
    
    // Schedule background calculation if not cached
    this.addBackgroundTask('similarity_calculation', {
      vectorA, vectorB, cacheKey
    }, 2);
    
    return null;
  }

  // Tier 2 C: Create similarity cache key using imported utility
  private createSimilarityCacheKey(vectorA: number[], vectorB: number[]): string {
    return createSimilarityCacheKey(vectorA, vectorB);
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

  // Fast pattern-based memory detection (from optimized-memory-service)
  private detectMemoryWorthyFast(message: string): {
    shouldRemember: boolean;
    category: MemoryCategory;
    importance: number;
    extractedInfo: string;
    keywords: string[];
  } {
    const text = message.toLowerCase();
    
    const memoryPatterns = {
      goals: ['want to', 'goal is', 'trying to', 'hope to', 'plan to'],
      preferences: ['prefer', 'like', 'love', 'hate', 'dislike', 'enjoy'],
      constraints: ['cannot', 'can\'t', 'allergic', 'avoid', 'restrict'],
      health: ['weight', 'exercise', 'workout', 'diet', 'calories', 'steps']
    };

    let category: MemoryCategory = 'personal_context';
    let importance = 0.3;
    let shouldRemember = false;
    
    for (const [cat, patterns] of Object.entries(memoryPatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        shouldRemember = true;
        category = cat as MemoryCategory;
        importance = cat === 'goals' ? 0.9 : cat === 'constraints' ? 0.8 : 0.6;
        break;
      }
    }

    const words = message.split(/\s+/)
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase().replace(/[^\w]/g, ''));
    
    const keywords = [...new Set(words)].slice(0, 5);

    return {
      shouldRemember,
      category,
      importance,
      extractedInfo: message.trim(),
      keywords
    };
  }

  // Detect explicit memory triggers like "remember this" or "don't forget"
  detectExplicitMemoryTriggers(message: string): { type: string; content: string; confidence: number } | null {
    const explicitTriggers = [
      /remember\s+(?:that\s+)?(.+)/i,
      /save\s+(?:this\s+)?(?:to\s+memory\s*:?\s*)?(.+)/i,
      /don't\s+forget\s+(?:that\s+)?(.+)/i,
      /keep\s+in\s+mind\s+(?:that\s+)?(.+)/i,
      /note\s+(?:that\s+)?(.+)/i,
      /make\s+sure\s+(?:you\s+)?remember\s+(.+)/i,
    ];

    for (const trigger of explicitTriggers) {
      const match = message.match(trigger);
      if (match) {
        return {
          type: 'explicit_save',
          content: match[1].trim(),
          confidence: 0.95
        };
      }
    }
    return null;
  }

  // Validate memory content quality to prevent nonsensical memories
  private validateMemoryContent(extractedInfo: string, category: MemoryCategory): boolean {
    // Check for minimum content length
    if (!extractedInfo || extractedInfo.trim().length < 5) {
      logger.debug('Memory content too short', { service: 'memory' });
      return false;
    }

    // Check for undefined or placeholder content
    if (extractedInfo.includes('undefined') || extractedInfo.includes('null') || extractedInfo.includes('N/A')) {
      logger.debug('Placeholder content detected', { service: 'memory' });
      return false;
    }

    // Define nonsensical patterns
    const nonsensicalPatterns = [
      /eating water/i,
      /drinking food/i,
      /sleeping exercise/i,
      /running sleep/i,
      /breathing exercise.*food/i,
      /workout.*water.*drink/i
    ];

    // Category-specific validation
    if (category === 'food_diet') {
      const foodLogicPatterns = [
        /enjoys eating (water|air|nothing)/i,
        /likes drinking (solid|food)/i,
        /allergic to (water|air|breathing)/i,
        /prefers eating (impossible|contradictory)/i
      ];
      
      if (foodLogicPatterns.some(pattern => pattern.test(extractedInfo))) {
        logger.warn('Nonsensical food/diet content detected', { service: 'memory' });
        return false;
      }
    }

    // General nonsensical content check
    if (nonsensicalPatterns.some(pattern => pattern.test(extractedInfo))) {
      logger.warn('Nonsensical content detected', { service: 'memory' });
      return false;
    }

    // Check for very repetitive content (likely processing error)
    const words = extractedInfo.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 3 && uniqueWords.size / words.length < 0.5) {
      logger.debug('Overly repetitive content detected', { service: 'memory' });
      return false;
    }

    return true;
  }

  // AI-powered detection of memory-worthy content
  async detectMemoryWorthy(message: string, conversationHistory: any[] = []): Promise<MemoryDetectionResult> {
    return this.aiDetector.detectMemoryWorthy(message, conversationHistory, this.validateMemoryContent.bind(this));
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

  // Lazy loading for user memories with caching
  private async getUserMemoriesLazy(userId: number): Promise<MemoryEntry[]> {
    // Check cache first
    const cachedMemories = this.memoryCache.getCachedUserMemories(userId);
    if (cachedMemories) {
      return cachedMemories;
    }
    
    // Fetch from database
    const memories = await db
      .select()
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ))
      .orderBy(desc(memoryEntries.importanceScore));
    
    // Cache the results
    this.memoryCache.setCachedUserMemories(userId, memories);
    
    return memories;
  }

  // Retrieve relevant memories based on context
  async getContextualMemories(
    userId: number, 
    conversationHistory: any[], 
    currentMessage: string
  ): Promise<RelevantMemory[]> {
    try {
      console.log(`[MemoryService] getContextualMemories called for user ${userId}, message: "${currentMessage}"`);
      
      // Combine recent conversation + current message for context (current session only)
      const context = [
        ...conversationHistory.slice(-3),
        { role: 'user', content: currentMessage }
      ].map(m => m.content).join(' ');

      console.log(`[MemoryService] Context built: "${context}"`);

      // Attempt to retrieve from cache first
      const cached = await cacheService.getMemorySearchResults(userId, context, 10);
      if (cached) {
        logger.debug(`[MemoryService] Contextual memories cache hit for user ${userId}`, { service: 'memory' });
        return cached as RelevantMemory[];
      }
      logger.debug(`[MemoryService] Contextual memories cache miss for user ${userId}`, { service: 'memory' });

      // Get user memories directly
      const userMemories = await this.getUserMemoriesLazy(userId);

      // For memory-related queries, return ALL memories with basic scoring
      if (currentMessage.toLowerCase().includes('memor') || currentMessage.toLowerCase().includes('about me')) {
        logger.debug(`Memory query detected, returning all active memories`, { service: 'memory' });
        
        const allRelevantMemories: RelevantMemory[] = userMemories.map(memory => ({
          ...memory,
          relevanceScore: memory.importanceScore,
          retrievalReason: 'direct_memory_query'
        }));

        return allRelevantMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      // Generate embedding for current context
      const contextEmbedding = await this.generateEmbedding(context);

      // Calculate semantic similarity and create relevant memories
      const relevantMemories: RelevantMemory[] = [];

      for (const memory of userMemories) {
        if (!memory.embedding) {
          continue;
        }

        try {
          let memoryEmbedding;
          if (typeof memory.embedding === 'string') {
            memoryEmbedding = JSON.parse(memory.embedding);
          } else {
            memoryEmbedding = memory.embedding;
          }
          
          if (Array.isArray(memoryEmbedding) && memoryEmbedding.length > 0 && Array.isArray(contextEmbedding)) {
            // Use cached similarity if available
            let similarity = this.getCachedSimilarity(contextEmbedding, memoryEmbedding);
            
            // Fall back to calculation if not cached
            if (similarity === null) {
              similarity = await this.cosineSimilarity(contextEmbedding, memoryEmbedding);
            }
            
            // Debug logging only for high similarity
            if (similarity > 0.7) {
              logger.debug(`High similarity memory found: ${similarity.toFixed(3)}`, { service: 'memory' });
            }
            
            if (similarity > 0.5) { // Lowered threshold for better retrieval
              relevantMemories.push({
                ...memory,
                relevanceScore: similarity * memory.importanceScore,
                retrievalReason: 'semantic_similarity'
              });
            }
          }
        } catch (error) {
          logger.error(`Error parsing memory embedding for memory ${memory.id}`, error as Error, { service: 'memory' });
        }
      }

      // Always include high-importance memories (0.7+ instead of 0.8+)
      const importantMemories = userMemories
        .filter(m => m.importanceScore >= 0.7)
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

      // Add important memories that aren't already included
      for (const memory of importantMemories) {
        if (!relevantMemories.find(rm => rm.id === memory.id)) {
          relevantMemories.push({
            ...memory,
            relevanceScore: memory.importanceScore,
            retrievalReason: 'high_importance'
          });
        }
      }

      // Sort by relevance score and return top memories
      const results = relevantMemories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 8);
      
      logger.memory('memory retrieval', { userId, count: results.length });
      
      return results;
        
    } catch (error) {
      logger.error('Error retrieving contextual memories', error as Error, { service: 'memory' });
      return [];
    }
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
      const explicitTrigger = this.detectExplicitMemoryTriggers(message);
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
          this.memoryCache.invalidateUserMemoryCache(userId, 500); // Faster invalidation for explicit saves
        }
      }

      // Tier 2 C: Background processing for automatic memory detection
      // This prevents blocking the main response flow
      
      // Always queue background memory processing for user messages (messageId can be undefined during streaming)
      this.addBackgroundTask('memory_processing', {
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
    const persona = basePersona || "You are a helpful AI wellness coach. Provide personalized advice based on the conversation.";
    
    if (memories.length === 0) {
      return persona;
    }

    const memoryContext = memories.map(memory => 
      `- ${memory.content} (${memory.category}, importance: ${memory.importanceScore})`
    ).join('\n');

    return `${persona}

REMEMBERED INFORMATION ABOUT THIS USER:
${memoryContext}

Use this remembered information to personalize your responses naturally. Don't explicitly mention that you're using stored information unless directly relevant to the conversation.`;
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

      // Map database fields to frontend expected format
      const mappedMemories = filteredMemories.map((memory: any) => ({
        ...memory,
        importanceScore: memory.importanceScore,
        accessCount: memory.accessCount || 0,
        lastAccessed: memory.lastAccessed || memory.createdAt,
        createdAt: memory.createdAt,
        keywords: memory.keywords || []
      }));

      // Sort by importance and creation date
      const sortedMemories = mappedMemories.sort((a: any, b: any) => {
        if (a.importanceScore !== b.importanceScore) {
          return b.importanceScore - a.importanceScore;
        }
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      logger.memory('getUserMemories', { userId, count: sortedMemories.length });
      return sortedMemories;
    } catch (error) {
      logger.error('Error getting user memories', error as Error, { service: 'memory' });
      return [];
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
        this.memoryCache.clearUserCache(userId);
        
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
    const backgroundStats = this.backgroundProcessor.getPerformanceStats();
    const cacheStats = this.memoryCache.getCacheStats();
    
    return {
      ...backgroundStats,
      ...cacheStats
    };
  }

  // Force cache cleanup for memory management
  forceCacheCleanup(): void {
    this.memoryCache.forceCacheCleanup();
  }

  // Preload user memories for better performance
  async preloadUserMemories(userId: number): Promise<void> {
    try {
      await this.getUserMemoriesLazy(userId);
      console.log(`[MemoryService] Preloaded memories for user ${userId}`);
    } catch (error) {
      console.error('[MemoryService] Failed to preload user memories:', error);
    }
  }
}

export const memoryService = new MemoryService();