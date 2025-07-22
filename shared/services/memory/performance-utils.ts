/**
 * @used-by shared/memory-service - Performance monitoring utilities
 * @service-type utility
 * @extracted-from memory-service.ts lines 597-619
 */
import { BackgroundProcessingManager } from './background-processing-manager';
import { MemoryCacheManager } from './cache-management';

export class MemoryPerformanceUtils {
  constructor(
    private backgroundProcessingManager: BackgroundProcessingManager,
    private cacheManager: MemoryCacheManager
  ) {}

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
  async preloadUserMemories(userId: number, getUserMemoriesCallback: (userId: number) => Promise<any>): Promise<void> {
    try {
      await getUserMemoriesCallback(userId);
      console.log(`[MemoryService] Preloaded memories for user ${userId}`);
    } catch (error) {
      console.error('[MemoryService] Failed to preload user memories:', error);
    }
  }
}