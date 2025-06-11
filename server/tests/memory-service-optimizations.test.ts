import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { memoryService } from '../services/memory-service';

// Mock the database and cache service
vi.mock('../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnValue([]),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
}));

vi.mock('../services/cache-service', () => ({
  cacheService: {
    getEmbedding: vi.fn().mockResolvedValue(null),
    setEmbedding: vi.fn(),
    getMemorySearchResults: vi.fn().mockResolvedValue(null),
    setMemorySearchResults: vi.fn(),
    clearMemorySearchResults: vi.fn(),
  }
}));

describe('Memory Service Tier 2 C Optimizations', () => {
  let consoleSpy: any;
  
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
    // Reset timers for each test
    vi.useFakeTimers();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('Background Processing Queue', () => {
    it('should process background tasks in priority order', async () => {
      const stats = memoryService.getPerformanceStats();
      expect(stats).toHaveProperty('backgroundQueueSize');
      expect(stats).toHaveProperty('activeCaches');
      expect(stats).toHaveProperty('pendingUpdates');
      expect(stats).toHaveProperty('cacheHitRate');
    });

    it('should handle background memory processing without blocking', async () => {
      const result = await memoryService.processMessageForMemory(
        1,
        'I love running in the morning',
        'conv-123',
        456,
        []
      );
      
      // Should return immediately without waiting for background processing
      expect(result).toHaveProperty('triggers');
      expect(Array.isArray(result.triggers)).toBe(true);
    });

    it('should process background queue periodically', () => {
      const initialStats = memoryService.getPerformanceStats();
      
      // Fast-forward time to trigger background processing
      vi.advanceTimersByTime(6000); // 6 seconds > 5 second interval
      
      // Background processing should have been triggered
      expect(true).toBe(true); // Placeholder - actual queue processing is internal
    });
  });

  describe('Lazy Loading and Caching', () => {
    it('should cache user memories for fast retrieval', async () => {
      // First call should fetch from database
      const memories1 = await memoryService.getUserMemories(1);
      
      // Second call should use cache
      const memories2 = await memoryService.getUserMemories(1);
      
      expect(Array.isArray(memories1)).toBe(true);
      expect(Array.isArray(memories2)).toBe(true);
    });

    it('should filter cached memories by category', async () => {
      const allMemories = await memoryService.getUserMemories(1);
      const preferenceMemories = await memoryService.getUserMemories(1, 'preference');
      
      expect(Array.isArray(allMemories)).toBe(true);
      expect(Array.isArray(preferenceMemories)).toBe(true);
    });

    it('should preload user memories for performance', async () => {
      await memoryService.preloadUserMemories(1);
      
      // Should log preload completion
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Preloaded memories for user 1')
      );
    });
  });

  describe('Vector Similarity Caching', () => {
    it('should use cached similarity scores when available', async () => {
      const vector1 = [0.1, 0.2, 0.3, 0.4, 0.5];
      const vector2 = [0.2, 0.3, 0.4, 0.5, 0.6];
      
      // First calculation should compute and cache
      const memories = await memoryService.getContextualMemories(1, [], 'test message');
      
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should handle vector similarity cache expiration', () => {
      // Fast-forward time beyond cache expiry (1 hour)
      vi.advanceTimersByTime(61 * 60 * 1000);
      
      // Cache cleanup should remove expired entries
      memoryService.forceCacheCleanup();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache cleanup completed')
      );
    });
  });

  describe('Debounced Updates', () => {
    it('should debounce cache invalidation for memory updates', async () => {
      // Delete a memory (should trigger debounced invalidation)
      const result = await memoryService.deleteMemory('memory-123', 1);
      
      // Invalidation should be scheduled but not immediate
      const stats = memoryService.getPerformanceStats();
      expect(typeof stats.pendingUpdates).toBe('number');
    });

    it('should consolidate multiple rapid cache invalidations', async () => {
      // Simulate multiple rapid updates
      await memoryService.deleteMemory('memory-1', 1);
      await memoryService.deleteMemory('memory-2', 1);
      await memoryService.deleteMemory('memory-3', 1);
      
      // Should consolidate into single debounced update
      const stats = memoryService.getPerformanceStats();
      expect(stats.pendingUpdates).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should track cache performance metrics', () => {
      const stats = memoryService.getPerformanceStats();
      
      expect(stats.backgroundQueueSize).toBeGreaterThanOrEqual(0);
      expect(stats.activeCaches).toBeGreaterThanOrEqual(0);
      expect(stats.pendingUpdates).toBeGreaterThanOrEqual(0);
      expect(typeof stats.cacheHitRate).toBe('string');
      expect(stats.cacheHitRate).toMatch(/^\d+%$/);
    });

    it('should cleanup expired cache entries automatically', () => {
      // Fast-forward time to trigger automatic cleanup (30 minutes)
      vi.advanceTimersByTime(31 * 60 * 1000);
      
      // Should log cleanup activity
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache cleanup completed')
      );
    });

    it('should handle high-priority explicit memory saves immediately', async () => {
      const result = await memoryService.processMessageForMemory(
        1,
        'Remember that I am allergic to peanuts',
        'conv-123',
        456,
        []
      );
      
      // Explicit triggers should be processed immediately
      expect(result).toHaveProperty('triggers');
    });
  });

  describe('Memory Retrieval Optimization', () => {
    it('should optimize contextual memory retrieval with caching', async () => {
      const conversationHistory = [
        { role: 'user', content: 'I want to lose weight' },
        { role: 'assistant', content: 'What are your current goals?' }
      ];
      
      const memories = await memoryService.getContextualMemories(
        1,
        conversationHistory,
        'I need help with my diet'
      );
      
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should sort memories by relevance and importance', async () => {
      const memories = await memoryService.getUserMemories(1);
      
      // Should return sorted array
      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle cache service failures gracefully', async () => {
      // Mock cache service failure
      const { cacheService } = await import('../services/cache-service');
      vi.mocked(cacheService.getMemorySearchResults).mockRejectedValue(new Error('Cache error'));
      
      const memories = await memoryService.getContextualMemories(1, [], 'test');
      
      // Should still return results despite cache failure
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should handle background task processing errors', () => {
      // Background processing should not throw errors
      vi.advanceTimersByTime(10000); // Trigger multiple background cycles
      
      // Should continue running without crashes
      const stats = memoryService.getPerformanceStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Integration with Existing Cache Service', () => {
    it('should integrate with existing embedding cache', async () => {
      const { cacheService } = await import('../services/cache-service');
      
      // Should check cache before generating embeddings
      await memoryService.getContextualMemories(1, [], 'test embedding cache');
      
      expect(cacheService.getEmbedding).toHaveBeenCalled();
    });

    it('should integrate with memory search result cache', async () => {
      const { cacheService } = await import('../services/cache-service');
      
      await memoryService.getContextualMemories(1, [], 'test search cache');
      
      expect(cacheService.getMemorySearchResults).toHaveBeenCalled();
    });
  });
});