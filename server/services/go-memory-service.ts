import { performance } from 'perf_hooks';
import { MemoryEntry } from '../../shared/schema';

interface RelevantMemory extends MemoryEntry {
  relevanceScore: number;
  retrievalReason: string;
}

interface GoMemoryServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  enabled: boolean;
}

interface SimilarityRequest {
  vectorA: number[];
  vectorB: number[];
}

interface SimilarityResponse {
  similarity: number;
  timestamp: string;
}

interface BatchSimilarityRequest {
  baseVector: number[];
  vectors: number[][];
}

interface BatchSimilarityResponse {
  results: number[];
  timestamp: string;
}

interface ContextualMemoryRequest {
  userId: number;
  contextEmbedding: number[];
  userMemories: MemoryEntry[];
  similarityThreshold: number;
  maxResults: number;
}

interface ProcessMemoryRequest {
  type: string;
  priority: number;
  payload: Record<string, any>;
}

interface GoServiceStats {
  queueSize: number;
  processedTasks: number;
  failedTasks: number;
  activeWorkers: number;
  maxWorkers: number;
  cacheSize: number;
  cacheHitRate: number;
  averageProcessingTime: number;
  totalSimilarityCalcs: number;
  totalEmbeddingOps: number;
  memoryUsageMB: number;
  goroutineCount: number;
  uptime: number;
  taskTypeStats: Record<string, number>;
  performanceMetrics: Record<string, number>;
  timestamp: string;
}

export class GoMemoryService {
  private config: GoMemoryServiceConfig;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval: number = 30000; // 30 seconds
  private performanceMetrics: Record<string, number[]> = {};

  constructor() {
    this.config = {
      baseUrl: process.env.GO_MEMORY_SERVICE_URL || 'http://localhost:3001',
      timeout: 30000, // 30 seconds
      retries: 3,
      enabled: process.env.GO_MEMORY_SERVICE_ENABLED === 'true' || false
    };
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  private async startHealthMonitoring(): Promise<void> {
    if (!this.config.enabled) return;
    
    // Initial health check
    await this.checkHealth();
    
    // Periodic health checks
    setInterval(async () => {
      await this.checkHealth();
    }, this.healthCheckInterval);
  }

  private async checkHealth(): Promise<boolean> {
    if (!this.config.enabled) return false;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      this.isHealthy = response.ok;
      this.lastHealthCheck = new Date();
      
      if (!this.isHealthy) {
        console.warn('[GoMemoryService] Health check failed:', response.status);
      }
      
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
      console.warn('[GoMemoryService] Health check error:', error);
      return false;
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = this.config.retries
  ): Promise<T> {
    if (!this.config.enabled || !this.isHealthy) {
      throw new Error('Go Memory Service is not available');
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (retries > 0 && error instanceof Error && !error.message.includes('abort')) {
        console.warn(`[GoMemoryService] Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        return this.makeRequest<T>(endpoint, options, retries - 1);
      }
      
      throw error;
    }
  }

  private recordPerformanceMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics[operation]) {
      this.performanceMetrics[operation] = [];
    }
    
    this.performanceMetrics[operation].push(duration);
    
    // Keep only last 100 measurements
    if (this.performanceMetrics[operation].length > 100) {
      this.performanceMetrics[operation] = this.performanceMetrics[operation].slice(-100);
    }
  }

  /**
   * Calculate cosine similarity between two vectors using Go service
   */
  async calculateCosineSimilarity(vectorA: number[], vectorB: number[]): Promise<number> {
    const start = performance.now();
    
    try {
      const request: SimilarityRequest = { vectorA, vectorB };
      const response = await this.makeRequest<SimilarityResponse>('/api/memory/similarity', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      const duration = performance.now() - start;
      this.recordPerformanceMetric('similarity_calculation', duration);
      
      return response.similarity;
    } catch (error) {
      console.error('[GoMemoryService] Similarity calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity for multiple vectors in batch using Go service
   */
  async calculateBatchSimilarity(baseVector: number[], vectors: number[][]): Promise<number[]> {
    const start = performance.now();
    
    try {
      const request: BatchSimilarityRequest = { baseVector, vectors };
      const response = await this.makeRequest<BatchSimilarityResponse>('/api/memory/batch-similarity', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      const duration = performance.now() - start;
      this.recordPerformanceMetric('batch_similarity_calculation', duration);
      
      return response.results;
    } catch (error) {
      console.error('[GoMemoryService] Batch similarity calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get contextual memories using optimized Go algorithms
   */
  async getContextualMemories(
    userId: number,
    contextEmbedding: number[],
    userMemories: MemoryEntry[],
    similarityThreshold: number = 0.7,
    maxResults: number = 8
  ): Promise<RelevantMemory[]> {
    const start = performance.now();
    
    try {
      const request: ContextualMemoryRequest = {
        userId,
        contextEmbedding,
        userMemories: userMemories.map(memory => ({
          ...memory,
          embedding: typeof memory.embedding === 'string' 
            ? JSON.parse(memory.embedding) 
            : memory.embedding
        })),
        similarityThreshold,
        maxResults
      };
      
      const response = await this.makeRequest<RelevantMemory[]>('/api/memory/contextual', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      const duration = performance.now() - start;
      this.recordPerformanceMetric('contextual_memory_retrieval', duration);
      
      return response;
    } catch (error) {
      console.error('[GoMemoryService] Contextual memory retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Add background memory processing task
   */
  async addBackgroundTask(
    type: string,
    payload: Record<string, any>,
    priority: number = 1
  ): Promise<void> {
    try {
      const request: ProcessMemoryRequest = { type, payload, priority };
      await this.makeRequest<{ status: string }>('/api/memory/process', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error('[GoMemoryService] Background task submission failed:', error);
      throw error;
    }
  }

  /**
   * Get Go service statistics and performance metrics
   */
  async getStats(): Promise<GoServiceStats> {
    try {
      return await this.makeRequest<GoServiceStats>('/api/memory/stats');
    } catch (error) {
      console.error('[GoMemoryService] Stats retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Check if Go service is available and healthy
   */
  isAvailable(): boolean {
    const staleThreshold = 60000; // 1 minute
    const isHealthCheckRecent = (Date.now() - this.lastHealthCheck.getTime()) < staleThreshold;
    
    return this.config.enabled && this.isHealthy && isHealthCheckRecent;
  }

  /**
   * Get performance metrics for the Go service integration
   */
  getPerformanceMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const metrics: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    for (const [operation, durations] of Object.entries(this.performanceMetrics)) {
      if (durations.length === 0) continue;
      
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      metrics[operation] = { avg, min, max, count: durations.length };
    }
    
    return metrics;
  }

  /**
   * Enable or disable the Go service
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (enabled && !this.isHealthy) {
      // Trigger immediate health check
      this.checkHealth();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): GoMemoryServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(updates: Partial<GoMemoryServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Singleton instance
export const goMemoryService = new GoMemoryService();