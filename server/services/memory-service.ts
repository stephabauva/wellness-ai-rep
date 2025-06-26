import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
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
import { cacheService } from './cache-service';
import { goMemoryService } from './go-memory-service';
import { logger } from './logger-service';

interface MemoryDetectionResult {
  shouldRemember: boolean;
  category: MemoryCategory;
  importance: number;
  extractedInfo: string;
  keywords: string[];
  reasoning: string;
}

interface RelevantMemory extends MemoryEntry {
  relevanceScore: number;
  retrievalReason: string;
}

interface BackgroundTask {
  id: string;
  type: 'memory_processing' | 'embedding_generation' | 'similarity_calculation';
  payload: any;
  priority: number;
  createdAt: Date;
}

interface MemoryProcessingQueue {
  tasks: BackgroundTask[];
  processing: boolean;
}

class MemoryService {
  private openai: OpenAI;
  private google: GoogleGenerativeAI;
  
  // Tier 2 C: Background processing queue
  private backgroundQueue: MemoryProcessingQueue = {
    tasks: [],
    processing: false
  };
  
  // Tier 2 C: Debounced update registry
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Tier 2 C: Lazy loading cache for user memories
  private userMemoryCache: Map<string, { memories: MemoryEntry[], lastFetch: Date }> = new Map();
  
  // Tier 2 C: Vector similarity cache
  private similarityCache: Map<string, { score: number, timestamp: Date }> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.google = new GoogleGenerativeAI(
      process.env.GOOGLE_API_KEY || ''
    );
    
