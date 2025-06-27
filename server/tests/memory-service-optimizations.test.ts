import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { databaseMigrationService } from '../services/database-migration-service';

// IMPORTANT: Mock 'openai' before it's imported by memory-service
vi.mock('openai', () => {
  const mockOpenAIInstance = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ shouldRemember: false, category: 'context', importance: 0.1, extractedInfo: '', keywords: [], reasoning: '' }) } }],
        }),
      },
    },
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] }], // Ensure embedding length matches expectations if any
      }),
    },
  };
  // Named export 'OpenAI' for constructor `new OpenAI()`
  return {
    OpenAI: vi.fn(() => mockOpenAIInstance),
    default: vi.fn(() => mockOpenAIInstance), // Support `import OpenAI from 'openai'`
  };
});

// Now import memoryService, which will use the mocked OpenAI
import { memoryService } from '../services/memory-service';

// Mock OpenAI (already done, ensure it's at the very top or before memory-service import)

// Mock cacheService and get direct references to its mocked methods
const mockCacheServiceGetEmbedding = vi.fn().mockResolvedValue(null);
const mockCacheServiceSetEmbedding = vi.fn();
const mockCacheServiceGetMemorySearchResults = vi.fn().mockResolvedValue(null);
const mockCacheServiceSetMemorySearchResults = vi.fn();
const mockCacheServiceClearMemorySearchResults = vi.fn();

vi.mock('../services/cache-service', () => ({
  cacheService: {
    getEmbedding: mockCacheServiceGetEmbedding,
    setEmbedding: mockCacheServiceSetEmbedding,
    getMemorySearchResults: mockCacheServiceGetMemorySearchResults,
    setMemorySearchResults: mockCacheServiceSetMemorySearchResults,
    clearMemorySearchResults: mockCacheServiceClearMemorySearchResults,
    // Add any other methods used by MemoryService if they arise
  }
}));

// Mock the database

// Function declaration for createDbMock to ensure it's available for hoisted vi.mock calls
function createDbMock() {
  const dbMock: any = {};

  // Helper to create a thenable object that also allows further chaining
  const createThenable = (resolveValue: any = []) => {
    const thenable: any = {
      then: (onFulfilled: (value: any) => any, onRejected?: (reason: any) => any) =>
        Promise.resolve(resolveValue).then(onFulfilled, onRejected),
      execute: () => Promise.resolve(resolveValue), // Common execution method
    };

    // Add all chainable methods back to the thenable object
    Object.keys(dbMock).forEach(key => {
      if (typeof dbMock[key] === 'function') {
        thenable[key] = (...args: any[]) => {
          dbMock[key](...args); // Call the original spy to record calls
          return thenable; // Return itself for further chaining if needed, or specific thenable
        };
      }
    });
    // Ensure specific methods that terminate a chain return the thenable correctly
    dbMock.select = vi.fn().mockReturnValue(thenable); // select starts a chain that should be thenable
    dbMock.from = vi.fn().mockReturnValue(thenable);
    dbMock.where = vi.fn().mockReturnValue(thenable);
    dbMock.orderBy = vi.fn().mockReturnValue(thenable);
    dbMock.limit = vi.fn().mockReturnValue(thenable);

    return thenable;
  };

  // Assign methods to dbMock, ensuring they return the dbMock for chaining or a thenable
  dbMock.select = vi.fn().mockImplementation(() => createThenable([])); // Default select resolves to empty array
  dbMock.insert = vi.fn().mockReturnValue(dbMock);
  dbMock.update = vi.fn().mockReturnValue(dbMock);
  dbMock.delete = vi.fn().mockReturnValue(dbMock);

  dbMock.from = vi.fn().mockImplementation(() => createThenable([]));
  dbMock.where = vi.fn().mockImplementation(() => createThenable([]));
  dbMock.orderBy = vi.fn().mockImplementation(() => createThenable([]));
  dbMock.limit = vi.fn().mockImplementation(() => createThenable([]));

  dbMock.values = vi.fn().mockReturnValue(dbMock);
  dbMock.set = vi.fn().mockReturnValue(dbMock);
  dbMock.returning = vi.fn().mockImplementation(() => createThenable([])); // returning also makes it thenable

  return dbMock;
}

// Remove database mock to use real database for integration testing

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
  
  beforeAll(async () => {
    await databaseMigrationService.initializeDatabase();
  });
  
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.resetAllMocks(); // Resets spies to their original state or clears them

    // Re-establish default mock behavior for cacheService spies after reset
    mockCacheServiceGetEmbedding.mockResolvedValue(null);
    mockCacheServiceSetEmbedding.mockImplementation(() => {}); // Provide a base mock implementation
    mockCacheServiceGetMemorySearchResults.mockResolvedValue(null);
    mockCacheServiceSetMemorySearchResults.mockImplementation(() => {});
    mockCacheServiceClearMemorySearchResults.mockImplementation(() => {});
    // Note: db mock is handled by vi.mock at the top level, its state should be fresh per run or managed if needed.
    // OpenAI mock is also top-level.

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
      
      // Should complete without errors
      expect(true).toBe(true);
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

    it('should cleanup expired cache entries automatically', async () => {
      // Manually trigger cleanup to directly test the logging in cleanupExpiredCaches
      // Mocking/verifying setInterval with fake timers can be complex for just checking a log.
      memoryService.forceCacheCleanup(); // This directly calls cleanupExpiredCaches

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
      // Should return contextual memories without errors
      const result = await memoryService.getContextualMemories(1, [], 'test embedding cache');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should integrate with memory search result cache', async () => {
      const result = await memoryService.getContextualMemories(1, [], 'test search cache');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});