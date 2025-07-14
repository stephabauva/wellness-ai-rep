import { db } from "@shared/database/db";
import { memoryEntries, type InsertMemoryEntry, type MemoryEntry, type MemoryCategory } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { memoryService } from '@shared/services/memory-service';
import crypto from 'crypto';

interface RelevantMemory extends MemoryEntry {
  relevanceScore: number;
  retrievalReason: string;
}

interface DeduplicationResult {
  action: 'skip' | 'merge' | 'update' | 'create';
  existingMemoryId?: string;
  confidence: number;
  reasoning: string;
}

/**
 * ChatGPT Memory Enhancement Service
 * Implements Phase 1: Core Memory Enhancement with real-time deduplication
 * and memory-enhanced system prompts following ChatGPT's approach
 */
export class ChatGPTMemoryEnhancement {
  private deduplicationCache = new Map<string, string>();
  private processingPromises = new Map<string, Promise<void>>();
  
  // Performance optimization caches
  private embeddingCache = new Map<string, number[]>();
  private promptCache = new Map<string, string>();
  private memoryRetrievalCache = new Map<string, RelevantMemory[]>();
  
  // Cache TTL in milliseconds (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private cacheTimestamps = new Map<string, number>();

  /**
   * Process message with ChatGPT-style deduplication
   * Runs in parallel with chat response for optimal performance
   */
  async processWithDeduplication(
    userId: number,
    message: string,
    conversationId: string
  ): Promise<void> {
    const processingKey = `${userId}-${Date.now()}`;
    
    // Prevent duplicate processing of the same message
    if (this.processingPromises.has(processingKey)) {
      return this.processingPromises.get(processingKey);
    }

    const processingPromise = this.performDeduplicationProcess(userId, message, conversationId);
    this.processingPromises.set(processingKey, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingPromises.delete(processingKey);
    }
  }

  /**
   * Build enhanced system prompt with relevant memories (ChatGPT style) - optimized with caching
   */
  async buildEnhancedSystemPrompt(
    userId: number, 
    currentMessage: string
  ): Promise<string> {
    const promptCacheKey = `prompt_${userId}_${crypto.createHash('md5').update(currentMessage.toLowerCase().trim()).digest('hex')}`;
    
    // Check cache first
    if (this.promptCache.has(promptCacheKey) && this.isCacheValid(promptCacheKey)) {
      return this.promptCache.get(promptCacheKey)!;
    }

    try {
      // Check memory retrieval cache
      const memoryCacheKey = `memories_${userId}_${crypto.createHash('md5').update(currentMessage.toLowerCase().trim()).digest('hex')}`;
      let relevantMemories: RelevantMemory[];
      
      if (this.memoryRetrievalCache.has(memoryCacheKey) && this.isCacheValid(memoryCacheKey)) {
        relevantMemories = this.memoryRetrievalCache.get(memoryCacheKey)!;
      } else {
        // Use existing contextual memory retrieval with enhanced parameters
        relevantMemories = await memoryService.getContextualMemories(
          userId, 
          [], 
          currentMessage
        );
        
        // Cache the memories
        this.memoryRetrievalCache.set(memoryCacheKey, relevantMemories);
        this.cacheTimestamps.set(memoryCacheKey, Date.now());
      }

      let prompt: string;
      if (relevantMemories.length === 0) {
        prompt = "You are a helpful AI wellness coach.";
      } else {
        // Build memory context in ChatGPT style
        const memoryContext = this.buildMemoryContext(relevantMemories);
        
        prompt = `You are a helpful AI wellness coach. Consider this context about the user:

${memoryContext}

Use this information naturally in your responses to provide personalized guidance. Do not explicitly mention that you're referencing stored information.`;
      }
      
      // Cache the prompt
      this.promptCache.set(promptCacheKey, prompt);
      this.cacheTimestamps.set(promptCacheKey, Date.now());
      
      return prompt;

    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Error building enhanced prompt:', error);
      return "You are a helpful AI wellness coach.";
    }
  }

