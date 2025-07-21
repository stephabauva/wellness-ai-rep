import fetch from 'node-fetch';
import { 
  GoAIRequest, 
  GoAIResponse, 
  GoBatchRequest, 
  GoBatchResponse, 
  GoGatewayStats, 
  GoHealthStatus 
} from './go-ai-gateway-types.js';
import { GO_AI_GATEWAY_CONFIG } from './go-ai-gateway-utils.js';

/**
 * HTTP client utilities for Go AI Gateway communication
 */
export class GoGatewayHttpClient {
  private serviceUrl: string;

  constructor(serviceUrl: string) {
    this.serviceUrl = serviceUrl;
  }

  /**
   * Process a single AI request through the Go gateway
   */
  async processRequest(request: GoAIRequest): Promise<GoAIResponse> {
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
  async processBatch(batchRequest: GoBatchRequest): Promise<GoBatchResponse> {
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
      
      console.log(`[GoAIGateway] Processed batch of ${batchRequest.requests.length} requests in ${result.processing_time}ms`);
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
      return health;
    } catch (error) {
      console.error('[GoAIGateway] Health check failed:', error);
      throw error;
    }
  }
}