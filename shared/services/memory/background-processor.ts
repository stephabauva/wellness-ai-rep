/**
 * Background processing system for memory operations
 * @used-by memory/memory-service - Memory background processing
 */

import { logger } from "@shared/services/logger-service";

export interface BackgroundTask {
  id: string;
  type: 'memory_processing' | 'embedding_generation' | 'similarity_calculation';
  payload: any;
  priority: number;
  createdAt: Date;
}

export interface MemoryProcessingQueue {
  tasks: BackgroundTask[];
  processing: boolean;
}

export class BackgroundProcessor {
  private backgroundQueue: MemoryProcessingQueue = {
    tasks: [],
    processing: false
  };
  
  private processingInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private taskHandlers: {
      memory_processing: (payload: any) => Promise<void>;
      embedding_generation: (payload: any) => Promise<void>;
      similarity_calculation: (payload: any) => Promise<void>;
    }
  ) {
    this.initializeBackgroundProcessor();
  }

  // Initialize background processor with circuit breaker
  private initializeBackgroundProcessor(): void {
    logger.debug('Initializing background processor', { service: 'memory' });
    
    this.processingInterval = setInterval(() => {
      // Circuit breaker: if queue gets too large, clear old low-priority tasks
      if (this.backgroundQueue.tasks.length > 20) {
        logger.warn(`Background queue overflow: ${this.backgroundQueue.tasks.length} tasks, clearing old low-priority tasks`, { service: 'memory' });
        this.backgroundQueue.tasks = this.backgroundQueue.tasks
          .filter(task => task.priority > 2 || (Date.now() - task.createdAt.getTime()) < 60000)
          .slice(0, 10);
      }
      this.processBackgroundQueue();
    }, 5000);
  }

  // Process background tasks queue
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
      
      const handler = this.taskHandlers[task.type];
      if (handler) {
        await handler(task.payload);
      }
    } catch (error) {
      console.error('[MemoryService] Background task processing error:', error);
    } finally {
      this.backgroundQueue.processing = false;
    }
  }

  // Add task to background queue
  addBackgroundTask(type: BackgroundTask['type'], payload: any, priority: number = 1): void {
    const task: BackgroundTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      priority,
      createdAt: new Date()
    };
    
    this.backgroundQueue.tasks.push(task);
  }

  // Get performance stats
  getPerformanceStats(): {
    backgroundQueueSize: number;
  } {
    return {
      backgroundQueueSize: this.backgroundQueue.tasks.length
    };
  }

  // Cleanup method
  cleanup(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}