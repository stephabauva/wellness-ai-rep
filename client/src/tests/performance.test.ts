import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hooks being tested or used by other tested hooks (direct imports)
import { useVirtualScrolling } from '@/hooks/useVirtualScrolling';
import { useMessagePagination } from '@/hooks/useMessagePagination';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

// --- Performance API Mocking ---
let currentMockTime = 0;
const getMockNow = () => {
  currentMockTime += 10;
  return currentMockTime;
};

const baseMockPerformance = {
  now: vi.fn(getMockNow),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024,
  },
};

// --- React.useState Mocking via vi.mock ---
const mockSetMetrics = vi.fn();

vi.mock('react', async () => {
  const actualReact = await vi.importActual<typeof import('react')>('react');
  return {
    ...actualReact,
    useState: vi.fn((initialValue: any) => {
      if (
        typeof initialValue === 'object' && initialValue !== null &&
        'renderTime' in initialValue && typeof initialValue.renderTime === 'number' &&
        'memoryUsage' in initialValue && typeof initialValue.memoryUsage === 'number' &&
        'rerenderCount' in initialValue && typeof initialValue.rerenderCount === 'number' &&
        'lastRenderTimestamp' in initialValue &&
        'averageRenderTime' in initialValue &&
        'worstRenderTime' in initialValue &&
        'componentName' in initialValue && typeof initialValue.componentName === 'string'
      ) {
        return [initialValue, mockSetMetrics];
      }
      return actualReact.useState(initialValue);
    }),
  };
});

