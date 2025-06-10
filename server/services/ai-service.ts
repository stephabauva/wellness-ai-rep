import { CoachingMode, coachingModes } from "@shared/schema";
import { memoryService } from "./memory-service";
import { chatContextService } from "./chat-context-service";
import { OpenAiProvider } from "./providers/openai-provider";
import { GoogleProvider } from "./providers/google-provider";
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

      let providerToUse = this.providers.get(currentAiConfig.provider);
      if (!providerToUse) {
          log('error', `Provider ${currentAiConfig.provider} not found or not registered. Attempting fallback.`);
          if (this.providers.size > 0) {
              currentAiConfig.provider = this.providers.keys().next().value;
              currentAiConfig.model = currentAiConfig.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.0-flash-exp';
              log('info', `Fell back to provider ${currentAiConfig.provider} with model ${currentAiConfig.model}`);
              providerToUse = this.providers.get(currentAiConfig.provider);
          } else {
              throw new Error(`Provider ${aiConfigInput.provider} not available and no fallback providers registered.`);
          }
      }
      if (!providerToUse) throw new Error(`Critical: Provider ${currentAiConfig.provider} could not be resolved.`);

      log('info', `Using AI provider: ${currentAiConfig.provider}, Model: ${currentAiConfig.model}`);

      // Fire and forget memory processing, don't let it block the response
      memoryService.processMessageForMemory(
        userId, message, conversationId, messageId, conversationHistory
      )
      .then(memoryResult => {
        // Log success or any relevant info from memoryResult if needed
        log('info', '[AiService] Asynchronous memory processing completed.', {
          conversationId: conversationId,
          messageId: messageId,
          newMemories: {
            explicit: !!memoryResult?.explicitMemory,
            autoDetected: !!memoryResult?.autoDetectedMemory
          }
        });
      })
      .catch(error => {
        // Log any errors from the async memory processing
        log('error', '[AiService] Asynchronous memory processing failed.', {
          conversationId: conversationId,
          messageId: messageId,
          error: error.message
        });
      });

      const contextMessages: ProviderChatMessage[] = await chatContextService.buildChatContext(
        userId, message, conversationId, coachingMode,
        conversationHistory, attachments, currentAiConfig.provider
      );

      const { response } = await providerToUse.generateChatResponse(
        contextMessages, { model: currentAiConfig.model }
      );

      // TODO: Accurately calculate memoriesUsed. This might involve ChatContextService returning info,
      // or memoryService providing a method to get used memories for a session.
      const relevantMemoriesFromContext = await memoryService.getContextualMemories(userId, conversationHistory, message);
      if (relevantMemoriesFromContext.length > 0) {
        await memoryService.logMemoryUsage(relevantMemoriesFromContext, conversationId, true);
      }


      return {
        response,
        memoryInfo: {
          memoriesUsed: relevantMemoriesFromContext.length, // This is from getContextualMemories, which is still awaited
          newMemoriesProcessing: true // Indicate that processing for new memories from current message is ongoing
        }
      };
    } catch (error) {
      log('error', 'Error in getChatResponse (AiService):', { message: error.message, config: currentAiConfig });
      return {
        response: "I apologize, but I'm having trouble with my systems. Please try again later.",
        conversationId,
        memoryInfo: { memoriesUsed: 0, newMemoriesProcessing: true } // Updated here as well for consistency
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
}

export const aiService = new AiService();