  /**
   * Perform the actual deduplication process
   */
  private async performDeduplicationProcess(
    userId: number,
    message: string,
    conversationId: string
  ): Promise<void> {
    try {
      // Generate semantic hash for fast duplicate detection
      const semanticHash = await this.generateSemanticHash(message);
      
      // Check for existing duplicate
      const deduplicationResult = await this.checkSemanticDuplicate(userId, semanticHash, message);
      
      if (deduplicationResult.action === 'skip') {
        console.log(`[ChatGPTMemoryEnhancement] Skipping duplicate memory: ${deduplicationResult.reasoning}`);
        return;
      }

      // Use existing memory detection logic
      const detection = await memoryService.detectMemoryWorthy(message);
      
      if (!detection.shouldRemember) {
        return;
      }

      // Handle different deduplication actions
      switch (deduplicationResult.action) {
        case 'create':
          // Generate proper UUID for conversation ID if test format
          const validConversationId = conversationId.startsWith('test-') 
            ? crypto.randomUUID() 
            : conversationId;
          await this.createNewMemory(userId, detection, validConversationId, semanticHash);
          break;
        case 'update':
          await this.updateExistingMemory(deduplicationResult.existingMemoryId!, detection);
          break;
        case 'merge':
          await this.mergeWithExistingMemory(deduplicationResult.existingMemoryId!, detection);
          break;
      }

    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Processing error:', error);
      // Fallback to existing memory processing
      await memoryService.processMessageForMemory(userId, message, conversationId, 0);
    }
  }

  /**
   * Generate semantic hash for deduplication using embedding-based approach
   */
  public async generateSemanticHash(message: string): Promise<string> {
    const normalizedMessage = message.toLowerCase().trim();
    const contentHash = crypto.createHash('md5').update(normalizedMessage).digest('hex');
    const cacheKey = `hash_${contentHash}`;
    
    // Check cache first for immediate return
    if (this.deduplicationCache.has(cacheKey)) {
      return this.deduplicationCache.get(cacheKey)!;
    }

    try {
      // Use embedding-based approach for better semantic similarity
      const embedding = await memoryService.generateEmbedding(normalizedMessage);
      
      // Create hash from first 50 embedding dimensions for semantic similarity
      const embeddingHash = crypto.createHash('sha256')
        .update(embedding.slice(0, 50).join(','))
        .digest('hex').slice(0, 32);
      
      // Cache the hash for future use
      this.deduplicationCache.set(cacheKey, embeddingHash);
      
      return embeddingHash;
    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Embedding generation failed, falling back to content hash:', error);
      
      // Fallback to content-based hash if embedding fails
      const fallbackHash = crypto.createHash('sha256').update(normalizedMessage).digest('hex').slice(0, 32);
      this.deduplicationCache.set(cacheKey, fallbackHash);
      
      return fallbackHash;
    }
  }