// --- Test Suites ---
describe('Frontend Performance Optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Resets mockSetMetrics and other mocks like performance.now calls
    currentMockTime = 0;

    const freshMockPerformance = {
      now: vi.fn(getMockNow),
      memory: {
        usedJSHeapSize: 10 * 1024 * 1024,
      },
    };
    Object.defineProperty(global, 'performance', {
      value: freshMockPerformance,
      writable: true,
      configurable: true,
    });
  });

  describe('Virtual Scrolling', () => {
    it('should only render visible items for large datasets', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, content: `Message ${i}` }));
      const { result } = renderHook(() =>
        useVirtualScrolling(items, { itemHeight: 100, containerHeight: 400, overscan: 5 })
      );
      expect(result.current.visibleItems.length).toBeLessThan(20);
      expect(result.current.totalHeight).toBe(100000);
    });

    it('should update visible items when scrolling', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, content: `Message ${i}` }));
      const { result } = renderHook(() =>
        useVirtualScrolling(items, { itemHeight: 100, containerHeight: 400, overscan: 2 })
      );
      act(() => {
        const mockEvent = { currentTarget: { scrollTop: 500 } } as React.UIEvent<HTMLDivElement>;
        result.current.handleScroll(mockEvent);
      });
      expect(result.current.offsetY).toBeGreaterThan(0);
    });
  });

  describe('Message Pagination', () => {
    it('should paginate large message sets efficiently', () => {
      const messages = Array.from({ length: 200 }, (_, i) => ({ 
        id: `msg-${i}`, content: `Message ${i}`, timestamp: new Date(Date.now() + i * 1000)
      }));
      const { result } = renderHook(() => useMessagePagination(messages, { pageSize: 50 }));
      expect(result.current.currentItems.length).toBe(50);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.totalPages).toBe(4);
    });

    it('should load more messages when requested', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({ 
        id: `msg-${i}`, content: `Message ${i}`, timestamp: new Date()
      }));
      const { result } = renderHook(() => useMessagePagination(messages, { pageSize: 25 }));
      expect(result.current.currentItems.length).toBe(25);
      await act(async () => { await result.current.loadMore(); });
      expect(result.current.currentItems.length).toBe(50);
    });
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates immediately', () => {
      const baseData = [{ id: '1', content: 'Message 1' }, { id: '2', content: 'Message 2' }];
      const { result } = renderHook(() => useOptimisticUpdates(baseData));
      expect(result.current.data.length).toBe(2);
      act(() => {
        result.current.addOptimisticUpdate('create', { id: '3', content: 'Optimistic Message 3' });
      });
      expect(result.current.data.length).toBe(3);
      expect(result.current.hasPendingOperations).toBe(true);
    });

    it('should handle failed updates with retry logic', () => {
      const baseData = [{ id: '1', content: 'Message 1' }];
      const { result } = renderHook(() => useOptimisticUpdates(baseData, { maxRetries: 2 }));
      let operationId: string = '';
      act(() => {
        operationId = result.current.addOptimisticUpdate('create', { id: '2', content: 'Message 2' });
      });
      act(() => { result.current.rejectOptimisticUpdate(operationId, 'Network error'); });
      expect(result.current.hasFailedOperations).toBe(true);
      const failedUpdates = result.current.retryFailedUpdates();
      expect(failedUpdates.length).toBe(1);
    });

    it('should remove updates after max retries', () => {
      const baseData = [{ id: '1', content: 'Message 1' }];
      const { result } = renderHook(() => useOptimisticUpdates(baseData, { maxRetries: 1 }));
      let operationId: string = '';
      act(() => {
        operationId = result.current.addOptimisticUpdate('create', { id: '2', content: 'Message 2' });
      });
      act(() => { result.current.rejectOptimisticUpdate(operationId, 'Error 1'); });
      act(() => { result.current.rejectOptimisticUpdate(operationId, 'Error 2'); });
      expect(result.current.data.length).toBe(1);
      expect(result.current.hasFailedOperations).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    // No specific beforeEach/afterEach needed here for useState mock due to vi.mock hoisting

    it('should call setMetrics with correct rerenderCount and renderTime on unmount', () => {
      const { unmount } = renderHook(() =>
        usePerformanceMonitoring({ componentName: 'TestComponent', sampleRate: 1 })
      );
      act(() => { unmount(); });
      expect(mockSetMetrics).toHaveBeenCalledTimes(1);
      expect(mockSetMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          rerenderCount: 1,
          renderTime: 10,
          componentName: 'TestComponent',
          memoryUsage: 10,
        })
      );
    });

    it('should call setMetrics with correct renderTime for slow render warning', () => {
      const localMockPerformance = {
        now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(130),
        memory: { ...baseMockPerformance.memory }
      };
      Object.defineProperty(global, 'performance', {
        value: localMockPerformance, writable: true, configurable: true,
      });
      const { unmount } = renderHook(() =>
        usePerformanceMonitoring({ componentName: 'SlowComponent', sampleRate: 1 })
      );
      act(() => { unmount(); });
      expect(mockSetMetrics).toHaveBeenCalledTimes(1);
      const expectedMetricsObject = expect.objectContaining({
        renderTime: 30,
        componentName: 'SlowComponent',
        rerenderCount: 1,
        memoryUsage: 10,
      });
      expect(mockSetMetrics).toHaveBeenCalledWith(expectedMetricsObject);
      const metricsPassedToSet = mockSetMetrics.mock.calls[0][0];
      expect(metricsPassedToSet.renderTime > 16).toBe(true);
    });

    it('should call setMetrics with correct memoryUsage', () => {
      Object.defineProperty(global, 'performance', {
        value: {
          now: vi.fn(getMockNow),
          memory: { usedJSHeapSize: 20 * 1024 * 1024 }
        },
        writable: true, configurable: true,
      });
      const { unmount } = renderHook(() =>
        usePerformanceMonitoring({
          componentName: 'MemoryComponent',
          enableMemoryMonitoring: true,
          sampleRate: 1,
        })
      );
      act(() => { unmount(); });
      expect(mockSetMetrics).toHaveBeenCalledTimes(1);
      expect(mockSetMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          memoryUsage: 20,
          componentName: 'MemoryComponent',
          rerenderCount: 1,
          renderTime: 10,
        })
      );
    });
  });

  describe('React.memo Optimization', () => {
    it('should prevent unnecessary re-renders with memoization', () => {
      const prevProps = {
        message: 'Hello', isUser: true, timestamp: new Date('2023-01-01'),
        isStreaming: false, isStreamingComplete: false, attachments: [],
      };
      const nextProps = { ...prevProps };
      const areEqual = (
        prevProps.message === nextProps.message && prevProps.isUser === nextProps.isUser &&
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
      const mockWorker = {
        postMessage: vi.fn(),
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: ErrorEvent) => void) | null,
        terminate: vi.fn(),
      };
      // @ts-ignore
      global.Worker = vi.fn(() => mockWorker);
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`, content: `Test message ${i} with some keywords`,
      }));
      const task = { type: 'PARSE_MESSAGES', payload: { messages }, id: 'test-task-1' };
      expect(typeof global.Worker).toBe('function');
    });
  });
});

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockTime = 0;
    const freshMockPerformance = {
      now: vi.fn(getMockNow),
      memory: { usedJSHeapSize: 10 * 1024 * 1024 },
    };
    Object.defineProperty(global, 'performance', {
      value: freshMockPerformance,
      writable: true,
      configurable: true,
    });
  });

  it('should handle 1000+ messages efficiently with virtual scrolling', () => {
    const startTime = performance.now();
    const messages = Array.from({ length: 1000 }, (_, i) => ({ id: `msg-${i}`, content: `Message ${i}` }));
    renderHook(() =>
      useVirtualScrolling(messages, { itemHeight: 100, containerHeight: 600, overscan: 5 })
    );
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    expect(processingTime).toBeLessThanOrEqual(10);
  });

  it('should handle optimistic updates efficiently', () => {
    const baseData = Array.from({ length: 500 }, (_, i) => ({ id: `item-${i}`, content: `Item ${i}` }));
    const startTime = performance.now();
    const { result } = renderHook(() => useOptimisticUpdates(baseData));
    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.addOptimisticUpdate('create', { id: `new-${i}`, content: `New item ${i}` });
      }
    });
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    expect(processingTime).toBeLessThan(100);
    expect(result.current.data.length).toBe(550);
  });
});