    // Start background processing
    this.initializeBackgroundProcessor();
  }

  // Tier 2 C: Initialize background processor
  private initializeBackgroundProcessor(): void {
    logger.debug('Initializing background processor', { service: 'memory' });
    
    setInterval(() => {
      if (this.backgroundQueue.tasks.length > 10) {
        logger.warn(`Background queue growing large: ${this.backgroundQueue.tasks.length} tasks`, { service: 'memory' });
      }
      this.processBackgroundQueue();
    }, 5000); // Process queue every 5 seconds
    
    // Cleanup old cache entries every 30 minutes
    setInterval(() => {
      this.cleanupExpiredCaches();
    }, 30 * 60 * 1000);
  }

  // Tier 2 C: Process background tasks queue
  private async processBackgroundQueue(): Promise<void> {
    if (this.backgroundQueue.processing || this.backgroundQueue.tasks.length === 0) {
      return;
    }

    this.backgroundQueue.processing = true;
    
    try {
      // Sort by priority (higher numbers = higher priority)
      this.backgroundQueue.tasks.sort((a, b) => b.priority - a.priority);
      
      const task = this.backgroundQueue.tasks.shift();
      if (!task) return;

      console.log(`[MemoryService] Processing background task: ${task.type}`);
      
      switch (task.type) {
        case 'memory_processing':
          await this.processBackgroundMemoryTask(task.payload);
          break;
        case 'embedding_generation':
          await this.processBackgroundEmbeddingTask(task.payload);
          break;
        case 'similarity_calculation':
          await this.processBackgroundSimilarityTask(task.payload);
          break;
      }
    } catch (error) {
      console.error('[MemoryService] Background task processing error:', error);
    } finally {
      this.backgroundQueue.processing = false;
    }
  }

  // Tier 2 C: Add task to background queue
  private addBackgroundTask(type: BackgroundTask['type'], payload: any, priority: number = 1): void {
    const task: BackgroundTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority,
      createdAt: new Date()
    };
    
    this.backgroundQueue.tasks.push(task);
  }

  // Tier 2 C: Cleanup expired cache entries
  private cleanupExpiredCaches(): void {
    const now = new Date();
    const cacheExpiry = 60 * 60 * 1000; // 1 hour
    
    // Clean user memory cache
    Array.from(this.userMemoryCache.entries()).forEach(([key, value]) => {
      if (now.getTime() - value.lastFetch.getTime() > cacheExpiry) {
        this.userMemoryCache.delete(key);
      }
    });
    
    // Clean similarity cache
    Array.from(this.similarityCache.entries()).forEach(([key, value]) => {
      if (now.getTime() - value.timestamp.getTime() > cacheExpiry) {
        this.similarityCache.delete(key);
      }
    });
    
    console.log(`[MemoryService] Cache cleanup completed. Active caches: ${this.userMemoryCache.size + this.similarityCache.size}`);
  }

  // Tier 2 C: Background memory processing task with ChatGPT deduplication
  private async processBackgroundMemoryTask(payload: any): Promise<void> {
    const { userId, message, conversationId, messageId, conversationHistory } = payload;
    
    try {
      console.log(`[MemoryService] Processing background memory task with ChatGPT deduplication for user ${userId}, message: "${message.substring(0, 50)}..."`);
      
      // Use ChatGPT deduplication system for enhanced memory processing
      const { ChatGPTMemoryEnhancement } = await import('./chatgpt-memory-enhancement.js');
      const chatGPTMemoryEnhancement = new ChatGPTMemoryEnhancement();
      
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
      this.invalidateUserMemoryCache(userId, 100); // Fast invalidation
      
      // Force immediate cache cleanup to ensure fresh data
      this.forceCacheCleanup();
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
            importance_score: autoDetection.importance,
            sourceConversationId: validConversationId,
            sourceMessageId: messageId,
            keywords: autoDetection.keywords,
          });
          
          if (savedMemory) {
            logger.debug(`Fallback memory saved: ${savedMemory.id}`, { service: 'memory' });
            this.invalidateUserMemoryCache(userId, 100);
            this.forceCacheCleanup();
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
      this.similarityCache.set(cacheKey, {
        score: similarity,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[MemoryService] Background similarity calculation failed:', error);
    }
  }

  // Tier 2 C: Debounced cache invalidation
  private invalidateUserMemoryCache(userId: number, delay: number = 2000): void {
    const key = `user-memory-${userId}`;
    
    // Clear existing timer
    const existingTimer = this.updateTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new debounced timer
    const timer = setTimeout(() => {
      this.userMemoryCache.delete(key);
      this.updateTimers.delete(key);
      logger.debug(`Invalidated memory cache for user ${userId}`, { service: 'memory' });
    }, delay);
    
    this.updateTimers.set(key, timer);
  }

  // Tier 2 C: Get cached vector similarity with background calculation
  private getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    const cacheKey = this.createSimilarityCacheKey(vectorA, vectorB);
    const cached = this.similarityCache.get(cacheKey);
    
    if (cached) {
      // Check if cache is still valid (1 hour)
      const maxAge = 60 * 60 * 1000;
      if (Date.now() - cached.timestamp.getTime() < maxAge) {
        return cached.score;
      } else {
        this.similarityCache.delete(cacheKey);
      }
    }
    
    // Schedule background calculation if not cached
    this.addBackgroundTask('similarity_calculation', {
      vectorA, vectorB, cacheKey
    }, 2);
    
    return null;
  }

  // Tier 2 C: Create similarity cache key
  private createSimilarityCacheKey(vectorA: number[], vectorB: number[]): string {
    // Create a hash-like key from vector data
    const hashA = vectorA.slice(0, 10).map(v => Math.round(v * 1000)).join(',');
    const hashB = vectorB.slice(0, 10).map(v => Math.round(v * 1000)).join(',');
    return `sim-${hashA}-${hashB}`;
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

  // AI-powered detection of memory-worthy content
  async detectMemoryWorthy(message: string, conversationHistory: any[] = []): Promise<MemoryDetectionResult> {
    const prompt = `Analyze this wellness coaching conversation message and determine if it contains information worth remembering for future coaching sessions.

Look for:
1. Personal health preferences (workout types, dietary restrictions, preferred activities) - category: "preference"
2. Important personal information (health conditions, goals, lifestyle) - category: "personal_info"
3. Significant health context that might be referenced later - category: "context"
4. User instructions or coaching preferences - category: "instruction"
5. Corrections to previous information
6. Progress milestones or achievements

Message: "${message}"

Previous context: ${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

IMPORTANT: Use these exact categories:
- "preference" for likes, dislikes, workout preferences, food preferences
- "personal_info" for health conditions, allergies, medical information
- "context" for situational information, progress updates, life circumstances
- "instruction" for specific coaching instructions and rules

Respond with JSON:
{
    "shouldRemember": boolean,
    "category": "preference|personal_info|context|instruction",
    "importance": 0.0-1.0,
    "extractedInfo": "clean version of the information to remember",
    "keywords": ["keyword1", "keyword2", ...],
    "reasoning": "why this should/shouldn't be remembered"
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('[MemoryService] Memory detection (detectMemoryWorthy) timed out after 45 seconds for message processing.');
        controller.abort();
    }, 45000); // 45 seconds

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
        // Removed incorrect 'timeout: 4000'
      }, { signal: controller.signal }); // Pass signal here
      clearTimeout(timeoutId); // Clear the timeout if the request completes/fails sooner

      let content = response.choices[0].message.content || '{}';
      // Clean up markdown formatting if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Extract JSON from text if needed
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const result = JSON.parse(content);
      return {
        shouldRemember: result.shouldRemember || false,
        category: result.category || 'context',
        importance: result.importance || 0.5,
        extractedInfo: result.extractedInfo || '',
        keywords: result.keywords || [],
        reasoning: result.reasoning || ''
      };
    } catch (error) {
      console.error('Timeout or error in memory detection:', error);
      return {
        shouldRemember: false,
        category: 'context',
        importance: 0.0,
        extractedInfo: '',
        keywords: [],
        reasoning: 'Error in AI processing'
      };
    }
  }

  // Generate embeddings for semantic search with caching
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = await cacheService.getEmbedding(text);
    if (cached && cached.embedding.length > 0) {
      return cached.embedding;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('[MemoryService] Embedding generation (generateEmbedding) timed out after 45 seconds.');
        controller.abort();
    }, 45000); // 45 seconds

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        // Removed incorrect 'timeout: 4000'
      }, { signal: controller.signal }); // Pass signal here
      clearTimeout(timeoutId); // Clear the timeout
      
      const embedding = response.data[0].embedding;
      
      // Cache the embedding for future use
      cacheService.setEmbedding(text, embedding, 'text-embedding-3-small');
      
      return embedding;
    } catch (error) {
      console.error('Timeout or error generating embedding:', error);
      return [];
    }
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

  // Synchronous cosine similarity for fallback and small vectors
  cosineSimilaritySync(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Tier 2 C: Lazy loading for user memories with caching
  private async getUserMemoriesLazy(userId: number): Promise<MemoryEntry[]> {
    const cacheKey = `user-memory-${userId}`;
    const cached = this.userMemoryCache.get(cacheKey);
    
    // Return cached memories if fresh (within 30 minutes)
    if (cached && (Date.now() - cached.lastFetch.getTime()) < 30 * 60 * 1000) {
      return cached.memories;
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
    this.userMemoryCache.set(cacheKey, {
      memories,
      lastFetch: new Date()
    });
    
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

      // Skip cache for debugging
      // const cached = await cacheService.getMemorySearchResults(userId, context, 10);
      // if (cached) {
      //   return cached as RelevantMemory[];
      // }

      // Get user memories directly for debugging
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
          category: 'instruction',
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
          
          // Tier 2 C: Debounced cache invalidation for immediate updates
          this.invalidateUserMemoryCache(userId, 500); // Faster invalidation for explicit saves
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
        conversationId,
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
      console.log(`[MemoryService] Getting memories for user ${userId}, category: ${category}`);
      
      // Force fresh data by bypassing cache
      const allMemories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.importanceScore));
      
      console.log(`[MemoryService] Retrieved ${allMemories.length} memories from database`);

      // Apply category filter if specified
      let filteredMemories = allMemories;
      if (category) {
        filteredMemories = allMemories.filter(memory => memory.category === category);
        console.log(`[MemoryService] Filtered to ${filteredMemories.length} memories for category ${category}`);
      }

      // Map database fields to frontend expected format
      const mappedMemories = filteredMemories.map(memory => ({
        ...memory,
        importanceScore: memory.importanceScore,
        accessCount: memory.accessCount || 0,
        lastAccessed: memory.lastAccessed || memory.createdAt,
        createdAt: memory.createdAt,
        keywords: memory.keywords || []
      }));

      // Sort by importance and creation date
      const sortedMemories = mappedMemories.sort((a, b) => {
        if (a.importanceScore !== b.importanceScore) {
          return b.importanceScore - a.importanceScore;
        }
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      console.log(`[MemoryService] Returning ${sortedMemories.length} sorted memories`);
      return sortedMemories;
    } catch (error) {
      console.error('Error getting user memories:', error);
      return [];
    }
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
        // Immediate cache invalidation
        const cacheKey = `user-memory-${userId}`;
        this.userMemoryCache.delete(cacheKey);
        
        // Clear related cache entries
        cacheService.clearMemorySearchResults(userId);
        
        console.log(`[MemoryService] Memory ${memoryId} marked as inactive and cache cleared`);
      }

      return !!deleted;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
  }

  // Tier 2 C: Get memory service performance stats
  getPerformanceStats(): {
    backgroundQueueSize: number;
    activeCaches: number;
    pendingUpdates: number;
    cacheHitRate: string;
  } {
    return {
      backgroundQueueSize: this.backgroundQueue.tasks.length,
      activeCaches: this.userMemoryCache.size + this.similarityCache.size,
      pendingUpdates: this.updateTimers.size,
      cacheHitRate: `${Math.round((this.userMemoryCache.size / (this.userMemoryCache.size + 1)) * 100)}%`
    };
  }

  // Tier 2 C: Force cache cleanup for memory management
  forceCacheCleanup(): void {
    this.cleanupExpiredCaches();
  }

  // Tier 2 C: Preload user memories for better performance
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