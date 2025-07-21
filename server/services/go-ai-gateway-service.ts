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
import { GoProcessManager } from './go-ai-gateway-process.js';
import { GoGatewayHttpClient } from './go-ai-gateway-http.js';

class GoAIGatewayService {
  private serviceUrl: string;
  private processManager: GoProcessManager;
  private httpClient: GoGatewayHttpClient;
  private isHealthy = false;
  private lastHealthCheck = 0;
  private healthCheckInterval = GO_AI_GATEWAY_CONFIG.HEALTH_CHECK_INTERVAL;

  constructor() {
    this.serviceUrl = `http://localhost:${process.env.AI_GATEWAY_PORT || GO_AI_GATEWAY_CONFIG.DEFAULT_PORT}`;
    this.processManager = new GoProcessManager(this.serviceUrl);
    this.httpClient = new GoGatewayHttpClient(this.serviceUrl);
  }

  /**
   * Start the Go AI Gateway service
   */
  async startService(): Promise<void> {
    await this.processManager.startService();
    this.isHealthy = true;
  }

  /**
   * Process a single AI request through the Go gateway
   */
  async processRequest(request: GoAIRequest): Promise<GoAIResponse> {
    await this.ensureServiceHealthy();
    return this.httpClient.processRequest(request);
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

    return this.httpClient.processBatch(batchRequest);
  }

  /**
   * Get available AI models from the gateway
   */
  async getAvailableModels(): Promise<Record<string, any[]>> {
    await this.ensureServiceHealthy();
    return this.httpClient.getAvailableModels();
  }

  /**
   * Get gateway statistics and performance metrics
   */
  async getStats(): Promise<GoGatewayStats> {
    await this.ensureServiceHealthy();
    return this.httpClient.getStats();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<Record<string, any>> {
    await this.ensureServiceHealthy();
    return this.httpClient.getCacheStats();
  }

  /**
   * Clear the response cache
   */
  async clearCache(): Promise<void> {
    await this.ensureServiceHealthy();
    return this.httpClient.clearCache();
  }

  /**
   * Check if the Go service is healthy
   */
  async healthCheck(): Promise<GoHealthStatus> {
    try {
      const health = await this.httpClient.healthCheck();
      this.isHealthy = health.status === 'healthy' || health.status === 'degraded';
      this.lastHealthCheck = Date.now();
      return health;
    } catch (error) {
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
        if (!this.processManager.getProcess()) {
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
    this.processManager.stopService();
    this.isHealthy = false;
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
        isRunning: !!this.processManager.getProcess(),
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