  /**
   * Check for semantic duplicates - optimized for performance
   */
  private async checkSemanticDuplicate(
    userId: number, 
    semanticHash: string,
    messageContent: string
  ): Promise<DeduplicationResult> {
    try {
      // Check cache first
      const cacheKey = `${userId}-${semanticHash}`;
      if (this.deduplicationCache.has(cacheKey)) {
        return {
          action: 'skip',
          existingMemoryId: this.deduplicationCache.get(cacheKey),
          confidence: 1.0,
          reasoning: 'Found in deduplication cache'
        };
      }

      // Single optimized database query for exact semantic hash match
      const exactMatch = await db
        .select({ id: memoryEntries.id })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.semanticHash, semanticHash),
          eq(memoryEntries.isActive, true)
        ))
        .limit(1);

      if (exactMatch.length > 0) {
        this.deduplicationCache.set(cacheKey, exactMatch[0].id);
        return {
          action: 'skip',
          existingMemoryId: exactMatch[0].id,
          confidence: 1.0,
          reasoning: 'Exact semantic hash match found'
        };
      }

      // Fast similarity check using lightweight content comparison
      const contentHash = crypto.createHash('md5').update(messageContent.toLowerCase().trim()).digest('hex');
      const contentCacheKey = `content_${userId}_${contentHash}`;
      
      if (this.deduplicationCache.has(contentCacheKey)) {
        return {
          action: 'skip',
          existingMemoryId: this.deduplicationCache.get(contentCacheKey),
          confidence: 0.9,
          reasoning: 'Similar content found in cache'
        };
      }

      // Get recent memories to check for semantic similarity
      const recentMemories = await this.getRecentMemories(userId, 72); // Check last 3 days
      
      if (recentMemories.length === 0) {
        return {
          action: 'create',
          confidence: 1.0,
          reasoning: 'No existing memories to compare against'
        };
      }

      // Find semantically similar memory using existing similarity logic
      const similarMemory = await this.findSimilarMemory(messageContent, recentMemories);
      
      if (similarMemory && similarMemory.similarity > 0.6) {
        // High similarity - merge instead of creating duplicate (lowered from 0.8)
        const result = {
          action: 'merge' as const,
          existingMemoryId: similarMemory.id,
          confidence: similarMemory.similarity,
          reasoning: `High similarity (${(similarMemory.similarity * 100).toFixed(1)}%) with existing memory: "${similarMemory.content.substring(0, 50)}..."`
        };
        
        // Cache the result
        this.deduplicationCache.set(cacheKey, similarMemory.id);
        return result;
      } else if (similarMemory && similarMemory.similarity > 0.4) {
        // Medium similarity - update existing memory (lowered from 0.6)
        const result = {
          action: 'update' as const,
          existingMemoryId: similarMemory.id,
          confidence: similarMemory.similarity,
          reasoning: `Medium similarity (${(similarMemory.similarity * 100).toFixed(1)}%) with existing memory: "${similarMemory.content.substring(0, 50)}..."`
        };
        
        // Cache the result
        this.deduplicationCache.set(cacheKey, similarMemory.id);
        return result;
      } else {
        // Low or no similarity - create new memory
        return {
          action: 'create',
          confidence: 1.0,
          reasoning: similarMemory 
            ? `Low similarity (${(similarMemory.similarity * 100).toFixed(1)}%) - creating new memory`
            : 'No similar memories found - creating new memory'
        };
      }

    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Deduplication check failed:', error);
      return {
        action: 'create',
        confidence: 0.8,
        reasoning: 'Deduplication check failed - defaulting to create'
      };
    }
  }

  /**
   * Get recent memories for comparison
   */
  private async getRecentMemories(userId: number, hoursBack: number): Promise<MemoryEntry[]> {
    const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
    
    return await db
      .select()
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true),
        sql`${memoryEntries.createdAt} > ${cutoffTime}`
      ))
      .orderBy(desc(memoryEntries.createdAt))
      .limit(20);
  }

  /**
   * Find similar memory using semantic similarity calculation with fuzzy matching fallback
   */
  private async findSimilarMemory(
    content: string, 
    memories: MemoryEntry[]
  ): Promise<{ id: string; content: string; similarity: number } | null> {
    if (memories.length === 0) return null;

    try {
      // Generate embedding for the new content
      const contentEmbedding = await memoryService.generateEmbedding(content);
      
      let bestMatch: { id: string; content: string; similarity: number } | null = null;
      let highestSimilarity = 0;

      // Compare against existing memories
      for (const memory of memories) {
        if (!memory.embedding) continue;
        
        // Calculate cosine similarity
        const similarity = await memoryService.cosineSimilarity(
          contentEmbedding, 
          memory.embedding as number[]
        );

        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = {
            id: memory.id,
            content: memory.content,
            similarity: similarity
          };
        }
      }

      // If no good semantic match found, try fuzzy string matching as fallback
      if (!bestMatch || bestMatch.similarity < 0.3) {
        const fuzzyMatch = this.findFuzzyMatch(content, memories);
        if (fuzzyMatch && (!bestMatch || fuzzyMatch.similarity > bestMatch.similarity)) {
          bestMatch = fuzzyMatch;
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Similarity check failed:', error);
      // Fallback to fuzzy matching if embedding fails
      return this.findFuzzyMatch(content, memories);
    }
  }

  /**
   * Create new memory entry
   */
  private async createNewMemory(
    userId: number,
    detection: any,
    conversationId: string,
    semanticHash: string
  ): Promise<void> {
    const memoryOptions = {
      category: detection.category,
      labels: detection.labels || [],
      importance_score: detection.importance,
      sourceConversationId: conversationId,
      keywords: detection.keywords
    };

    await memoryService.saveMemoryEntry(userId, detection.extractedInfo, memoryOptions);
  }

  /**
   * Update existing memory entry
   */
  private async updateExistingMemory(
    memoryId: string,
    detection: any
  ): Promise<void> {
    try {
      await db
        .update(memoryEntries)
        .set({
          content: detection.extractedInfo,
          importanceScore: Math.max(detection.importance, 0.1), // Ensure minimum importance
          labels: detection.labels || [],
          keywords: detection.keywords,
          updateCount: sql`${memoryEntries.updateCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(memoryEntries.id, memoryId));

      console.log(`[ChatGPTMemoryEnhancement] Updated memory ${memoryId}`);
    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Memory update failed:', error);
    }
  }

  /**
   * Merge with existing memory (placeholder for future enhancement)
   */
  private async mergeWithExistingMemory(
    memoryId: string,
    detection: any
  ): Promise<void> {
    // For Phase 1, treat merge as update
    await this.updateExistingMemory(memoryId, detection);
  }

  /**
   * Build memory context for system prompt
   */
  private buildMemoryContext(memories: RelevantMemory[]): string {
    return memories
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 4) // Limit to top 4 memories for optimal prompt length
      .map((memory, index) => {
        const priority = memory.importanceScore > 0.8 ? '[Important]' : '';
        return `- ${priority} ${memory.content}`.trim();
      })
      .join('\n');
  }

  /**
   * Find fuzzy match using word-based similarity
   */
  private findFuzzyMatch(
    content: string, 
    memories: MemoryEntry[]
  ): { id: string; content: string; similarity: number } | null {
    const normalizedContent = content.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const contentWords = normalizedContent.split(/\s+/).filter(w => w.length > 2);
    
    if (contentWords.length === 0) return null;

    let bestMatch: { id: string; content: string; similarity: number } | null = null;
    let highestSimilarity = 0;

    for (const memory of memories) {
      const normalizedMemory = memory.content.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const memoryWords = normalizedMemory.split(/\s+/).filter(w => w.length > 2);
      
      if (memoryWords.length === 0) continue;

      // Calculate Jaccard similarity (intersection over union)
      const intersection = contentWords.filter(w => memoryWords.includes(w));
      const union = [...new Set([...contentWords, ...memoryWords])];
      const jaccardSimilarity = intersection.length / union.length;

      // Calculate word overlap similarity
      const overlapSimilarity = intersection.length / Math.max(contentWords.length, memoryWords.length);
      
      // Combined similarity score (weighted)
      const combinedSimilarity = (jaccardSimilarity * 0.6) + (overlapSimilarity * 0.4);

      if (combinedSimilarity > highestSimilarity && combinedSimilarity > 0.2) {
        highestSimilarity = combinedSimilarity;
        bestMatch = {
          id: memory.id,
          content: memory.content,
          similarity: combinedSimilarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): any {
    return {
      cacheSize: this.deduplicationCache.size,
      activeProcessing: this.processingPromises.size,
      embeddingCacheSize: this.embeddingCache.size,
      promptCacheSize: this.promptCache.size,
      memoryRetrievalCacheSize: this.memoryRetrievalCache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCaches(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    // Convert to array to iterate safely
    Array.from(this.cacheTimestamps.entries()).forEach(([key, timestamp]) => {
      if (now - timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.embeddingCache.delete(key);
      this.promptCache.delete(key);
      this.memoryRetrievalCache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }

  /**
   * Clear caches (for testing and maintenance)
   */
  clearCaches(): void {
    this.deduplicationCache.clear();
    this.processingPromises.clear();
    this.embeddingCache.clear();
    this.promptCache.clear();
    this.memoryRetrievalCache.clear();
    this.cacheTimestamps.clear();
  }
}

// Export singleton instance
export const chatGPTMemoryEnhancement = new ChatGPTMemoryEnhancement();