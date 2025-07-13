import { memoryService } from './memory-service';
import { logger } from "@shared/services/logger-service";

// Simplified Enhanced Memory Service - Background Processing Only
// Core detection logic has been moved to main memory-service.ts

class EnhancedMemoryService {
  // Background processing coordination
  private processingTasks = new Map<string, Promise<any>>();

  constructor() {
    logger.debug('Enhanced Memory Service initialized for background processing coordination', { service: 'memory' });
  }

  // Delegate to main memory service for detection
  async detectMemoryWorthy(message: string, conversationHistory: any[] = []): Promise<any> {
    try {
      return await memoryService.detectMemoryWorthy(message, conversationHistory);
    } catch (error) {
      logger.error('Enhanced memory detection failed, falling back to default', error as Error, { service: 'memory' });
      return {
        shouldRemember: false,
        category: 'personal_context',
        importance: 0.0,
        extractedInfo: '',
        labels: [],
        keywords: [],
        reasoning: 'Error in enhanced processing'
      };
    }
  }

  // Delegate to main memory service for retrieval
  async getRelevantMemories(query: string, userId: number, limit: number = 5): Promise<any[]> {
    try {
      return await memoryService.getContextualMemories(userId, [], query);
    } catch (error) {
      logger.error('Enhanced memory retrieval failed', error as Error, { service: 'memory' });
      return [];
    }
  }

  // Background processing coordination
  async processInBackground(taskId: string, taskFunction: () => Promise<any>): Promise<void> {
    if (this.processingTasks.has(taskId)) {
      return; // Already processing
    }

    const task = taskFunction().finally(() => {
      this.processingTasks.delete(taskId);
    });

    this.processingTasks.set(taskId, task);
    
    try {
      await task;
    } catch (error) {
      logger.error(`Background task ${taskId} failed`, error as Error, { service: 'memory' });
    }
  }
}

export const enhancedMemoryService = new EnhancedMemoryService();