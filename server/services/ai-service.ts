import { CoachingMode, coachingModes } from "@shared/schema";
import { memoryService } from "./memory-service";
import { enhancedMemoryService } from "./enhanced-memory-service";
import { chatContextService } from "./chat-context-service";
import { OpenAiProvider } from "./providers/openai-provider";
import { GoogleProvider } from "./providers/google-provider";
import { cacheService } from "./cache-service";
import { goAIGatewayService } from "./go-ai-gateway-service";
import {
  AiProvider,
  AttachmentData,
  AvailableModels,
  ChatResponse,
  HealthInsightsResponse,
  AIProviderName,
  ModelName,
  ProviderChatMessage,
} from "./providers/ai-provider.interface";

const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[AiService] ${message}`, data || '');
};

interface AiServiceConfig {
  provider: AIProviderName;
  model: ModelName;
}

class AiService {
  private providers: Map<AIProviderName, AiProvider>;
  public chatContextService = chatContextService;

  constructor() {
    this.providers = new Map();
    if (process.env.OPENAI_API_KEY) {
      this.providers.set("openai", new OpenAiProvider());
      log('info', 'OpenAI provider registered.');
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      this.providers.set("google", new GoogleProvider());
      log('info', 'Google provider registered.');
    }
  }

  private selectOptimalModel(
    userMessage: string,
    attachments: AttachmentData[] = [],
    currentConfig: AiServiceConfig
  ): AiServiceConfig {
    const hasImages = attachments.some(att => att.fileType?.startsWith('image/'));
    const hasPDFs = attachments.some(att => att.fileType === 'application/pdf');
    const isComplexQuery = userMessage.toLowerCase().includes('analyze') || userMessage.length > 200;

    log('info', 'Selecting model...', { hasImages, isComplexQuery });

    if (hasImages && this.providers.has('google')) {
        log('info', '[selectOptimalModel] Image detected, selecting Google gemini-1.5-pro.');
        return { provider: "google", model: "gemini-1.5-pro" };
    }
    if (hasImages && this.providers.has('openai')) {
        log('info', '[selectOptimalModel] Image detected, Google unavailable, selecting OpenAI gpt-4o.');
        return { provider: "openai", model: "gpt-4o" };
    }

    if ((hasPDFs || isComplexQuery) && this.providers.has('google')) {
        log('info', '[selectOptimalModel] PDF/Complex query detected, selecting Google gemini-1.5-pro.');
        return { provider: "google", model: "gemini-1.5-pro" };
    }
    if ((hasPDFs || isComplexQuery) && this.providers.has('openai')) {
        log('info', '[selectOptimalModel] PDF/Complex query detected, Google unavailable, selecting OpenAI gpt-4o.');
        return { provider: "openai", model: "gpt-4o" };
    }

    if (!hasImages && !hasPDFs && !isComplexQuery) { // This is a simple query
      if (this.providers.has('google')) {
        log('info', '[selectOptimalModel] Simple query, selecting Google gemini-2.0-flash-exp.');
        return { provider: "google", model: "gemini-2.0-flash-exp" };
      }
      if (this.providers.has('openai')) {
        log('info', '[selectOptimalModel] Simple query, Google unavailable, selecting OpenAI gpt-4o-mini.');
        return { provider: "openai", model: "gpt-4o-mini" };
      }
    }

    // If automatic selection didn't override, and the original provider/model from input is available, use it.
    if (this.providers.has(currentConfig.provider)) {
        log('info', `[selectOptimalModel] No specific rule matched or primary provider for rule unavailable. Using current config: ${currentConfig.provider} - ${currentConfig.model}`);
        return currentConfig;
    }

    // New explicit fallback logic:
    log('warn', '[selectOptimalModel] Current config provider not available or no specific rule met by an available provider. Applying general fallback...');
    const modelForSimpleQuery = !hasImages && !hasPDFs && !isComplexQuery;

    if (this.providers.has('google')) {
        const model = modelForSimpleQuery ? "gemini-2.0-flash-exp" : "gemini-1.5-pro";
        log('warn', `[selectOptimalModel] General fallback to Google provider. Model: ${model}`);
        return { provider: "google", model: model as ModelName };
    }
    if (this.providers.has('openai')) {
        const model = modelForSimpleQuery ? "gpt-4o-mini" : "gpt-4o";
        log('warn', `[selectOptimalModel] General fallback to OpenAI provider. Model: ${model}`);
        return { provider: "openai", model: model as ModelName };
    }

    throw new Error("No AI providers available for optimal model selection.");
  }

  async getChatResponse(
    message: string,
    userId: number,
    conversationId: string,
    messageId: number,
    coachingMode: string = "weight-loss",
    conversationHistory: any[] = [],
    aiConfigInput: { provider: string; model: string } = { provider: "openai", model: "gpt-4o" },
    attachments: AttachmentData[] = [],
    automaticModelSelection: boolean = false
  ): Promise<{ response: string; memoryInfo?: any; conversationId?: string }> {
    let currentAiConfig: AiServiceConfig = {
        provider: aiConfigInput.provider as AIProviderName,
        model: aiConfigInput.model as ModelName
    };

    try {
      if (this.providers.size === 0) throw new Error("No AI providers registered.");

      if (automaticModelSelection) {
        currentAiConfig = this.selectOptimalModel(message, attachments, currentAiConfig);
      }

      log('info', `Using AI provider: ${currentAiConfig.provider}, Model: ${currentAiConfig.model}`);

      // Tier 3 A: Try Go AI Gateway first for optimal performance
      if (goAIGatewayService.isEnabled()) {
        try {
          const goResponse = await this.tryGoAIGateway(
            message, userId, conversationId, messageId, coachingMode,
            conversationHistory, currentAiConfig, attachments, automaticModelSelection
          );
          if (goResponse) {
            log('info', '[AiService] Successfully processed request through Go AI Gateway');
            return goResponse;
          }
        } catch (goError) {
          log('warn', '[AiService] Go AI Gateway failed, falling back to Node.js providers:', {
            error: goError instanceof Error ? goError.message : String(goError)
          });
        }
      }

      // Fallback to existing Node.js providers
      return await this.processWithNodeProviders(
        message, userId, conversationId, messageId, coachingMode,
        conversationHistory, currentAiConfig, attachments
      );

    } catch (error) {
      log('error', 'Error in getChatResponse (AiService):', { 
        message: error instanceof Error ? error.message : String(error), 
        config: currentAiConfig 
      });
      return {
        response: "I apologize, but I'm having trouble with my systems. Please try again later.",
        conversationId,
        memoryInfo: { memoriesUsed: 0, newMemoriesProcessing: true }
      };
    }
  }

  // Tier 3 A: Go AI Gateway integration method
  private async tryGoAIGateway(
    message: string,
    userId: number,
    conversationId: string,
    messageId: number,
    coachingMode: string,
    conversationHistory: any[],
    currentAiConfig: AiServiceConfig,
    attachments: AttachmentData[],
    automaticModelSelection: boolean
  ): Promise<{ response: string; memoryInfo?: any; conversationId?: string } | null> {
    try {
      // Fire and forget memory processing (non-blocking)
      const memoryProcessingPromise = memoryService.processMessageForMemory(
        userId, message, conversationId, messageId, conversationHistory
      )
      .then(memoryResult => {
        log('info', '[AiService] Go Gateway: Asynchronous memory processing completed.', {
          conversationId,
          messageId,
          newMemories: {
            explicit: !!memoryResult?.explicitMemory,
            autoDetected: !!memoryResult?.autoDetectedMemory
          }
        });
        return memoryResult;
      })
      .catch(error => {
        log('error', '[AiService] Go Gateway: Asynchronous memory processing failed.', {
          conversationId,
          messageId,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      });

      // Parallel execution of context building and memory retrieval
      const [contextMessages, relevantMemoriesFromContext] = await Promise.all([
        chatContextService.buildChatContext(
          userId, message, conversationId, coachingMode,
          conversationHistory, attachments, currentAiConfig.provider
        ),
        memoryService.getContextualMemories(userId, conversationHistory, message)
      ]);

      // Convert to Go AI Gateway request format
      const goRequest = goAIGatewayService.convertToGoRequest(
        message, userId, conversationId, messageId, coachingMode,
        contextMessages, // Use built context instead of raw history
        currentAiConfig,
        attachments,
        automaticModelSelection,
        3 // Default priority
      );

      // Process through Go AI Gateway
      const goResponse = await goAIGatewayService.processRequest(goRequest);

      // Log memory usage in parallel (non-blocking)
      if (relevantMemoriesFromContext.length > 0) {
        memoryService.logMemoryUsage(relevantMemoriesFromContext, conversationId, true)
          .catch(error => log('warn', 'Failed to log memory usage:', error));
      }

      return {
        response: goResponse.content,
        memoryInfo: {
          memoriesUsed: relevantMemoriesFromContext.length,
          newMemoriesProcessing: true,
          goGatewayUsed: true,
          processingTime: goResponse.processing_time,
          cacheHit: goResponse.cache_hit,
          retryAttempt: goResponse.retry_attempt
        }
      };

    } catch (error) {
      log('error', '[AiService] Go AI Gateway processing failed:', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        messageId
      });
      return null; // Return null to trigger fallback
    }
  }

  // Existing Node.js provider processing (extracted from original getChatResponse)
  private async processWithNodeProviders(
    message: string,
    userId: number,
    conversationId: string,
    messageId: number,
    coachingMode: string,
    conversationHistory: any[],
    currentAiConfig: AiServiceConfig,
    attachments: AttachmentData[]
  ): Promise<{ response: string; memoryInfo?: any; conversationId?: string }> {
    let providerToUse = this.providers.get(currentAiConfig.provider);
    if (!providerToUse) {
        log('error', `Provider ${currentAiConfig.provider} not found or not registered. Attempting fallback.`);
        if (this.providers.size > 0) {
            const fallbackProvider = this.providers.keys().next().value as AIProviderName;
            currentAiConfig.provider = fallbackProvider;
            currentAiConfig.model = currentAiConfig.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-exp';
            log('info', `Fell back to provider ${currentAiConfig.provider} with model ${currentAiConfig.model}`);
            providerToUse = this.providers.get(currentAiConfig.provider);
        } else {
            throw new Error(`Provider ${currentAiConfig.provider} not available and no fallback providers registered.`);
        }
    }
    if (!providerToUse) throw new Error(`Critical: Provider ${currentAiConfig.provider} could not be resolved.`);

    // Fire and forget memory processing, don't let it block the response
    const memoryProcessingPromise = memoryService.processMessageForMemory(
      userId, message, conversationId, messageId, conversationHistory
    )
    .then(memoryResult => {
      log('info', '[AiService] Node.js: Asynchronous memory processing completed.', {
        conversationId: conversationId,
        messageId: messageId,
        newMemories: {
          explicit: !!memoryResult?.explicitMemory,
          autoDetected: !!memoryResult?.autoDetectedMemory
        }
      });
      return memoryResult;
    })
    .catch(error => {
      log('error', '[AiService] Node.js: Asynchronous memory processing failed.', {
        conversationId: conversationId,
        messageId: messageId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    });

    // Parallel execution of context building and memory retrieval
    const [contextMessages, relevantMemoriesFromContext] = await Promise.all([
      chatContextService.buildChatContext(
        userId, message, conversationId, coachingMode,
        conversationHistory, attachments, currentAiConfig.provider
      ),
      memoryService.getContextualMemories(userId, conversationHistory, message)
    ]);

    // Execute AI API call
    const { response } = await providerToUse.generateChatResponse(
      contextMessages, { model: currentAiConfig.model }
    );

    // Log memory usage in parallel (non-blocking)
    if (relevantMemoriesFromContext.length > 0) {
      memoryService.logMemoryUsage(relevantMemoriesFromContext, conversationId, true)
        .catch(error => log('warn', 'Failed to log memory usage:', error));
    }

    return {
      response,
      memoryInfo: {
        memoriesUsed: relevantMemoriesFromContext.length,
        newMemoriesProcessing: true,
        goGatewayUsed: false
      }
    };
  }

  // New method for streaming responses (Tier 1 B optimization)
  async getChatResponseStream(
    message: string,
    userId: number,
    conversationId: string,
    messageId: number,
    coachingMode: string = "weight-loss",
    conversationHistory: any[] = [],
    aiConfigInput: { provider: string; model: string } = { provider: "openai", model: "gpt-4o" },
    attachments: AttachmentData[] = [],
    automaticModelSelection: boolean = false,
    onChunk?: (chunk: string) => void,
    onComplete?: (response: string) => void,
    onError?: (error: Error) => void
  ): Promise<{ response: string; memoryInfo?: any; conversationId?: string }> {
    let currentAiConfig: AiServiceConfig = {
        provider: aiConfigInput.provider as AIProviderName,
        model: aiConfigInput.model as ModelName
    };

    try {
      if (this.providers.size === 0) throw new Error("No AI providers registered.");

      if (automaticModelSelection) {
        currentAiConfig = this.selectOptimalModel(message, attachments, currentAiConfig);
      }

      let providerToUse = this.providers.get(currentAiConfig.provider);
      if (!providerToUse) {
          if (this.providers.size > 0) {
              const availableProviders = Array.from(this.providers.keys());
              const fallbackProvider = availableProviders[0];
              if (fallbackProvider) {
                currentAiConfig.provider = fallbackProvider;
                currentAiConfig.model = currentAiConfig.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-exp';
                providerToUse = this.providers.get(currentAiConfig.provider);
              }
          } else {
              throw new Error(`Provider ${aiConfigInput.provider} not available and no fallback providers registered.`);
          }
      }
      if (!providerToUse) throw new Error(`Critical: Provider ${currentAiConfig.provider} could not be resolved.`);

      log('info', `Using AI provider for streaming: ${currentAiConfig.provider}, Model: ${currentAiConfig.model}`);

      // Start memory processing in parallel (non-blocking)
      const memoryProcessingPromise = memoryService.processMessageForMemory(
        userId, message, conversationId, messageId, conversationHistory
      ).catch(error => {
        log('error', '[AiService] Stream memory processing failed:', error);
        return null;
      });

      // Parallel execution of context building and memory retrieval
      const [contextMessages, relevantMemoriesFromContext] = await Promise.all([
        chatContextService.buildChatContext(
          userId, message, conversationId, coachingMode,
          conversationHistory, attachments, currentAiConfig.provider
        ),
        memoryService.getContextualMemories(userId, conversationHistory, message)
      ]);

      // Use real streaming from provider
      let fullResponse = '';
      
      if (providerToUse.generateChatResponseStream && onChunk) {
        await providerToUse.generateChatResponseStream(
          contextMessages,
          { model: currentAiConfig.model },
          (chunk: string) => {
            fullResponse += chunk;
            onChunk(chunk);
          },
          (complete: string) => {
            if (onComplete) onComplete(complete);
          },
          (error: Error) => {
            if (onError) onError(error);
          }
        );
      } else {
        // Fallback to regular response
        const { response } = await providerToUse.generateChatResponse(
          contextMessages, { model: currentAiConfig.model }
        );
        fullResponse = response;
        if (onComplete) onComplete(response);
      }

      // Log memory usage in parallel
      if (relevantMemoriesFromContext.length > 0) {
        memoryService.logMemoryUsage(relevantMemoriesFromContext, conversationId, true)
          .catch(error => log('warn', 'Failed to log memory usage:', error));
      }

      return {
        response: fullResponse,
        memoryInfo: {
          memoriesUsed: relevantMemoriesFromContext.length,
          newMemoriesProcessing: true
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', 'Error in getChatResponseStream:', { message: errorMessage, config: currentAiConfig });
      if (onError) onError(error instanceof Error ? error : new Error(errorMessage));
      return {
        response: "I apologize, but I'm having trouble with my systems. Please try again later.",
        conversationId,
        memoryInfo: { memoriesUsed: 0, newMemoriesProcessing: true }
      };
    }
  }

  async getHealthInsights(
    healthData: any,
    aiConfigInput: { provider: string; model: string } = { provider: "openai", model: "gpt-4o" }
  ): Promise<HealthInsightsResponse> {
     let currentAiConfig: AiServiceConfig = {
        provider: aiConfigInput.provider as AIProviderName,
        model: aiConfigInput.model as ModelName
    };

    try {
      if (this.providers.size === 0) throw new Error("No AI providers available.");

      let provider = this.providers.get(currentAiConfig.provider);
      if (!provider) {
        const firstAvailable = this.providers.keys().next().value;
        if (!firstAvailable) throw new Error("No fallback provider for health insights.");
        provider = this.providers.get(firstAvailable); // Get the actual provider instance
        currentAiConfig = { provider: firstAvailable, model: (firstAvailable === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-exp') as ModelName };
        log('info', `Fell back to ${currentAiConfig.provider} for health insights.`);
      }

      if (!provider) throw new Error("Provider could not be resolved for health insights."); // Should be caught by previous checks
      return await provider.generateHealthInsights(healthData, { model: currentAiConfig.model });

    } catch (error) {
      log('error', 'Error in getHealthInsights (AiService):', error);
      return { insights: ["Could not retrieve health insights currently."] };
    }
  }

  getAvailableModels(): AvailableModels {
    const allModels: AvailableModels = {};
    this.providers.forEach((provider, name) => { // Iterate over map entries
      const providerModels = provider.getAvailableModels();
      // Ensure the structure is { providerName: [models] }
      if (providerModels[name]) {
         allModels[name] = providerModels[name];
      } else {
         // If getAvailableModels() returns a different structure, adapt here or log warning
         log('warn', `Models from provider ${name} not in expected format.`, providerModels);
      }
    });
    return allModels;
  }

  // Public method to access providers (for streaming endpoint)
  getProvider(providerName: AIProviderName): AiProvider | undefined {
    return this.providers.get(providerName);
  }

  // Public method to check if provider exists
  hasProvider(providerName: AIProviderName): boolean {
    return this.providers.has(providerName);
  }
}

export const aiService = new AiService();
