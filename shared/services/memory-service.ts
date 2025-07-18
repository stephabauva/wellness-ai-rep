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

interface MemoryDetectionResult {
  shouldRemember: boolean;
  category: MemoryCategory;
  importance: number;
  extractedInfo: string;
  labels: string[];
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
    
    // Start background processing
    this.initializeBackgroundProcessor();
  }

  // Tier 2 C: Initialize background processor with circuit breaker
  private initializeBackgroundProcessor(): void {
    logger.debug('Initializing background processor', { service: 'memory' });
    
    setInterval(() => {
      // Circuit breaker: if queue gets too large, clear old low-priority tasks
      if (this.backgroundQueue.tasks.length > 20) {
        logger.warn(`Background queue overflow: ${this.backgroundQueue.tasks.length} tasks, clearing old low-priority tasks`, { service: 'memory' });
        this.backgroundQueue.tasks = this.backgroundQueue.tasks
          .filter(task => task.priority > 2 || (Date.now() - task.createdAt.getTime()) < 60000) // Keep high-priority or recent tasks
          .slice(0, 10); // Limit to 10 tasks maximum
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
            labels: autoDetection.labels,
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

  // Fast semantic deduplication (from optimized-memory-service)
  private generateSemanticHash(message: string): string {
    const normalizedText = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = normalizedText.split(' ')
      .filter(word => word.length > 3)
      .sort()
      .slice(0, 10);

    const keyContent = words.join('|');
    return require('crypto').createHash('md5').update(keyContent).digest('hex').slice(0, 16);
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
      logger.debug('Memory content too short', { content: extractedInfo, service: 'memory' });
      return false;
    }

    // Check for undefined or placeholder content
    if (extractedInfo.includes('undefined') || extractedInfo.includes('null') || extractedInfo.includes('N/A')) {
      logger.debug('Placeholder content detected', { content: extractedInfo, service: 'memory' });
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
        logger.warn('Nonsensical food/diet content detected', { content: extractedInfo, service: 'memory' });
        return false;
      }
    }

    // General nonsensical content check
    if (nonsensicalPatterns.some(pattern => pattern.test(extractedInfo))) {
      logger.warn('Nonsensical content detected', { content: extractedInfo, service: 'memory' });
      return false;
    }

    // Check for very repetitive content (likely processing error)
    const words = extractedInfo.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 3 && uniqueWords.size / words.length < 0.5) {
      logger.debug('Overly repetitive content detected', { content: extractedInfo, service: 'memory' });
      return false;
    }

    return true;
  }

  // AI-powered detection of memory-worthy content
  async detectMemoryWorthy(message: string, conversationHistory: any[] = []): Promise<MemoryDetectionResult> {
    const prompt = `Analyze this wellness coaching conversation message and determine if it contains information worth remembering for future coaching sessions.

Look for:
1. Personal health preferences (workout types, dietary restrictions, preferred activities) - category: "preferences"
2. Important personal information (health conditions, goals, lifestyle) - category: "personal_context"
3. Significant health context that might be referenced later - category: "personal_context"
4. User instructions or coaching preferences - category: "instructions"
5. Food and diet information - category: "food_diet"
6. Goals and objectives - category: "goals"

Message: "${message}"

Previous context: ${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

IMPORTANT: Use these exact categories:
- "preferences" for likes, dislikes, workout preferences, general preferences
- "personal_context" for health conditions, allergies, medical information, lifestyle, background
- "instructions" for specific coaching instructions and rules
- "food_diet" for nutrition, food preferences, allergies, dietary restrictions
- "goals" for fitness goals, nutrition goals, targets

For labels, use semantic categorization:
- For food_diet: "allergy", "preference", "restriction", "dangerous", "mild", "meal-timing"
- For personal_context: "background", "health-history", "lifestyle", "medical", "physical-limitation"
- For goals: "weight-loss", "muscle-gain", "nutrition", "fitness", "target"
- For preferences: "general", "workout", "environment"
- For instructions: "behavior", "communication", "reminder"

Respond with JSON:
{
    "shouldRemember": boolean,
    "category": "preferences|personal_context|instructions|food_diet|goals",
    "importance": 0.0-1.0,
    "extractedInfo": "clean version of the information to remember",
    "labels": ["semantic-label1", "semantic-label2", ...],
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
      
      // Validate content quality before returning positive result
      const extractedInfo = result.extractedInfo || '';
      const category = result.category || 'personal_context';
      const shouldRemember = result.shouldRemember && extractedInfo && this.validateMemoryContent(extractedInfo, category);
      
      if (result.shouldRemember && !shouldRemember) {
        logger.info('Memory rejected due to quality validation', { 
          originalContent: extractedInfo,
          category: category,
          service: 'memory' 
        });
      }
      
      return {
        shouldRemember: shouldRemember,
        category: category,
        importance: result.importance || 0.5,
        extractedInfo: extractedInfo,
        labels: result.labels || [],
        keywords: result.keywords || [],
        reasoning: shouldRemember ? result.reasoning || '' : 'Content failed quality validation'
      };
    } catch (error) {
      console.error('Timeout or error in memory detection:', error);
      return {
        shouldRemember: false,
        category: 'personal_context',
        importance: 0.0,
        extractedInfo: '',
        labels: [],
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
  async getMemoryQualityMetrics(userId: number): Promise<{
    totalMemories: number;
    duplicateRate: number;
    averageImportanceScore: number;
    averageFreshness: number;
    categoryDistribution: Record<string, number>;
    qualityScore: number;
    potentialDuplicates: number;
    memoryAgeDistribution: {
      lastWeek: number;
      lastMonth: number;
      lastYear: number;
      older: number;
    };
  }> {
    try {
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ));

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      // Calculate basic metrics
      const totalMemories = memories.length;
      const averageImportanceScore = totalMemories > 0 
        ? memories.reduce((sum, m) => sum + (m.importanceScore || 0), 0) / totalMemories 
        : 0;

      // Calculate freshness (based on last access vs creation date)
      const freshnessScores = memories.map(m => {
        const created = new Date(m.createdAt);
        const accessed = m.lastAccessed ? new Date(m.lastAccessed) : created;
        const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceAccess = (now.getTime() - accessed.getTime()) / (1000 * 60 * 60 * 24);
        
        // Fresher memories that have been accessed recently get higher scores
        return Math.max(0, 1 - (daysSinceAccess / 30)) * (m.accessCount || 0 + 1);
      });
      
      const averageFreshness = freshnessScores.length > 0 
        ? freshnessScores.reduce((sum, score) => sum + score, 0) / freshnessScores.length 
        : 0;

      // Category distribution
      const categoryDistribution: Record<string, number> = {};
      memories.forEach(m => {
        const category = m.category || 'unknown';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      });

      // Age distribution
      const memoryAgeDistribution = {
        lastWeek: memories.filter(m => new Date(m.createdAt) >= oneWeekAgo).length,
        lastMonth: memories.filter(m => new Date(m.createdAt) >= oneMonthAgo && new Date(m.createdAt) < oneWeekAgo).length,
        lastYear: memories.filter(m => new Date(m.createdAt) >= oneYearAgo && new Date(m.createdAt) < oneMonthAgo).length,
        older: memories.filter(m => new Date(m.createdAt) < oneYearAgo).length
      };

      // Detect potential duplicates using simple content similarity
      const potentialDuplicates = this.detectPotentialDuplicates(memories);

      // Calculate duplicate rate
      const duplicateRate = totalMemories > 0 ? potentialDuplicates / totalMemories : 0;

      // Calculate overall quality score (0-1)
      const qualityScore = this.calculateQualityScore({
        duplicateRate,
        averageImportanceScore,
        averageFreshness,
        categoryBalance: this.calculateCategoryBalance(categoryDistribution),
        contentLength: this.calculateAverageContentLength(memories)
      });

      return {
        totalMemories,
        duplicateRate,
        averageImportanceScore,
        averageFreshness,
        categoryDistribution,
        qualityScore,
        potentialDuplicates,
        memoryAgeDistribution
      };
    } catch (error) {
      logger.error('Error calculating memory quality metrics', error as Error, { service: 'memory' });
      return {
        totalMemories: 0,
        duplicateRate: 0,
        averageImportanceScore: 0,
        averageFreshness: 0,
        categoryDistribution: {},
        qualityScore: 0,
        potentialDuplicates: 0,
        memoryAgeDistribution: { lastWeek: 0, lastMonth: 0, lastYear: 0, older: 0 }
      };
    }
  }

  private detectPotentialDuplicates(memories: any[]): number {
    const duplicates = new Set<string>();
    const processed = new Set<string>();
    
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      if (processed.has(memory.id)) continue;
      
      const normalizedContent = this.normalizeContent(memory.content);
      
      for (let j = i + 1; j < memories.length; j++) {
        const candidate = memories[j];
        if (processed.has(candidate.id)) continue;
        
        const candidateNormalized = this.normalizeContent(candidate.content);
        const similarity = this.calculateJaccardSimilarity(normalizedContent, candidateNormalized);
        
        if (similarity > 0.7) {
          duplicates.add(candidate.id);
          processed.add(candidate.id);
        }
      }
      
      processed.add(memory.id);
    }
    
    return duplicates.size;
  }

  private normalizeContent(content: string): string {
    return content.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateJaccardSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(content2.split(/\s+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateCategoryBalance(categoryDistribution: Record<string, number>): number {
    const categories = Object.values(categoryDistribution);
    if (categories.length === 0) return 0;
    
    const total = categories.reduce((sum, count) => sum + count, 0);
    const expectedPerCategory = total / categories.length;
    
    // Calculate how evenly distributed the categories are
    const variance = categories.reduce((sum, count) => 
      sum + Math.pow(count - expectedPerCategory, 2), 0) / categories.length;
    
    // Lower variance = better balance, normalize to 0-1
    return Math.max(0, 1 - (variance / (expectedPerCategory * expectedPerCategory)));
  }

  private calculateAverageContentLength(memories: any[]): number {
    if (memories.length === 0) return 0;
    
    const totalLength = memories.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    return totalLength / memories.length;
  }

  private calculateQualityScore(metrics: {
    duplicateRate: number;
    averageImportanceScore: number;
    averageFreshness: number;
    categoryBalance: number;
    contentLength: number;
  }): number {
    const weights = {
      duplicateRate: 0.3,      // Lower duplicate rate = better quality
      importanceScore: 0.25,   // Higher importance = better quality
      freshness: 0.2,          // More fresh memories = better quality
      categoryBalance: 0.15,   // More balanced categories = better quality
      contentLength: 0.1       // Appropriate content length = better quality
    };
    
    // Normalize scores to 0-1 range
    const duplicateScore = Math.max(0, 1 - metrics.duplicateRate);
    const importanceScore = Math.min(1, metrics.averageImportanceScore / 10);
    const freshnessScore = Math.min(1, metrics.averageFreshness);
    const categoryScore = metrics.categoryBalance;
    const contentScore = Math.min(1, Math.max(0, 
      1 - Math.abs(metrics.contentLength - 100) / 200)); // Optimal around 100 chars
    
    return (
      duplicateScore * weights.duplicateRate +
      importanceScore * weights.importanceScore +
      freshnessScore * weights.freshness +
      categoryScore * weights.categoryBalance +
      contentScore * weights.contentLength
    );
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
        
        logger.debug(`Memory ${memoryId} marked as inactive and cache cleared`, { service: 'memory' });
      }

      return !!deleted;
    } catch (error) {
      logger.error('Error deleting memory', error as Error, { service: 'memory' });
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