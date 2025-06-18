import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number; // TODO: RN-Adapt - This will be 0 or needs RN specific way to measure
  rerenderCount: number;
  lastRenderTimestamp: number;
  averageRenderTime: number;
  worstRenderTime: number;
  componentName: string;
}

interface UsePerformanceMonitoringOptions {
  componentName: string;
  enableMemoryMonitoring?: boolean; // This option will be less effective in RN without specific implementation
  sampleRate?: number; // 0-1, percentage of renders to monitor
}

export function usePerformanceMonitoring({
  componentName,
  enableMemoryMonitoring = true, // Note: web 'performance.memory' is not available in RN
  sampleRate = 0.1,
}: UsePerformanceMonitoringOptions) {
  const renderStartTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);
  const rerenderCount = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    rerenderCount: 0,
    lastRenderTimestamp: 0,
    averageRenderTime: 0,
    worstRenderTime: 0,
    componentName,
  });

  const startRenderMeasurement = useCallback(() => {
    if (Math.random() > sampleRate) return;
    // performance.now() is available in RN's JavaScriptCore
    renderStartTime.current = performance.now();
  }, [sampleRate]);

  const endRenderMeasurement = useCallback(() => {
    if (renderStartTime.current === 0) return;

    const renderTime = performance.now() - renderStartTime.current;
    renderTimes.current.push(renderTime);
    rerenderCount.current += 1;

    if (renderTimes.current.length > 100) {
      renderTimes.current = renderTimes.current.slice(-100);
    }

    const averageRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;
    const worstRenderTime = Math.max(...renderTimes.current);

    let memoryUsage = 0;
    // TODO: RN-Adapt - `performance.memory` is a web API and not available in React Native.
    // Memory monitoring in RN requires different tools/approaches (e.g., native modules, Flipper).
    // if (enableMemoryMonitoring && 'memory' in performance && (performance as any).memory) {
    //   const memory = (performance as any).memory;
    //   memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    // }

    setMetrics({
      renderTime,
      memoryUsage, // Will be 0 unless RN specific measurement is added
      rerenderCount: rerenderCount.current,
      lastRenderTimestamp: Date.now(),
      averageRenderTime,
      worstRenderTime,
      componentName,
    });

    renderStartTime.current = 0;
  }, [componentName, enableMemoryMonitoring]); // enableMemoryMonitoring is kept for potential future RN impl.

  useEffect(() => {
    startRenderMeasurement();

    return () => {
      endRenderMeasurement();
    };
  }); // Runs on every render

  const getPerformanceWarnings = useCallback(() => {
    const warnings: string[] = [];

    if (metrics.renderTime > 16) {
      warnings.push(`Slow render: ${metrics.renderTime.toFixed(2)}ms (>16ms)`);
    }
    if (metrics.rerenderCount > 50) { // Arbitrary threshold
      warnings.push(`High rerender count: ${metrics.rerenderCount}`);
    }
    // if (metrics.memoryUsage > 50 && enableMemoryMonitoring) { // Memory warning might be irrelevant/inaccurate
    //   warnings.push(`High memory usage: ${metrics.memoryUsage.toFixed(2)}MB (Note: Web API, not RN accurate)`);
    // }
    if (metrics.averageRenderTime > 10) {
      warnings.push(`High average render time: ${metrics.averageRenderTime.toFixed(2)}ms`);
    }
    return warnings;
  }, [metrics /*, enableMemoryMonitoring */]);

  const resetMetrics = useCallback(() => {
    renderTimes.current = [];
    rerenderCount.current = 0;
    setMetrics({
      renderTime: 0,
      memoryUsage: 0,
      rerenderCount: 0,
      lastRenderTimestamp: 0,
      averageRenderTime: 0,
      worstRenderTime: 0,
      componentName,
    });
  }, [componentName]);

  const logMetrics = useCallback(() => {
    // process.env.NODE_ENV should be available via Metro bundler settings
    if (process.env.NODE_ENV === 'development') {
      console.group(`Performance Metrics: ${componentName}`);
      console.log('Last Render Time:', `${metrics.renderTime.toFixed(2)}ms`);
      console.log('Average Render Time:', `${metrics.averageRenderTime.toFixed(2)}ms`);
      console.log('Worst Render Time:', `${metrics.worstRenderTime.toFixed(2)}ms`);
      console.log('Rerender Count:', metrics.rerenderCount);
      // if (enableMemoryMonitoring && metrics.memoryUsage > 0) {
      //   console.log('Memory Usage (Web API, not RN):', `${metrics.memoryUsage.toFixed(2)}MB`);
      // }
      const warnings = getPerformanceWarnings();
      if (warnings.length > 0) {
        console.warn('Performance Warnings:', warnings);
      }
      console.groupEnd();
    }
  }, [componentName, metrics, getPerformanceWarnings /*, enableMemoryMonitoring */]);

  return {
    metrics,
    getPerformanceWarnings,
    resetMetrics,
    logMetrics,
    isSlowRender: metrics.renderTime > 16,
    // hasHighMemoryUsage: metrics.memoryUsage > 50 && enableMemoryMonitoring, // Less reliable in RN
    hasHighRerenderCount: metrics.rerenderCount > 50,
  };
}
