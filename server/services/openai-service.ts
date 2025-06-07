import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CoachingMode, coachingModes } from "@shared/schema";
import { memoryService } from "./memory-service";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

type AIProvider = "openai" | "google";
type OpenAIModel = "gpt-4o" | "gpt-4o-mini";
type GoogleModel = "gemini-2.0-flash-exp" | "gemini-1.5-pro";

interface AIConfig {
  provider: AIProvider;
  model: string;
}

class ChatService {
  private openai: OpenAI;
  private google: GoogleGenerativeAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "mock_key_for_development",
    });
    this.google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
  }

  private getCoachingPersona(mode: string): string {
    switch (mode) {
      case "weight-loss":
        return "You are a supportive weight loss coach. Focus on sustainable habits, healthy eating, and appropriate exercise. Be motivating, empathetic, and science-based. Avoid extreme dieting advice.";
      case "muscle-gain":
        return "You are a knowledgeable muscle gain coach. Focus on strength training, progressive overload, adequate protein intake, and recovery. Be motivating and educational about proper form and technique.";
      case "fitness":
        return "You are an experienced fitness coach. Focus on overall fitness improvement, cardiovascular health, flexibility, and strength. Provide varied workout suggestions and emphasize consistency.";
      case "mental-wellness":
        return "You are a compassionate mental wellness coach. Focus on stress reduction, mindfulness, positive psychology, and emotional resilience. Be gentle, non-judgmental, and encourage healthy coping strategies.";
      case "nutrition":
        return "You are a balanced nutrition coach. Focus on whole foods, portion control, and sustainable eating patterns. Provide practical meal suggestions and emphasize nutritional education without being restrictive.";
      default:
        return "You are a holistic wellness coach. Provide balanced advice on health, fitness, nutrition, and wellbeing. Be supportive, educational, and focus on sustainable lifestyle changes.";
    }
  }

  async getChatResponse(
    message: string,
    userId: number,
    conversationId: string,
    messageId: number,
    coachingMode: string = "weight-loss",
    conversationHistory: any[] = [],
    aiConfig: { provider: string; model: string } = { provider: "openai", model: "gpt-4o" },
    attachments: any[] = [],
    automaticModelSelection: boolean = false
  ): Promise<{ response: string; memoryInfo?: any }> {
    try {
      const mode = coachingModes.includes(coachingMode as CoachingMode) 
        ? coachingMode 
        : "weight-loss";

      // Apply automatic model selection if enabled
      if (automaticModelSelection) {
        aiConfig = this.selectOptimalModel(message, attachments, aiConfig);
      }

      // Process message for memory extraction
      const memoryProcessing = await memoryService.processMessageForMemory(
        userId, 
        message, 
        conversationId, 
        messageId,
        conversationHistory
      );

      // Retrieve relevant memories for context
      const relevantMemories = await memoryService.getContextualMemories(
        userId,
        conversationHistory,
        message
      );

      // Build conversation context with proper message history
      const conversationContext = [];

      // Add system message
      conversationContext.push({
        role: 'system',
        content: this.getSystemPrompt(coachingMode, relevantMemories)
      });

      // Process conversation history in chronological order (already limited to 20 in routes.ts)
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          // Handle file attachments in message metadata
          if (msg.metadata?.attachments && msg.metadata.attachments.length > 0) {
            const hasImages = msg.metadata.attachments.some(att => att.fileType?.startsWith('image/'));

            if (hasImages && msg.role === 'user') {
              // For user messages with images, maintain the vision format
              const processedAttachments = await this.processAttachmentsForHistory(msg.metadata.attachments);
              const content = [
                { type: "text", text: msg.content || "Please analyze this image." }
              ];
              content.push(...processedAttachments);

              conversationContext.push({
                role: msg.role,
                content: content
              });
            } else {
              // For assistant messages or non-image attachments, use text format
              const attachmentRefs = msg.metadata.attachments
                .filter(att => !att.fileType?.startsWith('image/'))
                .map(att => `[Previously shared file: ${att.displayName || att.fileName} (${att.fileType})]`)
                .join('\n');

              const imageRefs = msg.metadata.attachments
                .filter(att => att.fileType?.startsWith('image/'))
                .map(att => `[Previously analyzed image: ${att.displayName || att.fileName}]`)
                .join('\n');

              const refs = [attachmentRefs, imageRefs].filter(Boolean).join('\n');

              conversationContext.push({
                role: msg.role,
                content: refs ? `${msg.content}\n\n${refs}` : msg.content
              });
            }
          } else {
            conversationContext.push({
              role: msg.role,
              content: msg.content
            });
          }
        }
      }

      // Add current message with attachments
      const currentMessage = await this.processCurrentMessageWithAttachments(message, attachments);
      conversationContext.push(currentMessage);

      let response: string;
      if (aiConfig.provider === "openai") {
        response = await this.getOpenAIResponse(conversationContext, aiConfig.model as OpenAIModel);
      } else {
        response = await this.getGoogleResponse(message, this.getSystemPrompt(mode, relevantMemories), aiConfig.model as GoogleModel, attachments);
      }

      // Log memory usage
      if (relevantMemories.length > 0) {
        await memoryService.logMemoryUsage(relevantMemories, conversationId, true);
      }

      return {
        response,
        memoryInfo: {
          memoriesUsed: relevantMemories.length,
          newMemories: {
            explicit: !!memoryProcessing.explicitMemory,
            autoDetected: !!memoryProcessing.autoDetectedMemory
          }
        }
      };
    } catch (error) {
      console.error(`${aiConfig.provider} API error:`, error);
      return {
        response: "I apologize, but I'm having trouble connecting to my coaching system right now. Please try again in a moment."
      };
    }
  }

  private getSystemPrompt(mode: string, relevantMemories: any[]): string {
      const basePersona = this.getCoachingPersona(mode);
      return memoryService.buildSystemPromptWithMemories(relevantMemories, basePersona);
  }

  private async getOpenAIResponse(messages: any[], model: OpenAIModel): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    const imageAttachments = Array.isArray(lastMessage.content) && lastMessage.content.some(item => item.type === 'image_url');

    if (imageAttachments) {
      console.log(`Processing image attachment(s) for model: ${model}`);
    }

    const response = await this.openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't process your request right now. Please try again.";
  }

  private async getGoogleResponse(userMessage: string, persona: string, model: GoogleModel, attachments: any[] = []): Promise<string> {
    const genModel = this.google.getGenerativeModel({ model });

    const imageAttachments = attachments.filter(att => att.fileType?.startsWith('image/'));

    const prompt = `${persona}

Guidelines for your responses:
1. Keep your tone friendly, supportive, and conversational.
2. Provide specific, actionable advice when appropriate.
3. Answer should be thorough but concise (no more than 3-4 paragraphs).
4. When suggesting exercises or nutrition advice, provide specific examples.
5. You may reference health data from connected devices if the user mentions them.
6. Use emoji sparingly to add warmth to your responses.
7. If the user shares images, analyze them in the context of health, fitness, nutrition, or wellness coaching.

User: ${userMessage}`;

    let parts = [prompt];

    if (imageAttachments.length > 0) {
      for (const attachment of imageAttachments) {
        try {
          const imagePath = join(process.cwd(), 'uploads', attachment.fileName);

          if (existsSync(imagePath)) {
            const imageBuffer = readFileSync(imagePath);

            parts.push({
              inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: attachment.fileType
              }
            });
          }
        } catch (error) {
          console.error('Error processing image attachment for Google:', error);
        }
      }
    }

    const result = await genModel.generateContent(parts);
    const response = await result.response;

    return response.text() || "I'm sorry, I couldn't generate a response right now. Please try again.";
  }

  async getHealthInsights(
    healthData: any,
    aiConfig: AIConfig = { provider: "openai", model: "gpt-4o" }
  ): Promise<string[]> {
    try {
      const prompt = `Based on this health data: ${JSON.stringify(healthData)}, provide 3-5 brief, actionable health insights. Focus on trends, achievements, and recommendations.`;

      if (aiConfig.provider === "openai") {
        const response = await this.openai.chat.completions.create({
          model: aiConfig.model as OpenAIModel,
          messages: [
            {
              role: "system",
              content: "You are a wellness coach analyzing health data. Based on the provided data, give 3 specific, actionable insights phrased in the first person as if you're directly speaking to the user. Each insight should be concise (1-2 sentences) and focus on trends, improvements, or areas that need attention."
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

        try {
          const insights = JSON.parse(response.choices[0].message.content || "{}");
          return insights.insights || [];
        } catch (parseError) {
          console.error("Error parsing insights:", parseError);
          return [
            "Your activity levels have been consistent this week, keep up the good progress.",
            "Your sleep pattern shows some irregularity, try to establish a more consistent bedtime routine.",
            "Your heart rate readings are within a healthy range, indicating good cardiovascular health."
          ];
        }
      } else {
        const genModel = this.google.getGenerativeModel({ model: aiConfig.model });
        const result = await genModel.generateContent(prompt + " Respond with 3-5 brief bullet points.");
        const response = await result.response;
        const text = response.text();

        return text.split('\n')
          .filter(line => line.trim() && (line.includes('•') || line.includes('-') || line.includes('*')))
          .map(line => line.replace(/^[•\-*]\s*/, '').trim())
          .slice(0, 5);
      }
    } catch (error) {
      console.error("Health insights error:", error);
      return [
        "Your activity levels have been consistent this week, keep up the good progress.",
        "Your sleep pattern shows some irregularity, try to establish a more consistent bedtime routine.",
        "Your heart rate readings are within a healthy range, indicating good cardiovascular health."
      ];
    }
  }

  private selectOptimalModel(userMessage: string, attachments: any[] = [], currentConfig: AIConfig): AIConfig {
    const hasImages = attachments.some(att => att.fileType?.startsWith('image/'));
    const hasPDFs = attachments.some(att => att.fileType === 'application/pdf');
    const isComplexQuery = this.isComplexReasoningQuery(userMessage);

    // 1. Simple Text Query - Default: Gemini Flash, Fallback: GPT-4o-mini
    if (!hasImages && !hasPDFs && !isComplexQuery) {
      try {
        return { provider: "google", model: "gemini-2.0-flash-exp" };
      } catch {
        return { provider: "openai", model: "gpt-4o-mini" };
      }
    }

    // 2. Image Upload - Default: Gemini Pro, Fallback: GPT-4o
    if (hasImages) {
      try {
        return { provider: "google", model: "gemini-1.5-pro" };
      } catch {
        return { provider: "openai", model: "gpt-4o" };
      }
    }

    // 3. PDF/Document Upload - Default: Gemini Pro, Fallback: GPT-4o
    if (hasPDFs) {
      try {
        return { provider: "google", model: "gemini-1.5-pro" };
      } catch {
        return { provider: "openai", model: "gpt-4o" };
      }
    }

    // 4. Complex Reasoning/Medical Queries - Default: Gemini Pro, Fallback: GPT-4o
    if (isComplexQuery) {
      try {
        return { provider: "google", model: "gemini-1.5-pro" };
      } catch {
        return { provider: "openai", model: "gpt-4o" };
      }
    }

    // Default fallback
    return currentConfig;
  }

  private isComplexReasoningQuery(userMessage: string): boolean {
    const complexKeywords = [
      'medical', 'diagnosis', 'symptoms', 'treatment', 'medication', 'doctor',
      'analyze', 'complex', 'reasoning', 'explain why', 'how does', 'compare',
      'strategy', 'plan', 'calculate', 'determine', 'evaluate', 'assess',
      'blood pressure', 'heart rate', 'cholesterol', 'diabetes', 'weight loss',
      'muscle gain', 'nutrition plan', 'exercise program', 'diet analysis'
    ];

    const lowerMessage = userMessage.toLowerCase();
    return complexKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           userMessage.length > 200 || // Long queries often need complex reasoning
           userMessage.includes('?') && userMessage.split('?').length > 2; // Multiple questions
  }

  getAvailableModels() {
    return {
      openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
      google: ["gemini-2.0-flash-exp", "gemini-1.5-pro"]
    };
  }

  private async processAttachmentsForHistory(attachments: any[]): Promise<any[]> {
    const processedAttachments = [];

    for (const att of attachments) {
      if (att.fileType?.startsWith('image/')) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const imagePath = path.join(process.cwd(), 'uploads', att.fileName);

          if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            processedAttachments.push({
              type: "image_url",
              image_url: {
                url: `data:${att.fileType};base64,${base64Image}`
              }
            });
          } else {
            processedAttachments.push({
              type: "text",
              text: `[Previously shared image: ${att.displayName || att.fileName} - file no longer available]`
            });
          }
        } catch (error) {
          console.error('Error processing historical image:', error);
          processedAttachments.push({
            type: "text",
            text: `[Previously shared image: ${att.displayName || att.fileName} - error loading]`
          });
        }
      } else {
        processedAttachments.push({
          type: "text",
          text: `[Previously shared file: ${att.displayName || att.fileName} (${att.fileType})]`
        });
      }
    }

    return processedAttachments;
  }

  private async processCurrentMessageWithAttachments(message: string, attachments: any[]) {
    // If there are no attachments, the behavior is simple
    if (!attachments || attachments.length === 0) {
      return { role: 'user', content: message };
    }

    const hasImages = attachments.some(att => att.fileType?.startsWith('image/'));

    // If there are any images, we must use the vision-compatible format.
    if (hasImages) {
      const content: (OpenAI.Chat.Completions.ChatCompletionContentPartText | OpenAI.Chat.Completions.ChatCompletionContentPartImage)[] = [];

      // Start with the main text message
      let textContent = message || "Please analyze the attached content.";

      // Append text references for non-image files
      const otherAttachments = attachments.filter(att => !att.fileType?.startsWith('image/'));
      if (otherAttachments.length > 0) {
        const attachmentText = otherAttachments.map(att =>
          `[The user has also attached a file: ${att.displayName || att.fileName} (${att.fileType})]`
        ).join('\n');
        textContent = `${textContent}\n\n${attachmentText}`;
      }
      content.push({ type: "text", text: textContent });

      // Now, add the image data
      const imageAttachments = attachments.filter(att => att.fileType?.startsWith('image/'));
      for (const imageAtt of imageAttachments) {
        const imagePath = join(process.cwd(), 'uploads', imageAtt.fileName);
        try {
          if (existsSync(imagePath)) {
            const imageBuffer = readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            content.push({
              type: "image_url",
              image_url: {
                url: `data:${imageAtt.fileType};base64,${base64Image}`
              }
            });
          } else {
             // If file not found, add a text note instead of failing silently
             content[0].text += `\n[Note: Image ${imageAtt.displayName || imageAtt.fileName} could not be loaded.]`;
          }
        } catch (error) {
          console.error('Error reading image file:', error);
          content[0].text += `\n[Note: An error occurred while loading image ${imageAtt.displayName || imageAtt.fileName}.]`;
        }
      }
      return { role: 'user', content };

    } else {
      // If there are no images, just append text references for all attachments.
      let textContent = message;
      const attachmentText = attachments.map(att =>
        `[The user has attached a file: ${att.displayName || att.fileName} (${att.fileType})]`
      ).join('\n');
      textContent = message ? `${message}\n\n${attachmentText}` : attachmentText;
      return { role: 'user', content: textContent };
    }
  }
}

export const chatService = new ChatService();