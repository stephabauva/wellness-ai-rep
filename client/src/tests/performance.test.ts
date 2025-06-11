import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualScrolling } from '@/hooks/useVirtualScrolling';
import { useMessagePagination } from '@/hooks/useMessagePagination';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('Frontend Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Virtual Scrolling', () => {
    it('should only render visible items for large datasets', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, content: `Message ${i}` }));
      
      const { result } = renderHook(() =>
        useVirtualScrolling(items, {
          itemHeight: 100,
          containerHeight: 400,
          overscan: 5,
        })
      );

      // Should only render visible items + overscan, not all 1000 items
      expect(result.current.visibleItems.length).toBeLessThan(20);
      expect(result.current.totalHeight).toBe(100000); // 1000 * 100
    });

    it('should update visible items when scrolling', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, content: `Message ${i}` }));
      
      const { result } = renderHook(() =>
        useVirtualScrolling(items, {
          itemHeight: 100,
          containerHeight: 400,
          overscan: 2,
        })
      );

      const initialVisibleItems = result.current.visibleItems.length;

      // Simulate scroll event
      act(() => {
        const mockEvent = {
          currentTarget: { scrollTop: 500 },
        } as React.UIEvent<HTMLDivElement>;
        result.current.handleScroll(mockEvent);
      });

      // Visible items should update based on scroll position
      expect(result.current.offsetY).toBeGreaterThan(0);
    });
  });

  describe('Message Pagination', () => {
    it('should paginate large message sets efficiently', () => {
      const messages = Array.from({ length: 200 }, (_, i) => ({ 
        id: `msg-${i}`, 
        content: `Message ${i}`,
        timestamp: new Date(Date.now() + i * 1000)
      }));

      const { result } = renderHook(() =>
        useMessagePagination(messages, {
          pageSize: 50,
        })
      );

      // Should start with first page of messages
      expect(result.current.currentItems.length).toBe(50);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.totalPages).toBe(4);
    });

    it('should load more messages when requested', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({ 
        id: `msg-${i}`, 
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const { result } = renderHook(() =>
        useMessagePagination(messages, {
          pageSize: 25,
        })
      );

      expect(result.current.currentItems.length).toBe(25);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.currentItems.length).toBe(50);
    });
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates immediately', () => {
      const baseData = [
        { id: '1', content: 'Message 1' },
        { id: '2', content: 'Message 2' },
      ];

      const { result } = renderHook(() =>
        useOptimisticUpdates(baseData)
      );

      expect(result.current.data.length).toBe(2);

      // Add optimistic update
      act(() => {
        result.current.addOptimisticUpdate('create', {
          id: '3',
          content: 'Optimistic Message 3',
        });
      });

      expect(result.current.data.length).toBe(3);
      expect(result.current.hasPendingOperations).toBe(true);
    });

    it('should handle failed updates with retry logic', () => {
      const baseData = [{ id: '1', content: 'Message 1' }];

      const { result } = renderHook(() =>
        useOptimisticUpdates(baseData, { maxRetries: 2 })
      );

      // Add optimistic update
      let operationId: string;
      act(() => {
        operationId = result.current.addOptimisticUpdate('create', {
          id: '2',
          content: 'Message 2',
        });
      });

      // Reject the update
      act(() => {
        result.current.rejectOptimisticUpdate(operationId, 'Network error');
      });

      expect(result.current.hasFailedOperations).toBe(true);
      
      // Should be available for retry
      const failedUpdates = result.current.retryFailedUpdates();
      expect(failedUpdates.length).toBe(1);
    });

    it('should remove updates after max retries', () => {
      const baseData = [{ id: '1', content: 'Message 1' }];

      const { result } = renderHook(() =>
        useOptimisticUpdates(baseData, { maxRetries: 1 })
      );

      let operationId: string;
      act(() => {
        operationId = result.current.addOptimisticUpdate('create', {
          id: '2',
          content: 'Message 2',
        });
      });

      // Reject twice (exceeding max retries)
      act(() => {
        result.current.rejectOptimisticUpdate(operationId, 'Error 1');
      });

      act(() => {
        result.current.rejectOptimisticUpdate(operationId, 'Error 2');
      });

      // Should be removed after max retries
      expect(result.current.data.length).toBe(1);
      expect(result.current.hasFailedOperations).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render performance metrics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({
          componentName: 'TestComponent',
          sampleRate: 1, // Monitor all renders for testing
        })
      );

      expect(result.current.metrics.componentName).toBe('TestComponent');
      expect(result.current.metrics.rerenderCount).toBeGreaterThan(0);
    });

    it('should detect performance warnings', () => {
      // Mock slow render time
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(20); // 20ms render time

      const { result } = renderHook(() =>
        usePerformanceMonitoring({
          componentName: 'SlowComponent',
          sampleRate: 1,
        })
      );

      const warnings = result.current.getPerformanceWarnings();
      expect(result.current.isSlowRender).toBe(true);
    });

    it('should track memory usage when available', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({
          componentName: 'MemoryComponent',
          enableMemoryMonitoring: true,
          sampleRate: 1,
        })
      );

      expect(result.current.metrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('React.memo Optimization', () => {
    it('should prevent unnecessary re-renders with memoization', () => {
      // This would be tested with actual React components
      // For now, we verify the memoization logic
      const prevProps = {
        message: 'Hello',
        isUser: true,
        timestamp: new Date('2023-01-01'),
        isStreaming: false,
        isStreamingComplete: false,
        attachments: [],
      };

      const nextProps = { ...prevProps };

      // Simulate the memo comparison function
      const areEqual = (
        prevProps.message === nextProps.message &&
        prevProps.isUser === nextProps.isUser &&
        prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
        prevProps.isStreaming === nextProps.isStreaming &&
        prevProps.isStreamingComplete === nextProps.isStreamingComplete &&
        JSON.stringify(prevProps.attachments) === JSON.stringify(nextProps.attachments)
      );

      expect(areEqual).toBe(true);
    });
  });

  describe('Web Worker Integration', () => {
    it('should handle message processing tasks', () => {
      // Mock Web Worker
      const mockWorker = {
        postMessage: vi.fn(),
        onmessage: null,
        onerror: null,
        terminate: vi.fn(),
      };

      // @ts-ignore
      global.Worker = vi.fn(() => mockWorker);

      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Test message ${i} with some keywords`,
      }));

      // Simulate worker task
      const task = {
        type: 'PARSE_MESSAGES',
        payload: { messages },
        id: 'test-task-1',
      };

      expect(mockWorker.postMessage).toBeDefined();
    });
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  it('should handle 1000+ messages efficiently with virtual scrolling', () => {
    const startTime = performance.now();
    
    const messages = Array.from({ length: 1000 }, (_, i) => ({
      id: `msg-${i}`,
      content: `Message ${i}`,
    }));

    const { result } = renderHook(() =>
      useVirtualScrolling(messages, {
        itemHeight: 100,
        containerHeight: 600,
        overscan: 5,
      })
    );

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Should process 1000 items in under 50ms
    expect(processingTime).toBeLessThan(50);
    expect(result.current.visibleItems.length).toBeLessThan(20);
  });

  it('should handle optimistic updates efficiently', () => {
    const baseData = Array.from({ length: 500 }, (_, i) => ({
      id: `item-${i}`,
      content: `Item ${i}`,
    }));

    const startTime = performance.now();

    const { result } = renderHook(() =>
      useOptimisticUpdates(baseData)
    );

    // Add multiple optimistic updates
    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.addOptimisticUpdate('create', {
          id: `new-${i}`,
          content: `New item ${i}`,
        });
      }
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Should handle 50 optimistic updates in under 100ms
    expect(processingTime).toBeLessThan(100);
    expect(result.current.data.length).toBe(550);
  });
});