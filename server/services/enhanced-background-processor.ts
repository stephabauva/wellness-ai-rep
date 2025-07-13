import { chatGPTMemoryEnhancement } from '@shared/services/chatgpt-memory-enhancement';
import { memoryService } from '@shared/services/memory-service';

/**
 * Phase 3: Enhanced Background Processing
 * Optimized queue-based memory processing with circuit breakers
 */
export class EnhancedBackgroundProcessor {
  private processingQueue = new Map<string, Promise<void>>();
  private failureCount = new Map<number, number>();
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 minute
  private lastFailureTime = new Map<number, number>();
  
  // Performance metrics
  private metrics = {
    processedCount: 0,
    failureCount: 0,
    averageProcessingTime: 0,
    totalProcessingTime: 0,
    circuitBreakerTrips: 0
  };

  /**
   * Process memory with enhanced ChatGPT logic and circuit breaker protection
   */
  async processMemoryWithChatGPTLogic(payload: {
    userId: number;
    message: string;
    conversationId: string;
    priority?: 'high' | 'normal' | 'low';
  }): Promise<void> {
    const startTime = Date.now();
    const { userId, message, conversationId, priority = 'normal' } = payload;
    const processingKey = `${userId}-${conversationId}-${Date.now()}`;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(userId)) {
      console.warn(`[EnhancedBackgroundProcessor] Circuit breaker open for user ${userId}`);
      return this.fallbackProcessing(userId, message, conversationId);
    }

    // Prevent duplicate processing
    if (this.processingQueue.has(processingKey)) {
      return this.processingQueue.get(processingKey);
    }

    const processingPromise = this.performEnhancedProcessing(userId, message, conversationId, startTime);
    this.processingQueue.set(processingKey, processingPromise);

    try {
      await processingPromise;
      this.recordSuccess(userId, startTime);
    } catch (error) {
      this.recordFailure(userId, error);
      await this.fallbackProcessing(userId, message, conversationId);
    } finally {
      this.processingQueue.delete(processingKey);
    }
  }

  /**
   * Batch process multiple memories for improved efficiency
   */
  async processBatchMemories(
    payloads: Array<{
      userId: number;
      message: string;
      conversationId: string;
    }>
  ): Promise<void> {
    const batchStartTime = Date.now();
    
    // Group by user to optimize processing
    const userGroups = new Map<number, typeof payloads>();
    payloads.forEach(payload => {
      if (!userGroups.has(payload.userId)) {
        userGroups.set(payload.userId, []);
      }
      userGroups.get(payload.userId)!.push(payload);
    });

    // Process each user's memories in parallel
    const processingPromises = Array.from(userGroups.entries()).map(
      ([userId, userPayloads]) => this.processUserBatch(userId, userPayloads)
    );

    try {
      await Promise.allSettled(processingPromises);
      console.log(`[EnhancedBackgroundProcessor] Batch processed ${payloads.length} memories in ${Date.now() - batchStartTime}ms`);
    } catch (error) {
      console.error('[EnhancedBackgroundProcessor] Batch processing error:', error);
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): typeof this.metrics {
    return {
      ...this.metrics,
      averageProcessingTime: this.metrics.processedCount > 0 
        ? this.metrics.totalProcessingTime / this.metrics.processedCount 
        : 0
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      processedCount: 0,
      failureCount: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      circuitBreakerTrips: 0
    };
    this.failureCount.clear();
    this.lastFailureTime.clear();
  }

  private async performEnhancedProcessing(
    userId: number,
    message: string,
    conversationId: string,
    startTime: number
  ): Promise<void> {
    // Use enhanced deduplication with timeout protection
    const processingTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Processing timeout')), 5000)
    );

    const processingWork = chatGPTMemoryEnhancement.processWithDeduplication(
      userId,
      message,
      conversationId
    );

    await Promise.race([processingWork, processingTimeout]);
  }

  private async fallbackProcessing(
    userId: number,
    message: string,
    conversationId: string
  ): Promise<void> {
    console.log(`[EnhancedBackgroundProcessor] Using fallback processing for user ${userId}`);
    
    try {
      await memoryService.processMessageForMemory(userId, message, conversationId, 0);
    } catch (error) {
      console.error('[EnhancedBackgroundProcessor] Fallback processing failed:', error);
    }
  }

  private async processUserBatch(
    userId: number,
    payloads: Array<{ userId: number; message: string; conversationId: string; }>
  ): Promise<void> {
    // Process user's memories sequentially to avoid conflicts
    for (const payload of payloads) {
      try {
        await this.processMemoryWithChatGPTLogic(payload);
      } catch (error) {
        console.error(`[EnhancedBackgroundProcessor] Failed to process memory for user ${userId}:`, error);
      }
    }
  }

  private isCircuitBreakerOpen(userId: number): boolean {
    const failures = this.failureCount.get(userId) || 0;
    const lastFailure = this.lastFailureTime.get(userId) || 0;
    
    if (failures >= this.circuitBreakerThreshold) {
      const timeSinceLastFailure = Date.now() - lastFailure;
      if (timeSinceLastFailure < this.circuitBreakerTimeout) {
        return true;
      } else {
        // Reset circuit breaker after timeout
        this.failureCount.set(userId, 0);
        return false;
      }
    }
    
    return false;
  }

  private recordSuccess(userId: number, startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.metrics.processedCount++;
    this.metrics.totalProcessingTime += processingTime;
    
    // Reset failure count on success
    this.failureCount.set(userId, 0);
  }

  private recordFailure(userId: number, error: any): void {
    this.metrics.failureCount++;
    const currentFailures = this.failureCount.get(userId) || 0;
    this.failureCount.set(userId, currentFailures + 1);
    this.lastFailureTime.set(userId, Date.now());
    
    if (currentFailures + 1 >= this.circuitBreakerThreshold) {
      this.metrics.circuitBreakerTrips++;
      console.warn(`[EnhancedBackgroundProcessor] Circuit breaker tripped for user ${userId}`);
    }
  }
}

export const enhancedBackgroundProcessor = new EnhancedBackgroundProcessor();