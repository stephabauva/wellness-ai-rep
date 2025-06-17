import { db } from '../db';
import { memoryEntries, type InsertMemoryEntry, type MemoryEntry, type MemoryCategory } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { memoryService } from './memory-service';
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
   * Build enhanced system prompt with relevant memories (ChatGPT style)
   */
  async buildEnhancedSystemPrompt(
    userId: number, 
    currentMessage: string
  ): Promise<string> {
    try {
      // Use existing contextual memory retrieval with enhanced parameters
      const relevantMemories = await memoryService.getContextualMemories(
        userId, 
        [], 
        currentMessage
      );

      if (relevantMemories.length === 0) {
        return "You are a helpful AI wellness coach.";
      }

      // Build memory context in ChatGPT style
      const memoryContext = this.buildMemoryContext(relevantMemories);
      
      return `You are a helpful AI wellness coach. Consider this context about the user:

${memoryContext}

Use this information naturally in your responses to provide personalized guidance. Do not explicitly mention that you're referencing stored information.`;

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
          await this.createNewMemory(userId, detection, conversationId, semanticHash);
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
   * Generate semantic hash for deduplication
   */
  public async generateSemanticHash(message: string): Promise<string> {
    try {
      // Use existing embedding generation from memory service
      const embedding = await memoryService.generateEmbedding(message);
      
      if (!embedding || embedding.length === 0) {
        // Fallback to content hash
        return crypto.createHash('sha256').update(message.toLowerCase().trim()).digest('hex').slice(0, 64);
      }

      // Create semantic hash from embedding
      return embedding.slice(0, 10)
        .map(v => Math.round(v * 1000))
        .join('')
        .slice(0, 64);
    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Embedding generation failed:', error);
      // Fallback to content hash
      return crypto.createHash('sha256').update(message.toLowerCase().trim()).digest('hex').slice(0, 64);
    }
  }

  /**
   * Check for semantic duplicates
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

      // Check database for exact semantic hash match
      const exactMatch = await db
        .select()
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

      // Check for similar content using existing memory system
      const recentMemories = await this.getRecentMemories(userId, 48); // 48 hours
      const similarMemory = await this.findSimilarMemory(messageContent, recentMemories);

      if (similarMemory) {
        if (similarMemory.relevanceScore > 0.85) {
          return {
            action: 'skip',
            existingMemoryId: similarMemory.id,
            confidence: similarMemory.relevanceScore,
            reasoning: `High similarity (${(similarMemory.relevanceScore * 100).toFixed(1)}%) with existing memory`
          };
        } else if (similarMemory.relevanceScore > 0.70) {
          return {
            action: 'update',
            existingMemoryId: similarMemory.id,
            confidence: similarMemory.relevanceScore,
            reasoning: `Moderate similarity (${(similarMemory.relevanceScore * 100).toFixed(1)}%) - updating existing memory`
          };
        }
      }

      return {
        action: 'create',
        confidence: 1.0,
        reasoning: 'No similar memories found - creating new entry'
      };

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
   * Find similar memory using existing similarity logic
   */
  private async findSimilarMemory(
    content: string, 
    memories: MemoryEntry[]
  ): Promise<RelevantMemory | null> {
    if (memories.length === 0) return null;

    try {
      // Use existing contextual memory retrieval
      const contextualMemories = await memoryService.getContextualMemories(
        memories[0].userId,
        [],
        content
      );

      return contextualMemories.length > 0 ? contextualMemories[0] : null;
    } catch (error) {
      console.error('[ChatGPTMemoryEnhancement] Similarity check failed:', error);
      return null;
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
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): any {
    return {
      cacheSize: this.deduplicationCache.size,
      activeProcessing: this.processingPromises.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear caches (for testing and maintenance)
   */
  clearCaches(): void {
    this.deduplicationCache.clear();
    this.processingPromises.clear();
  }
}

// Export singleton instance
export const chatGPTMemoryEnhancement = new ChatGPTMemoryEnhancement();