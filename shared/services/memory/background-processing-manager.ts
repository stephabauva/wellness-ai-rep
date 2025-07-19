/**
 * Background processing manager for memory operations
 * @used-by memory/memory-service - Background task processing and management
 */

import { logger } from "@shared/services/logger-service";
import { cacheService } from "@shared/services/cache-service";
import { BackgroundProcessor, type BackgroundTask } from './background-processor';
import { MemoryCache } from './memory-cache';
import { AIMemoryDetector } from './ai-detection';
import { EmbeddingService } from './embedding-service';

export class BackgroundProcessingManager {
  private backgroundProcessor: BackgroundProcessor;
  private memoryCache: MemoryCache;
  private aiDetector: AIMemoryDetector;
  private embeddingService: EmbeddingService;

  constructor(
    memoryCache: MemoryCache,
    aiDetector: AIMemoryDetector,
    embeddingService: EmbeddingService
  ) {
    this.memoryCache = memoryCache;
    this.aiDetector = aiDetector;
    this.embeddingService = embeddingService;

    // Initialize background processor with task handlers
    this.backgroundProcessor = new BackgroundProcessor({
      memory_processing: this.processBackgroundMemoryTask.bind(this),
      embedding_generation: this.processBackgroundEmbeddingTask.bind(this),
      similarity_calculation: this.processBackgroundSimilarityTask.bind(this)
    });
  }

  /**
   * Add task to background queue
   */
  addBackgroundTask(type: 'memory_processing' | 'embedding_generation' | 'similarity_calculation', payload: any, priority: number = 1): void {
    this.backgroundProcessor.addBackgroundTask(type, payload, priority);
  }

  /**
   * Background memory processing task with ChatGPT deduplication
   */
  private async processBackgroundMemoryTask(payload: any): Promise<void> {
    const { userId, message, conversationId, messageId, conversationHistory } = payload;
    
    try {
      console.log(`[BackgroundProcessingManager] Processing background memory task with ChatGPT deduplication for user ${userId}, message: "${message.substring(0, 50)}..."`);
      
      // Use ChatGPT deduplication system for enhanced memory processing
      const { chatGPTMemoryEnhancement } = await import('../chatgpt-memory-enhancement.js');
      
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
      
      console.log(`[BackgroundProcessingManager] ChatGPT deduplication processing completed for user ${userId}`);
      
      // Invalidate user memory cache immediately for real-time updates
      this.memoryCache.invalidateUserMemoryCache(userId, 100); // Fast invalidation
      
      // Force immediate cache cleanup to ensure fresh data
      this.memoryCache.forceCacheCleanup();
      logger.debug('Cache forcefully invalidated for immediate UI refresh', { service: 'memory' });
      
    } catch (error) {
      logger.error('ChatGPT deduplication processing failed, falling back to standard processing', error as Error, { service: 'memory' });
      
      // Fallback to original memory processing if deduplication fails
      try {
        const autoDetection = await this.aiDetector.detectMemoryWorthy(message, conversationHistory, this.validateMemoryContent.bind(this));
        
        if (autoDetection.shouldRemember) {
          // Validate conversationId format - must be valid UUID or null
          let validConversationId: string | undefined = undefined;
          if (conversationId && typeof conversationId === 'string') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(conversationId)) {
              validConversationId = conversationId;
            }
          }
          
          // Import memory service to save the memory
          const { memoryService } = await import('../memory-service');
          const savedMemory = await memoryService.saveMemoryEntry(userId, autoDetection.extractedInfo, {
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

  /**
   * Background embedding generation task
   */
  private async processBackgroundEmbeddingTask(payload: any): Promise<void> {
    const { text, cacheKey } = payload;
    
    try {
      const embedding = await this.embeddingService.generateEmbedding(text);
      if (embedding.length > 0) {
        cacheService.setEmbedding(cacheKey, embedding, 'text-embedding-3-small');
      }
    } catch (error) {
      console.error('[BackgroundProcessingManager] Background embedding generation failed:', error);
    }
  }

  /**
   * Background similarity calculation task
   */
  private async processBackgroundSimilarityTask(payload: any): Promise<void> {
    const { vectorA, vectorB, cacheKey } = payload;
    
    try {
      // Import cosine similarity function
      const { cosineSimilaritySync } = await import('./memory-utils');
      const similarity = cosineSimilaritySync(vectorA, vectorB);
      this.memoryCache.setCachedSimilarity(cacheKey, similarity);
    } catch (error) {
      console.error('[BackgroundProcessingManager] Background similarity calculation failed:', error);
    }
  }

  /**
   * Validate memory content quality (simplified version for background processing)
   */
  private validateMemoryContent(extractedInfo: string, category: any): boolean {
    // Check for minimum content length
    if (!extractedInfo || extractedInfo.trim().length < 5) {
      return false;
    }

    // Check for undefined or placeholder content
    if (extractedInfo.includes('undefined') || extractedInfo.includes('null') || extractedInfo.includes('N/A')) {
      return false;
    }

    return true;
  }

  /**
   * Get performance stats from background processor
   */
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
}