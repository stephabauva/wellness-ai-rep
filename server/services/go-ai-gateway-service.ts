import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { 
  GoAIRequest, 
  GoAIResponse, 
  GoBatchRequest, 
  GoBatchResponse, 
  GoGatewayStats, 
  GoHealthStatus 
} from './go-ai-gateway-types.js';
import { convertToGoRequest, formatPerformanceMetrics, GO_AI_GATEWAY_CONFIG } from './go-ai-gateway-utils.js';

class GoAIGatewayService {
  private goProcess: ChildProcess | null = null;
  private serviceUrl: string;
  private isStarting = false;
  private startPromise: Promise<void> | null = null;
  private isHealthy = false;
  private lastHealthCheck = 0;
  private healthCheckInterval = GO_AI_GATEWAY_CONFIG.HEALTH_CHECK_INTERVAL;

  constructor() {
    this.serviceUrl = `http://localhost:${process.env.AI_GATEWAY_PORT || GO_AI_GATEWAY_CONFIG.DEFAULT_PORT}`;
  }

  /**
   * Start the Go AI Gateway service
   */
  async startService(): Promise<void> {
    if (this.goProcess || this.isStarting) {
      if (this.startPromise) {
        await this.startPromise;
      }
      return;
    }

    this.isStarting = true;
    this.startPromise = this._startServiceInternal();
    await this.startPromise;
    this.isStarting = false;
  }

  private async _startServiceInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const goServicePath = path.join(process.cwd(), 'go-ai-gateway');
      
      console.log('[GoAIGateway] Starting Go AI Gateway microservice...');
      
      // Build the Go service first
      const buildProcess = spawn('go', ['build', '-o', 'ai-gateway', '.'], {
        cwd: goServicePath,
        stdio: 'pipe'
      });

      buildProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[GoAIGateway] Failed to build Go AI Gateway service');
          reject(new Error('Failed to build Go AI Gateway service'));
          return;
        }

        // Start the built service
        this.goProcess = spawn('./ai-gateway', [], {
          cwd: goServicePath,
          stdio: 'pipe',
          env: {
            ...process.env,
            AI_GATEWAY_PORT: process.env.AI_GATEWAY_PORT || GO_AI_GATEWAY_CONFIG.DEFAULT_PORT,
            LOG_LEVEL: process.env.LOG_LEVEL || GO_AI_GATEWAY_CONFIG.DEFAULT_LOG_LEVEL,
            MAX_WORKERS: process.env.MAX_WORKERS || GO_AI_GATEWAY_CONFIG.DEFAULT_MAX_WORKERS,
            QUEUE_SIZE: process.env.QUEUE_SIZE || GO_AI_GATEWAY_CONFIG.DEFAULT_QUEUE_SIZE,
            CACHE_TTL_MINUTES: process.env.CACHE_TTL_MINUTES || GO_AI_GATEWAY_CONFIG.DEFAULT_CACHE_TTL_MINUTES,
            BATCH_SIZE: process.env.BATCH_SIZE || GO_AI_GATEWAY_CONFIG.DEFAULT_BATCH_SIZE,
            BATCH_TIMEOUT_MS: process.env.BATCH_TIMEOUT_MS || GO_AI_GATEWAY_CONFIG.DEFAULT_BATCH_TIMEOUT_MS,
            API_KEY: process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
          }
        });

        this.goProcess.stdout?.on('data', (data) => {
          console.log(`[GoAIGateway] ${data.toString().trim()}`);
        });

        this.goProcess.stderr?.on('data', (data) => {
          console.error(`[GoAIGateway] Error: ${data.toString().trim()}`);
        });

        this.goProcess.on('close', (code) => {
          console.log(`[GoAIGateway] Process exited with code ${code}`);
          this.goProcess = null;
          this.isHealthy = false;
        });

        // Wait for service to be ready
        this.waitForServiceReady()
          .then(() => {
            console.log('[GoAIGateway] AI Gateway service is ready');
            this.isHealthy = true;
            resolve();
          })
          .catch(reject);
      });
    });
  }

  private async waitForServiceReady(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.serviceUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          const health = await response.json() as GoHealthStatus;
          if (health.status === 'healthy' || health.status === 'degraded') {
            return;
          }
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Go AI Gateway service failed to start within timeout');
  }

  /**
   * Process a single AI request through the Go gateway
   */
  async processRequest(request: GoAIRequest): Promise<GoAIResponse> {
    await this.ensureServiceHealthy();

    const url = `${this.serviceUrl}/v1/chat`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(GO_AI_GATEWAY_CONFIG.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as GoAIResponse;
      
      console.log(`[GoAIGateway] Processed request ${request.id} in ${result.processing_time}ms`);
      return result;
    } catch (error) {
      console.error(`[GoAIGateway] Failed to process request ${request.id}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple AI requests as a batch
   */
  async processBatch(requests: GoAIRequest[]): Promise<GoBatchResponse> {
    await this.ensureServiceHealthy();

    const batchRequest: GoBatchRequest = {
      id: `batch_${Date.now()}`,
      requests,
      priority: 3
    };

    const url = `${this.serviceUrl}/v1/batch`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
        },
        body: JSON.stringify(batchRequest),
        signal: AbortSignal.timeout(GO_AI_GATEWAY_CONFIG.BATCH_TIMEOUT)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json() as GoBatchResponse;
      
      console.log(`[GoAIGateway] Processed batch of ${requests.length} requests in ${result.processing_time}ms`);
      return result;
    } catch (error) {
      console.error('[GoAIGateway] Failed to process batch:', error);
      throw error;
    }
  }

  /**
   * Get available AI models from the gateway
   */
  async getAvailableModels(): Promise<Record<string, any[]>> {
    await this.ensureServiceHealthy();

    try {
      const response = await fetch(`${this.serviceUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
        },
        signal: AbortSignal.timeout(GO_AI_GATEWAY_CONFIG.ADMIN_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as Record<string, any[]>;
    } catch (error) {
      console.error('[GoAIGateway] Failed to get available models:', error);
      throw error;
    }
  }

  /**
   * Get gateway statistics and performance metrics
   */
  async getStats(): Promise<GoGatewayStats> {
    await this.ensureServiceHealthy();

    try {
      const response = await fetch(`${this.serviceUrl}/admin/stats`, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
        },
        signal: AbortSignal.timeout(GO_AI_GATEWAY_CONFIG.ADMIN_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as GoGatewayStats;
    } catch (error) {
      console.error('[GoAIGateway] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<Record<string, any>> {
    await this.ensureServiceHealthy();

    try {
      const response = await fetch(`${this.serviceUrl}/admin/cache`, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
        },
        signal: AbortSignal.timeout(GO_AI_GATEWAY_CONFIG.ADMIN_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as Record<string, any>;
    } catch (error) {
      console.error('[GoAIGateway] Failed to get cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear the response cache
   */
  async clearCache(): Promise<void> {
    await this.ensureServiceHealthy();

    try {
      const response = await fetch(`${this.serviceUrl}/admin/cache`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': process.env.API_KEY || GO_AI_GATEWAY_CONFIG.DEFAULT_API_KEY,
        },
        signal: AbortSignal.timeout(GO_AI_GATEWAY_CONFIG.ADMIN_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[GoAIGateway] Cache cleared successfully');
    } catch (error) {
      console.error('[GoAIGateway] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Check if the Go service is healthy
   */
  async healthCheck(): Promise<GoHealthStatus> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(GO_AI_GATEWAY_CONFIG.ADMIN_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const health = await response.json() as GoHealthStatus;
      this.isHealthy = health.status === 'healthy' || health.status === 'degraded';
      this.lastHealthCheck = Date.now();
      
      return health;
    } catch (error) {
      console.error('[GoAIGateway] Health check failed:', error);
      this.isHealthy = false;
      throw error;
    }
  }

  /**
   * Ensure the service is healthy, start if needed
   */
  private async ensureServiceHealthy(): Promise<void> {
    const now = Date.now();
    
    // Check health periodically
    if (now - this.lastHealthCheck > this.healthCheckInterval || !this.isHealthy) {
      try {
        await this.healthCheck();
      } catch (error) {
        // If health check fails, try to start the service
        if (!this.goProcess) {
          console.log('[GoAIGateway] Service not running, starting...');
          await this.startService();
        } else {
          throw error;
        }
      }
    }

    if (!this.isHealthy) {
      throw new Error('Go AI Gateway service is not healthy');
    }
  }

  /**
   * Convert Node.js AI request to Go format
   */
  convertToGoRequest(
    message: string,
    userId: number,
    conversationId: string,
    messageId: number,
    coachingMode: string = "weight-loss",
    conversationHistory: any[] = [],
    aiConfig: { provider: string; model: string } = { provider: "openai", model: "gpt-4o" },
    attachments: any[] = [],
    automaticModelSelection: boolean = false,
    priority: number = 3
  ): GoAIRequest {
    return convertToGoRequest(
      message,
      userId,
      conversationId,
      messageId,
      coachingMode,
      conversationHistory,
      aiConfig,
      attachments,
      automaticModelSelection,
      priority
    );
  }

  /**
   * Stop the Go service
   */
  stopService(): void {
    if (this.goProcess) {
      console.log('[GoAIGateway] Stopping Go AI Gateway service...');
      this.goProcess.kill('SIGTERM');
      this.goProcess = null;
      this.isHealthy = false;
    }
  }

  /**
   * Get service status and performance info
   */
  async getServiceInfo(): Promise<any> {
    try {
      const [health, stats, cacheStats] = await Promise.all([
        this.healthCheck().catch(() => null),
        this.getStats().catch(() => null),
        this.getCacheStats().catch(() => null)
      ]);

      return {
        isRunning: !!this.goProcess,
        isHealthy: this.isHealthy,
        serviceUrl: this.serviceUrl,
        health,
        stats,
        cacheStats,
        lastHealthCheck: new Date(this.lastHealthCheck).toISOString()
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        isRunning: false,
        isHealthy: false,
        serviceUrl: this.serviceUrl,
        error: message,
        lastHealthCheck: new Date(this.lastHealthCheck).toISOString()
      };
    }
  }

  /**
   * Check if the service should be used based on configuration
   */
  isEnabled(): boolean {
    return process.env.USE_GO_AI_GATEWAY !== 'false';
  }

  /**
   * Get performance metrics in a format compatible with existing metrics
   */
  async getPerformanceMetrics(): Promise<Record<string, { avg: number; min: number; max: number; count: number }>> {
    try {
      const stats = await this.getStats();
      return formatPerformanceMetrics(stats);
    } catch (error) {
      console.error('[GoAIGateway] Failed to get performance metrics:', error);
      return {};
    }
  }
}

// Singleton instance
export const goAIGatewayService = new GoAIGatewayService();

// Graceful shutdown
process.on('SIGTERM', () => {
  goAIGatewayService.stopService();
});

process.on('SIGINT', () => {
  goAIGatewayService.stopService();
  process.exit(0);
});