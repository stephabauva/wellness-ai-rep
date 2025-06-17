/**
 * Phase 4: Production Deployment - Performance Monitoring
 * Comprehensive performance tracking with alerts and reporting
 */
export class MemoryPerformanceMonitor {
  private metrics = {
    memoryProcessingTime: [] as number[],
    systemPromptGenerationTime: [] as number[],
    deduplicationHitRate: 0,
    deduplicationChecks: 0,
    deduplicationHits: 0,
    chatResponseTimeImpact: [] as number[],
    errorRates: {
      memoryProcessing: 0,
      promptGeneration: 0,
      deduplication: 0
    },
    queueMetrics: {
      currentSize: 0,
      maxSize: 0,
      processingRate: 0
    },
    circuitBreakerTrips: 0,
    cacheHitRates: {
      embeddingCache: 0,
      promptCache: 0,
      memoryRetrievalCache: 0
    }
  };

  private alertThresholds = {
    memoryProcessingTime: 100, // ms
    chatResponseTimeIncrease: 10, // % increase
    errorRate: 1, // % error rate
    queueSize: 1000, // items
    deduplicationHitRate: 5 // % minimum hit rate
  };

  private readonly MAX_SAMPLES = 1000;
  private startTime = Date.now();

  /**
   * Track memory processing performance
   */
  trackMemoryProcessing(duration: number, success: boolean): void {
    this.metrics.memoryProcessingTime.push(duration);
    this.trimArray(this.metrics.memoryProcessingTime);

    if (!success) {
      this.metrics.errorRates.memoryProcessing++;
    }

    // Check alert threshold
    if (duration > this.alertThresholds.memoryProcessingTime) {
      this.triggerAlert('memory_processing_slow', {
        duration,
        threshold: this.alertThresholds.memoryProcessingTime
      });
    }
  }

  /**
   * Track system prompt generation performance
   */
  trackSystemPromptGeneration(duration: number, success: boolean): void {
    this.metrics.systemPromptGenerationTime.push(duration);
    this.trimArray(this.metrics.systemPromptGenerationTime);

    if (!success) {
      this.metrics.errorRates.promptGeneration++;
    }
  }

  /**
   * Track deduplication performance
   */
  trackDeduplication(wasHit: boolean, processingTime: number): void {
    this.metrics.deduplicationChecks++;
    if (wasHit) {
      this.metrics.deduplicationHits++;
    }

    // Update hit rate
    this.metrics.deduplicationHitRate = 
      (this.metrics.deduplicationHits / this.metrics.deduplicationChecks) * 100;

    // Check if hit rate is too low
    if (this.metrics.deduplicationChecks > 100 && 
        this.metrics.deduplicationHitRate < this.alertThresholds.deduplicationHitRate) {
      this.triggerAlert('deduplication_hit_rate_low', {
        currentRate: this.metrics.deduplicationHitRate,
        threshold: this.alertThresholds.deduplicationHitRate
      });
    }
  }

  /**
   * Track chat response time impact
   */
  trackChatResponseTime(baselineTime: number, actualTime: number): void {
    const impact = ((actualTime - baselineTime) / baselineTime) * 100;
    this.metrics.chatResponseTimeImpact.push(impact);
    this.trimArray(this.metrics.chatResponseTimeImpact);

    // Check if response time increased too much
    if (impact > this.alertThresholds.chatResponseTimeIncrease) {
      this.triggerAlert('chat_response_time_degraded', {
        impact,
        threshold: this.alertThresholds.chatResponseTimeIncrease,
        baselineTime,
        actualTime
      });
    }
  }

  /**
   * Track queue metrics
   */
  trackQueueMetrics(currentSize: number, processingRate: number): void {
    this.metrics.queueMetrics.currentSize = currentSize;
    this.metrics.queueMetrics.maxSize = Math.max(
      this.metrics.queueMetrics.maxSize, 
      currentSize
    );
    this.metrics.queueMetrics.processingRate = processingRate;

    // Check queue size alert
    if (currentSize > this.alertThresholds.queueSize) {
      this.triggerAlert('queue_size_exceeded', {
        currentSize,
        threshold: this.alertThresholds.queueSize
      });
    }
  }

  /**
   * Track circuit breaker trips
   */
  trackCircuitBreakerTrip(userId: number, reason: string): void {
    this.metrics.circuitBreakerTrips++;
    this.triggerAlert('circuit_breaker_tripped', { userId, reason });
  }

