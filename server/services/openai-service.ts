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
    userMessage: string, 
    userId: number,
    conversationId: string,
    messageId: number,
    coachingMode: string = "weight-loss",
    conversationHistory: any[] = [],
    aiConfig: AIConfig = { provider: "openai", model: "gpt-4o" },
    attachments: any[] = []
  ): Promise<{ response: string; memoryInfo?: any }> {
    try {
      const mode = coachingModes.includes(coachingMode as CoachingMode) 
        ? coachingMode 
        : "weight-loss";
      
      // Process message for memory extraction
      const memoryProcessing = await memoryService.processMessageForMemory(
        userId, 
        userMessage, 
        conversationId, 
        messageId,
        conversationHistory
      );

      // Retrieve relevant memories for context
      const relevantMemories = await memoryService.getContextualMemories(
        userId,
        conversationHistory,
        userMessage
      );

      // Build enhanced persona with memory context
      const basePersona = this.getCoachingPersona(mode);
      const enhancedPersona = memoryService.buildSystemPromptWithMemories(relevantMemories);
      
      let response: string;
      if (aiConfig.provider === "openai") {
        response = await this.getOpenAIResponse(userMessage, enhancedPersona, aiConfig.model as OpenAIModel, attachments);
      } else {
        response = await this.getGoogleResponse(userMessage, enhancedPersona, aiConfig.model as GoogleModel, attachments);
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

  private async getOpenAIResponse(userMessage: string, persona: string, model: OpenAIModel, attachments: any[] = []): Promise<string> {
    const imageAttachments = attachments.filter(att => att.fileType?.startsWith('image/'));
    
    let finalUserContentForOpenAI: string | any[];
    let hasSuccessfullyProcessedImages = false;
    
    if (imageAttachments.length > 0) {
      console.log(`Processing ${imageAttachments.length} image attachment(s) for model: ${model}`);
      
      // The userMessage contains the user's original text
      const textPart = { type: "text", text: userMessage };
      const imageParts: any[] = [];
      
      for (const attachment of imageAttachments) {
        try {
          const imagePath = join(process.cwd(), 'uploads', attachment.fileName);
          
          if (existsSync(imagePath)) {
            const imageBuffer = readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            
            console.log(`Successfully read image: ${attachment.fileName}, type: ${attachment.fileType}, size: ${attachment.fileSize} bytes`);
            
            const imageUrl = `data:${attachment.fileType};base64,${base64Image}`;
            
            imageParts.push({
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            });
          } else {
            console.error(`Image file not found: ${imagePath}`);
          }
        } catch (error) {
          console.error(`Error processing image attachment ${attachment.fileName}:`, error);
        }
      }
      
      if (imageParts.length > 0) {
        finalUserContentForOpenAI = [textPart, ...imageParts];
        hasSuccessfullyProcessedImages = true;
        console.log(`UserContent for OpenAI includes ${imageParts.length} image(s). Text part: "${userMessage.substring(0,100)}..."`);
      } else {
        console.warn("Image attachments were specified, but none could be processed. Sending text-only message.");
        finalUserContentForOpenAI = `${userMessage}\n\n(System Note: I was expecting an image with your message, but I encountered an issue processing it. Please ensure it was uploaded correctly if you intended to share one.)`;
      }
    } else {
      finalUserContentForOpenAI = userMessage;
    }

    console.log(`Making OpenAI request to model: ${model}. Has successfully processed images: ${hasSuccessfullyProcessedImages}`);

    let systemContent = `${persona}
          
Guidelines for your responses:
1. Keep your tone friendly, supportive, and conversational.
2. Provide specific, actionable advice when appropriate.
3. Answer should be thorough but concise (no more than 3-4 paragraphs).
4. When suggesting exercises or nutrition advice, provide specific examples.
5. You may reference health data from connected devices if the user mentions them.
6. Use emoji sparingly to add warmth to your responses.`;

    if (hasSuccessfullyProcessedImages) {
      systemContent += `
7. CRITICAL: You HAVE VISION CAPABILITIES and can see the image(s) the user has shared. You MUST analyze and describe what you see in the image(s).
8. For food/meal images: Identify specific foods, estimate portion sizes, analyze nutritional content, and provide dietary advice.
9. For exercise/activity images: Comment on form, technique, equipment, and provide suggestions.
10. For health data screenshots: Read and interpret the data shown and provide insights.
11. MANDATORY: Begin your response by describing exactly what you can see in the image(s). Do not say you cannot see images.
12. You are ${model} with full vision capabilities - act accordingly.`;
    } else {
      systemContent += `
7. If users mention images (e.g., "see this picture") but no image data was processed with their message, inform them that you didn't receive an image and ask them to try uploading again.`;
    }

    const response = await this.openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: finalUserContentForOpenAI
        }
      ],
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

  getAvailableModels(): Record<AIProvider, { id: string; name: string; description: string }[]> {
    return {
      openai: [
        { id: "gpt-4o", name: "GPT-4o", description: "Most capable OpenAI model with advanced reasoning" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Fast and cost-effective OpenAI model" }
      ],
      google: [
        { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", description: "Latest experimental Gemini model with fast responses" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced Google model with large context window" }
      ]
    };
  }
}

export const chatService = new ChatService();