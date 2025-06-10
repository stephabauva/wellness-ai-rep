import OpenAI from "openai";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  AiProvider,
  AIProviderName,
  ProviderChatMessage,
  ChatResponse,
  HealthInsightsResponse,
  ProviderConfig,
  OpenAIModel,
  AttachmentData,
  MessageContentPart,
  AvailableModels,
  ModelInfo,
} from "./ai-provider.interface";

// Helper function to log with provider context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[OpenAIProvider] ${message}`, data || '');
};

export class OpenAiProvider implements AiProvider {
  readonly providerName: AIProviderName = "openai";
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || "mock_key_for_development",
    });
    log('info', 'OpenAIProvider initialized');
  }

  async generateChatResponse(
    messages: ProviderChatMessage[],
    config: ProviderConfig
    // Attachments are expected to be processed into MessageContentPart[] within messages
  ): Promise<ChatResponse> {
    log('info', `Generating chat response with model: ${config.model}`, { numMessages: messages.length });

    const lastMessage = messages[messages.length - 1];
    if (Array.isArray(lastMessage?.content)) {
      const imageAttachments = lastMessage.content.some(item => item.type === 'image_url');
      if (imageAttachments) {
        log('info', `Processing image attachment(s) for model: ${config.model}`);
      }
    }
    const model = config.model as OpenAIModel;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        log('warn', `OpenAI chat completion request timed out after 30 seconds for model: ${config.model}`);
        controller.abort();
    }, 30000); // 30 seconds

    try {
      const response = await this.openai.chat.completions.create({
        model: model,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1024,
      }, { signal: controller.signal });

      const responseText = response.choices[0].message.content || "I'm sorry, I couldn't process your request right now. Please try again.";
      log('info', 'Chat response received from OpenAI.');
      return { response: responseText };

    } catch (error) {
      log('error', 'Error in OpenAIProvider.generateChatResponse:', error);
      // Check if it's an AbortError (timeout) vs other API error for specific handling if needed in future
      // For now, just re-throw to be caught by AiService
      throw error;
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is always cleared
    }
  }

  async generateHealthInsights(
    healthData: any,
    config: ProviderConfig
  ): Promise<HealthInsightsResponse> {
    try {
      log('info', `Generating health insights with model: ${config.model}`);
      const model = config.model as OpenAIModel;

      const response = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a wellness coach analyzing health data. Based on the provided data, give 3 specific, actionable insights phrased in the first person as if you're directly speaking to the user. Each insight should be concise (1-2 sentences) and focus on trends, improvements, or areas that need attention. Respond with a JSON object with a single key 'insights' containing an array of strings."
          },
          {
            role: "user",
            content: JSON.stringify(healthData)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 300
      });

      const content = response.choices[0].message.content;
      if (!content) {
        log('warn', 'No content received from OpenAI for health insights.');
        return { insights: [] };
      }

      try {
        const parsedInsights = JSON.parse(content);
        log('info', 'Health insights received and parsed.');
        return { insights: parsedInsights.insights || [] };
      } catch (parseError) {
        log('error', 'Error parsing health insights JSON:', parseError);
        // Fallback or error handling
        return { insights: ["Could not parse insights from AI."] };
      }
    } catch (error) {
      log('error', 'Error in generateHealthInsights:', error);
      throw error; // Or return a HealthInsightsResponse with error info
    }
  }

  public static async processMessageWithAttachments(
    messageText: string,
    attachments: AttachmentData[] = [],
    isHistory: boolean = false // Flag to differentiate logging/handling if needed
  ): Promise<MessageContentPart[]> {
    const content: MessageContentPart[] = [];
    const supportedImageFormats = [
      'image/png',
      'image/jpeg', // Covers .jpeg and .jpg
      'image/gif',
      'image/webp',
      'image/avif',
      'image/bmp'
    ];

    // Add text content first
    if (messageText) {
      content.push({ type: "text", text: messageText });
    } else if (attachments.length > 0 && !messageText) {
      // If there's no text but there are attachments, add a generic text part.
      // OpenAI API requires a text part even if it's just referring to images.
      content.push({ type: "text", text: "Analyzing content." });
    }


    for (const attachment of attachments) {
      if (attachment.fileType?.startsWith('image/')) {
        if (!supportedImageFormats.includes(attachment.fileType)) {
          log('warn', `Unsupported image format for OpenAI: ${attachment.fileType}. Attachment: ${attachment.displayName || attachment.fileName}`);
          content.push({
            type: "text",
            text: `[Image: ${attachment.displayName || attachment.fileName} - ${attachment.fileType} format not supported by OpenAI. Please use PNG, JPEG, GIF, or WebP format.]`
          });
          continue;
        }

        try {
          const imagePath = join(process.cwd(), 'uploads', attachment.fileName);
          if (!existsSync(imagePath)) {
            log('error', `Image file not found: ${imagePath}. Attachment: ${attachment.displayName || attachment.fileName}`);
            content.push({
              type: "text",
              text: `[Image file: ${attachment.displayName || attachment.fileName} - file not found]`
            });
            continue;
          }

          const imageBuffer = readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          const detailLevel = imageBuffer.length > 2000000 ? 'low' : 'high'; // Example: use low detail for images > 2MB

          log('info', `Successfully loaded image for OpenAI: ${attachment.fileName} (${imageBuffer.length} bytes), detail: ${detailLevel}`);
          content.push({
            type: "image_url",
            image_url: {
              url: `data:${attachment.fileType};base64,${base64Image}`,
              detail: detailLevel
            }
          });
        } catch (error) {
          log('error', `Failed to load image ${attachment.fileName}:`, error);
          content.push({
            type: "text",
            text: `[Image file: ${attachment.displayName || attachment.fileName} - error loading file]`
          });
        }
      } else {
        log('info', `Non-image attachment processed as text reference: ${attachment.displayName || attachment.fileName}`);
        content.push({
          type: "text",
          text: `[Attachment reference: ${attachment.displayName || attachment.fileName} (${attachment.fileType})]`
        });
      }
    }
    // If there was only a messageText and no attachments, content will be [ {type: "text", text: messageText} ]
    // If there were attachments but no messageText, content will start with {type: "text", text: "Analyzing content."}
    // If content is still empty (e.g. empty messageText and empty attachments), OpenAI might error.
    // Ensure there's always at least one content part.
    if (content.length === 0 && !messageText) {
        content.push({ type: "text", text: "No content provided."});
    }


    return content;
  }


  getAvailableModels(): AvailableModels {
    const models: ModelInfo[] = [
      { id: "gpt-4o", name: "GPT-4o", description: "Latest multimodal model with vision capabilities" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Faster, cost-effective version of GPT-4o" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High-performance model for complex tasks" }
    ];
    return { openai: models };
  }
}