  /**
   * Track cache performance
   */
  trackCachePerformance(cacheType: keyof typeof this.metrics.cacheHitRates, hitRate: number): void {
    this.metrics.cacheHitRates[cacheType] = hitRate;
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    summary: any;
    detailed: any;
    alerts: any;
    recommendations: string[];
  } {
    const now = Date.now();
    const uptimeHours = (now - this.startTime) / (1000 * 60 * 60);

    const summary = {
      uptime: `${uptimeHours.toFixed(2)} hours`,
      avgMemoryProcessing: this.calculateAverage(this.metrics.memoryProcessingTime),
      avgPromptGeneration: this.calculateAverage(this.metrics.systemPromptGenerationTime),
      deduplicationHitRate: this.metrics.deduplicationHitRate,
      avgChatResponseImpact: this.calculateAverage(this.metrics.chatResponseTimeImpact),
      totalCircuitBreakerTrips: this.metrics.circuitBreakerTrips,
      status: this.getOverallStatus()
    };

    const detailed = {
      processingTimes: {
        memory: {
          avg: this.calculateAverage(this.metrics.memoryProcessingTime),
          p95: this.calculatePercentile(this.metrics.memoryProcessingTime, 95),
          p99: this.calculatePercentile(this.metrics.memoryProcessingTime, 99),
          samples: this.metrics.memoryProcessingTime.length
        },
        prompts: {
          avg: this.calculateAverage(this.metrics.systemPromptGenerationTime),
          p95: this.calculatePercentile(this.metrics.systemPromptGenerationTime, 95),
          p99: this.calculatePercentile(this.metrics.systemPromptGenerationTime, 99),
          samples: this.metrics.systemPromptGenerationTime.length
        }
      },
      errorRates: this.metrics.errorRates,
      queueMetrics: this.metrics.queueMetrics,
      cachePerformance: this.metrics.cacheHitRates
    };

    const recommendations = this.generateRecommendations();

    return {
      summary,
      detailed,
      alerts: this.getActiveAlerts(),
      recommendations
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      memoryProcessingTime: [],
      systemPromptGenerationTime: [],
      deduplicationHitRate: 0,
      deduplicationChecks: 0,
      deduplicationHits: 0,
      chatResponseTimeImpact: [],
      errorRates: {
        memoryProcessing: 0,
        promptGeneration: 0,
        deduplication: 0
      },
      queueMetrics: {
        currentSize: 0,
        maxSize: 0,
        processingRate: 0
      },
      circuitBreakerTrips: 0,
      cacheHitRates: {
        embeddingCache: 0,
        promptCache: 0,
        memoryRetrievalCache: 0
      }
    };
    this.startTime = Date.now();
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private trimArray(array: number[]): void {
    while (array.length > this.MAX_SAMPLES) {
      array.shift();
    }
  }

  private triggerAlert(type: string, data: any): void {
    console.warn(`[MemoryPerformanceMonitor] ALERT: ${type}`, data);
    // In production, this would send to monitoring service
  }

  private getActiveAlerts(): string[] {
    const alerts: string[] = [];
    
    const avgMemoryTime = this.calculateAverage(this.metrics.memoryProcessingTime);
    if (avgMemoryTime > this.alertThresholds.memoryProcessingTime) {
      alerts.push(`Memory processing time above threshold: ${avgMemoryTime.toFixed(2)}ms`);
    }

    const avgResponseImpact = this.calculateAverage(this.metrics.chatResponseTimeImpact);
    if (avgResponseImpact > this.alertThresholds.chatResponseTimeIncrease) {
      alerts.push(`Chat response time impact above threshold: ${avgResponseImpact.toFixed(2)}%`);
    }

    if (this.metrics.queueMetrics.currentSize > this.alertThresholds.queueSize) {
      alerts.push(`Queue size exceeded: ${this.metrics.queueMetrics.currentSize} items`);
    }

    return alerts;
  }

  private getOverallStatus(): 'healthy' | 'warning' | 'critical' {
    const alerts = this.getActiveAlerts();
    
    if (alerts.length === 0) return 'healthy';
    if (alerts.length <= 2) return 'warning';
    return 'critical';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const avgMemoryTime = this.calculateAverage(this.metrics.memoryProcessingTime);
    if (avgMemoryTime > 50) {
      recommendations.push('Consider enabling Go acceleration service for memory processing');
    }

    if (this.metrics.deduplicationHitRate < 10) {
      recommendations.push('Deduplication hit rate is low - review semantic hashing algorithm');
    }

    const avgCacheHitRate = Object.values(this.metrics.cacheHitRates).reduce((a, b) => a + b, 0) / 3;
    if (avgCacheHitRate < 50) {
      recommendations.push('Cache hit rates are low - consider increasing cache TTL or size');
    }

    if (this.metrics.circuitBreakerTrips > 10) {
      recommendations.push('High number of circuit breaker trips - investigate error patterns');
    }

    return recommendations;
  }
}

export const memoryPerformanceMonitor = new MemoryPerformanceMonitor();