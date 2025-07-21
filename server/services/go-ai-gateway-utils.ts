import { GoAIRequest, GoGatewayStats } from './go-ai-gateway-types.js';

/**
 * Convert Node.js AI request to Go format
 */
export function convertToGoRequest(
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
  // Convert conversation history to messages format
  const messages = conversationHistory.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content
  }));

  // Add current message
  messages.push({
    role: 'user' as const,
    content: message
  });

  const request: GoAIRequest = {
    id: `req_${messageId}_${Date.now()}`,
    provider: aiConfig.provider as 'openai' | 'google',
    model: aiConfig.model,
    messages,
    user_id: userId,
    conversation_id: conversationId,
    coaching_mode: coachingMode,
    auto_model_selection: automaticModelSelection,
    priority,
    metadata: {
      message_id: messageId,
      timestamp: new Date().toISOString()
    }
  };

  // Add attachments if any
  if (attachments && attachments.length > 0) {
    request.attachments = attachments.map(att => ({
      id: att.id,
      file_name: att.fileName,
      file_type: att.fileType,
      file_size: att.fileSize,
      url: att.url
    }));
  }

  return request;
}

/**
 * Get performance metrics in a format compatible with existing metrics
 */
export function formatPerformanceMetrics(stats: GoGatewayStats): Record<string, { avg: number; min: number; max: number; count: number }> {
  return {
    'ai_request_processing': {
      avg: stats.avg_processing_time_ms,
      min: 0, // Go service doesn't track min/max separately
      max: 0,
      count: stats.total_requests
    },
    'cache_hit_rate': {
      avg: stats.cache_hit_rate * 100,
      min: 0,
      max: 100,
      count: 1
    },
    'queue_utilization': {
      avg: (stats.queue_length / 1000) * 100, // Assuming max queue size of 1000
      min: 0,
      max: 100,
      count: 1
    }
  };
}

/**
 * Default environment configuration for Go AI Gateway
 */
export const GO_AI_GATEWAY_CONFIG = {
  DEFAULT_PORT: '8081',
  DEFAULT_LOG_LEVEL: 'info',
  DEFAULT_MAX_WORKERS: '8',
  DEFAULT_QUEUE_SIZE: '1000',
  DEFAULT_CACHE_TTL_MINUTES: '30',
  DEFAULT_BATCH_SIZE: '10',
  DEFAULT_BATCH_TIMEOUT_MS: '1000',
  DEFAULT_API_KEY: 'ai-gateway-dev-key',
  HEALTH_CHECK_INTERVAL: 30000,
  SERVICE_START_TIMEOUT: 30000,
  REQUEST_TIMEOUT: 60000,
  BATCH_TIMEOUT: 120000,
  ADMIN_TIMEOUT: 5000
} as const;