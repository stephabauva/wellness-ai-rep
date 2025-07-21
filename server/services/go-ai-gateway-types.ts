// Types for Go AI Gateway integration

export interface GoAIRequest {
  id?: string;
  provider: 'openai' | 'google';
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  user_id: number;
  conversation_id: string;
  coaching_mode?: string;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    url?: string;
    data?: Buffer;
  }>;
  auto_model_selection?: boolean;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface GoAIResponse {
  id: string;
  request_id: string;
  provider: 'openai' | 'google';
  model: string;
  content: string;
  finish_reason?: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  processing_time: number;
  cache_hit: boolean;
  retry_attempt: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface GoBatchRequest {
  id?: string;
  requests: GoAIRequest[];
  priority?: number;
}

export interface GoBatchResponse {
  id: string;
  responses: GoAIResponse[];
  processing_time: number;
  success_count: number;
  error_count: number;
  timestamp: string;
}

export interface GoGatewayStats {
  uptime: number;
  total_requests: number;
  cache_hit_rate: number;
  avg_processing_time_ms: number;
  queue_length: number;
  active_workers: number;
  connection_pools: Array<{
    provider: string;
    active_connections: number;
    idle_connections: number;
    max_connections: number;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time_ms: number;
  }>;
  error_rate: number;
  requests_per_second: number;
  memory_usage_bytes: number;
}

export interface GoHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  stats: GoGatewayStats;
  providers: Record<string, boolean>;
  errors?: string[];
}