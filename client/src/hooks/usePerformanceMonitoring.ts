import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  rerenderCount: number;
  lastRenderTimestamp: number;
  averageRenderTime: number;
  worstRenderTime: number;
  componentName: string;
}

interface UsePerformanceMonitoringOptions {
  componentName: string;
  enableMemoryMonitoring?: boolean;
  sampleRate?: number; // 0-1, percentage of renders to monitor
}

export function usePerformanceMonitoring({
  componentName,
  enableMemoryMonitoring = true,
  sampleRate = 0.1, // Monitor 10% of renders by default
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

  // Start measuring render time
  const startRenderMeasurement = useCallback(() => {
    if (Math.random() > sampleRate) return; // Skip based on sample rate
    
    renderStartTime.current = performance.now();
  }, [sampleRate]);

  // End measuring render time
  const endRenderMeasurement = useCallback(() => {
    if (renderStartTime.current === 0) return; // Skip if not started
    
    const renderTime = performance.now() - renderStartTime.current;
    renderTimes.current.push(renderTime);
    rerenderCount.current += 1;
    
    // Keep only last 100 render times for memory efficiency
    if (renderTimes.current.length > 100) {
      renderTimes.current = renderTimes.current.slice(-100);
    }
    
    const averageRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;
    const worstRenderTime = Math.max(...renderTimes.current);
    
    let memoryUsage = 0;
    if (enableMemoryMonitoring && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }
    
    setMetrics({
      renderTime,
      memoryUsage,
      rerenderCount: rerenderCount.current,
      lastRenderTimestamp: Date.now(),
      averageRenderTime,
      worstRenderTime,
      componentName,
    });
    
    // Reset for next measurement
    renderStartTime.current = 0;
  }, [componentName, enableMemoryMonitoring]);

  // Measure render performance
  useEffect(() => {
    startRenderMeasurement();
    
    return () => {
      endRenderMeasurement();
    };
    // The functions startRenderMeasurement and endRenderMeasurement are stable
    // if their own dependencies (sampleRate, componentName, enableMemoryMonitoring)
    // do not change. This effect will run on mount and when these props change,
    // and cleanup on unmount or before re-running due to these prop changes.
  }, [startRenderMeasurement, endRenderMeasurement]);

  // Performance warning detection
  const getPerformanceWarnings = useCallback(() => {
    const warnings: string[] = [];
    
    if (metrics.renderTime > 16) { // 60fps threshold
      warnings.push(`Slow render: ${metrics.renderTime.toFixed(2)}ms (>16ms)`);
    }
    
    if (metrics.rerenderCount > 50) {
      warnings.push(`High rerender count: ${metrics.rerenderCount}`);
    }
    
    if (metrics.memoryUsage > 50) { // 50MB threshold
      warnings.push(`High memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
    }
    
    if (metrics.averageRenderTime > 10) {
      warnings.push(`High average render time: ${metrics.averageRenderTime.toFixed(2)}ms`);
    }
    
    return warnings;
  }, [metrics]);

  // Reset metrics
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

  // Log performance metrics (development only)
  const logMetrics = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`Performance Metrics: ${componentName}`);
      console.log('Last Render Time:', `${metrics.renderTime.toFixed(2)}ms`);
      console.log('Average Render Time:', `${metrics.averageRenderTime.toFixed(2)}ms`);
      console.log('Worst Render Time:', `${metrics.worstRenderTime.toFixed(2)}ms`);
      console.log('Rerender Count:', metrics.rerenderCount);
      if (enableMemoryMonitoring) {
        console.log('Memory Usage:', `${metrics.memoryUsage.toFixed(2)}MB`);
      }
      const warnings = getPerformanceWarnings();
      if (warnings.length > 0) {
        console.warn('Performance Warnings:', warnings);
      }
      console.groupEnd();
    }
  }, [componentName, metrics, enableMemoryMonitoring, getPerformanceWarnings]);

  return {
    metrics,
    getPerformanceWarnings,
    resetMetrics,
    logMetrics,
    isSlowRender: metrics.renderTime > 16,
    hasHighMemoryUsage: metrics.memoryUsage > 50,
    hasHighRerenderCount: metrics.rerenderCount > 50,
  };
}