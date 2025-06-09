import { CoachingMode } from "@shared/schema";

// Types needed from the original service, might need to be centralized later
export type AIProviderName = "openai" | "google";
export type OpenAIModel = "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo"; // Added gpt-4-turbo
export type GoogleModel = "gemini-2.0-flash-exp" | "gemini-1.5-pro";
export type ModelName = OpenAIModel | GoogleModel;

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export interface AvailableModels {
  [key: string]: ModelInfo[];
}

export interface AttachmentData {
  id?: string; // From database if already uploaded
  fileName: string;
  fileType: string;
  fileSize?: number;
  url?: string; // Path or URL to the file
  displayName?: string;
  // Potentially raw data if needed by provider directly, though paths are preferred for large files
  // data?: Buffer | string;
}

export interface MessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string; // data URI (base64) or actual URL if supported by provider
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'; // 'tool' for future use
  content: string | MessageContentPart[];
  // attachments?: AttachmentData[]; // Raw attachments, if provider needs to process them differently than MessageContentPart
  metadata?: {
    attachments?: AttachmentData[]; // Keeping this for historical messages
    [key: string]: any;
  };
  name?: string; // For tool calls
}

export interface ChatResponse {
  response: string;
  // We might add provider-specific details here later if needed
}

export interface HealthInsightsResponse {
  insights: string[];
  // We might add provider-specific details here later if needed
}

export interface ProviderChatMessage extends ChatMessage {
  // Provider-specific message fields can be added by extending this
  // For now, it's the same as ChatMessage
}

export interface ProviderConfig {
  model: ModelName;
  // Add other provider-specific configs like temperature, max_tokens if they are generic enough
  // Otherwise, they can be handled within the provider's implementation
}

export interface AiProvider {
  providerName: AIProviderName;

  generateChatResponse(
    messages: ProviderChatMessage[], // Expects messages in a somewhat standardized format
    config: ProviderConfig,
    // Below are context elements that might be handled differently by providers
    // or might be fully resolved into `messages` by a context service before reaching here.
    // For now, including them to acknowledge their role.
    attachments?: AttachmentData[] // Current message's attachments
  ): Promise<ChatResponse>;

  generateHealthInsights(
    healthData: any,
    config: ProviderConfig
  ): Promise<HealthInsightsResponse>;

  getAvailableModels(): AvailableModels;
}
