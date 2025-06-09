import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from "@google/generative-ai";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  AiProvider,
  AIProviderName,
  ProviderChatMessage,
  ChatResponse,
  HealthInsightsResponse,
  ProviderConfig,
  GoogleModel,
  AttachmentData,
  AvailableModels,
  ModelInfo,
  MessageContentPart, // Will be mapped to Google's Part[]
} from "./ai-provider.interface";

// Helper function to log with provider context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[GoogleProvider] ${message}`, data || '');
};

export class GoogleProvider implements AiProvider {
  readonly providerName: AIProviderName = "google";
  private googleAI: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.googleAI = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_AI_API_KEY || "mock_google_key");
    log('info', 'GoogleProvider initialized');
  }

  // Helper to convert generic ChatMessage format to Google's history format
  private convertMessagesToGoogleHistory(messages: ProviderChatMessage[]): Array<{role: string, parts: Part[]}> {
    const history: Array<{role: string, parts: Part[]}> = [];
    for (const msg of messages) {
      const parts: Part[] = [];
      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else { // It's MessageContentPart[]
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            parts.push({ text: part.text });
          } else if (part.type === 'image_url' && part.image_url?.url) {
            if (part.image_url.url.startsWith('data:')) {
              const [header, base64Data] = part.image_url.url.split(',');
              if (base64Data) {
                const mimeType = header.substring(header.indexOf(':') + 1, header.indexOf(';'));
                parts.push({ inlineData: { mimeType, data: base64Data } });
              } else {
                log('warn', 'Could not parse base64 data URI for Google message part.');
              }
            } else {
              // Direct URLs are not directly supported by Google's inlineData.
              // This would require fetching the image and converting to base64.
              // For now, we assume data URIs are provided by the context builder.
              log('warn', `Skipping non-data URI image URL for Google: ${part.image_url.url}`);
            }
          }
        }
      }
      history.push({ role: msg.role === 'assistant' ? 'model' : msg.role, parts });
    }
    return history;
  }

  // Helper to convert generic ChatMessage format to Google's Part[] (legacy method)
  private static convertMessagesToGoogleParts(messages: ProviderChatMessage[]): Part[] {
    const allParts: Part[] = [];
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        allParts.push({ text: msg.content });
      } else { // It's MessageContentPart[]
        for (const part of msg.content) {
          if (part.type === 'text' && part.text) {
            allParts.push({ text: part.text });
          } else if (part.type === 'image_url' && part.image_url?.url) {
            if (part.image_url.url.startsWith('data:')) {
              const [header, base64Data] = part.image_url.url.split(',');
              if (base64Data) {
                const mimeType = header.substring(header.indexOf(':') + 1, header.indexOf(';'));
                allParts.push({ inlineData: { mimeType, data: base64Data } });
              } else {
                log('warn', 'Could not parse base64 data URI for Google message part.');
              }
            } else {
              // Direct URLs are not directly supported by Google's inlineData.
              // This would require fetching the image and converting to base64.
              // For now, we assume data URIs are provided by the context builder.
              log('warn', `Skipping non-data URI image URL for Google: ${part.image_url.url}`);
            }
          }
        }
      }
    }
    return allParts;
  }

  // Static method to process attachments into Google's format (similar to OpenAI's but for Google Parts)
  public static async processMessageWithAttachments(
    messageText: string,
    attachments: AttachmentData[] = []
  ): Promise<Part[]> {
    const parts: Part[] = [];
    if (messageText) {
      parts.push({ text: messageText });
    }

    for (const attachment of attachments) {
      if (attachment.fileType?.startsWith('image/')) {
        try {
          const imagePath = join(process.cwd(), 'uploads', attachment.fileName);
          if (!existsSync(imagePath)) {
            log('error', `Image file not found: ${imagePath}`);
            parts.push({ text: `[Image file: ${attachment.displayName || attachment.fileName} - file not found]` });
            continue;
          }
          const imageBuffer = readFileSync(imagePath);
          parts.push({
            inlineData: {
              data: imageBuffer.toString('base64'),
              mimeType: attachment.fileType,
            },
          });
          log('info', `Successfully loaded image for Google: ${attachment.fileName} (${imageBuffer.length} bytes)`);
        } catch (error) {
          log('error', `Failed to load image ${attachment.fileName} for Google:`, error);
          parts.push({ text: `[Image file: ${attachment.displayName || attachment.fileName} - error loading file]` });
        }
      } else {
         parts.push({ text: `[Attachment reference: ${attachment.displayName || attachment.fileName} (${attachment.fileType})]` });
      }
    }

    // If no text and no attachments, or only non-image attachments without text, add a default text part
    if (parts.length === 0 || (parts.every(p => !p.text) && !messageText)) {
        parts.unshift({ text: "Analyzing content." });
    }
    return parts;
  }


  async generateChatResponse(
    messages: ProviderChatMessage[], // These should include the full history for context
    config: ProviderConfig,
    // attachments for the current message are expected to be part of the last message in ProviderChatMessage[]
  ): Promise<ChatResponse> {
    try {
      log('info', `Generating chat response with model: ${config.model}`);
      const model = config.model as GoogleModel;
      
      // Extract system message if present and use it as system instruction
      let systemInstruction = '';
      const nonSystemMessages = messages.filter(msg => {
        if (msg.role === 'system') {
          systemInstruction = typeof msg.content === 'string' ? msg.content : msg.content.map(part => part.type === 'text' ? part.text : '').join('');
          return false;
        }
        return true;
      });

      const genModel = this.googleAI.getGenerativeModel({
        model,
        systemInstruction: systemInstruction || undefined,
        // Default safety settings - can be configured if needed
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ]
      });

      // Build history from non-system messages, excluding the last message
      const historyMessages = nonSystemMessages.slice(0, -1);
      const googleHistory = this.convertMessagesToGoogleHistory(historyMessages);
      const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];

      let lastMessageParts: Part[];
      if (typeof lastMessage.content === 'string') {
          lastMessageParts = [{ text: lastMessage.content }];
      } else { // MessageContentPart[]
          // Assuming images are already base64 encoded if they are part of MessageContentPart
          lastMessageParts = lastMessage.content.map(part => {
              if (part.type === 'text' && part.text) return { text: part.text };
              if (part.type === 'image_url' && part.image_url?.url) {
                  const [header, base64Data] = part.image_url.url.split(',');
                  const mimeType = header.substring(header.indexOf(':') + 1, header.indexOf(';'));
                  return { inlineData: { data: base64Data, mimeType }};
              }
              return {text: ''}; // Should not happen with proper input
          }).filter(p => p.text || p.inlineData);
      }

      if (lastMessageParts.length === 0) {
        lastMessageParts.push({text: "No specific query, please respond generally or based on history."});
      }

      log('info', `Starting chat. History length: ${googleHistory.length}, Last message parts: ${lastMessageParts.length}`);

      const chat = genModel.startChat({ history: googleHistory });
      const result = await chat.sendMessage(lastMessageParts);
      const response = await result.response;
      const responseText = response.text() || "I'm sorry, I couldn't generate a response right now. Please try again.";

      log('info', 'Chat response received from Google.');
      return { response: responseText };

    } catch (error: any) {
      log('error', 'Error in generateChatResponse (Google):', error);
      if (error?.message?.includes('SAFETY')) {
         return { response: "I'm unable to respond to that request due to safety guidelines." };
      }
      throw error;
    }
  }

  async generateHealthInsights(
    healthData: any,
    config: ProviderConfig
  ): Promise<HealthInsightsResponse> {
    try {
      log('info', `Generating health insights with Google model: ${config.model}`);
      const modelName = config.model as GoogleModel;
      const genModel = this.googleAI.getGenerativeModel({ model: modelName });

      const prompt = `You are a wellness coach analyzing health data. Based on this health data: ${JSON.stringify(healthData)}, provide 3-5 brief, actionable health insights. Focus on trends, achievements, and recommendations. Each insight should be concise (1-2 sentences). Respond with a JSON object with a single key 'insights' containing an array of strings.`;

      const result = await genModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        log('warn', 'No content received from Google for health insights.');
        return { insights: [] };
      }

      try {
        // Google might not always return perfect JSON, so we try to parse it.
        // If it fails, we attempt to extract bullet points as a fallback.
        const parsedInsights = JSON.parse(text);
        if (parsedInsights.insights && Array.isArray(parsedInsights.insights)) {
          log('info', 'Health insights received and parsed as JSON from Google.');
          return { insights: parsedInsights.insights };
        }
        throw new Error("JSON response from Google was not in the expected format.");
      } catch (parseError: any) {
        log('warn', `Failed to parse health insights as JSON from Google: ${parseError?.message || 'Unknown parse error'}. Falling back to text extraction.`);
        const extractedInsights = text.split('\n')
          .filter(line => line.trim() && (line.includes('•') || line.includes('-') || line.includes('*') || /^\d+\./.test(line.trim())))
          .map(line => line.replace(/^[•\-*]\s*|\d+\.\s*/, '').trim())
          .slice(0, 5);
        if (extractedInsights.length > 0) {
          log('info', `Extracted ${extractedInsights.length} insights using text processing.`);
          return { insights: extractedInsights };
        }
        log('warn', 'Could not extract any insights using text processing.');
        return { insights: ["Could not retrieve insights at this time."] };
      }
    } catch (error) {
      log('error', 'Error in generateHealthInsights (Google):', error);
      throw error;
    }
  }

  getAvailableModels(): AvailableModels {
    const models: ModelInfo[] = [
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", description: "Fast experimental model for quick responses" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced model with multimodal capabilities" }
    ];
    return { google: models };
  }
}
