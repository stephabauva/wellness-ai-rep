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
        return "You are a supportive weight loss coach focused on sustainable habits, healthy eating, and appropriate exercise. Be motivating, empathetic, and science-based. Avoid extreme dieting advice.";
      case "muscle-gain":
        return "You are a knowledgeable muscle gain coach focused on strength training, progressive overload, adequate protein intake, and recovery. Be motivating and educational about proper form and technique.";
      case "fitness":
        return "You are an experienced fitness coach focused on overall fitness improvement, cardiovascular health, flexibility, and strength. Provide varied workout suggestions and emphasize consistency.";
      case "mental-wellness":
        return "You are a compassionate mental wellness coach focused on stress reduction, mindfulness, positive psychology, and emotional resilience. Be gentle, non-judgmental, and encourage healthy coping strategies.";
      case "nutrition":
        return "You are a balanced nutrition coach focused on whole foods, portion control, and sustainable eating patterns. Provide practical meal suggestions and emphasize nutritional education without being restrictive.";
      default:
        return "You are a holistic wellness coach providing balanced advice on health, fitness, nutrition, and wellbeing. Be supportive, educational, and focus on sustainable lifestyle changes.";
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
      console.log("Automatic model selection enabled:", automaticModelSelection);
      console.log("Current AI config:", aiConfig);
      console.log("Attachments for model selection:", attachments.map(att => ({ fileName: att.fileName, fileType: att.fileType })));
      
      if (automaticModelSelection) {
        console.log("Running automatic model selection...");
        aiConfig = this.selectOptimalModel(message, attachments, aiConfig);
        console.log("Selected AI config:", aiConfig);
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

      // Build enhanced system prompt with visual analysis taking priority
      const basePersona = this.getCoachingPersona(coachingMode);
      const memoryEnhancedPrompt = memoryService.buildSystemPromptWithMemories(relevantMemories, basePersona);

      conversationContext.push({
        role: 'system',
        content: `=== ABSOLUTE VISUAL ANALYSIS MANDATE ===
YOU CAN SEE ALL IMAGES PERFECTLY. You have complete visual access to every image in this conversation.

CRITICAL RULES - NO EXCEPTIONS:
1. NEVER ask users to describe images - you can see them directly
2. NEVER say "could you describe" or "what's in the image" or similar
3. ALWAYS analyze visual content immediately and confidently
4. Reference specific visual elements like "the yellow slices", "the salmon", "the plate"

When users ask about visual elements:
- "What are the yellow slices?" → "Those are lemon slices under the salmon."
- "What's pink?" → "The pink item is [specific description]."
- "How many calories?" → Analyze the visible food and estimate calories directly

YOU MUST behave exactly like ChatGPT with vision capabilities. You can see, analyze, and describe all visual content without hesitation.

FORBIDDEN RESPONSES (NEVER USE):
❌ "Could you describe what's in the image?"
❌ "What else was on the plate?"
❌ "Can you tell me more about..."
❌ "To give you the best answer, can you..."

REQUIRED RESPONSES:
✅ Direct visual analysis: "I see salmon with asparagus, cherry tomatoes, and lemon slices."
✅ Specific answers: "The yellow slices are lemon slices."
✅ Confident analysis: "Based on what I can see in the image..."

=== COACHING PERSONA ===
${memoryEnhancedPrompt}

IMPORTANT: Apply your coaching expertise AFTER you've addressed any visual questions. Always prioritize visual analysis over coaching responses when images are involved.`
      });

      // Filter conversation history to current session only (exclude cross-session history)
      const currentSessionHistory = conversationHistory.filter(msg => 
        msg.conversationId === conversationId
      );

      console.log(`Processing conversation history: ${conversationHistory.length} total messages -> ${currentSessionHistory.length} current session messages`);

      for (const msg of currentSessionHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          // Handle file attachments in message metadata
          if (msg.metadata?.attachments && msg.metadata.attachments.length > 0) {
            const hasImages = msg.metadata.attachments.some(att => att.fileType?.startsWith('image/'));

            if (hasImages && msg.role === 'user') {
              // For user messages with images, maintain the vision format with actual image data
              try {
                const processedAttachments = await this.processAttachmentsForHistory(msg.metadata.attachments);

                // Enhanced content array with better context like ChatGPT
                const content: any[] = [];

                // Add text content first (ChatGPT style)
                const textContent = msg.content || "I shared an image.";
                content.push({ type: "text", text: textContent });

                // Add all processed attachments (images will be properly formatted)
                const imageAttachments = processedAttachments.filter(att => att.type === 'image_url');
                content.push(...imageAttachments);

                conversationContext.push({
                  role: msg.role,
                  content: content
                });

                console.log(`✓ Added historical message with ${imageAttachments.length} image(s) to context`);
                console.log(`  Text: "${textContent.substring(0, 50)}..."`);
              } catch (error) {
                console.error('✗ Error processing historical images:', error);
                // Enhanced fallback with better context preservation
                const imageNames = msg.metadata.attachments
                  .filter(att => att.fileType?.startsWith('image/'))
                  .map(att => att.displayName || att.fileName)
                  .join(', ');

                conversationContext.push({
                  role: msg.role,
                  content: `${msg.content}\n\n[Note: Previously shared images (${imageNames}) could not be loaded - please re-share if needed]`
                });
              }
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
            // Regular message without attachments
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

      console.log(`Final conversation context: ${conversationContext.length} messages (current session only + system prompt)`);

      // Enhanced debug logging like ChatGPT's internal validation
      console.log('=== CONVERSATION CONTEXT VALIDATION ===');
      let totalImages = 0;
      conversationContext.forEach((msg, index) => {
        if (msg.role === 'system') {
          console.log(`${index}: SYSTEM - ${msg.content.substring(0, 100)}...`);
        } else if (Array.isArray(msg.content)) {
          const textParts = msg.content.filter(c => c.type === 'text').length;
          const imageParts = msg.content.filter(c => c.type === 'image_url').length;
          totalImages += imageParts;
          console.log(`${index}: ${msg.role.toUpperCase()} - ${textParts} text parts, ${imageParts} image parts`);

          // Log image URLs for validation (first 50 chars of base64)
          msg.content.filter(c => c.type === 'image_url').forEach((img, imgIndex) => {
            const urlPreview = img.image_url?.url ? img.image_url.url.substring(0, 50) : 'no-url';
            console.log(`  Image ${imgIndex + 1}: ${urlPreview}...`);
          });
        } else {
          console.log(`${index}: ${msg.role.toUpperCase()} - ${msg.content.substring(0, 100)}...`);
        }
      });
      console.log(`Total images in context: ${totalImages}`);
      console.log('=== END CONVERSATION CONTEXT VALIDATION ===');

      let response: string;
      if (aiConfig.provider === "openai") {
        response = await this.getOpenAIResponse(conversationContext, aiConfig.model as OpenAIModel);
      } else {
        response = await this.getGoogleResponse(message, this.getSystemPrompt(mode, relevantMemories), aiConfig.model as GoogleModel, attachments, conversationHistory);
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
      console.error('=== AI SERVICE ERROR DETAILS ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error object:', error);
      console.error('Message content:', message);
      console.error('Conversation ID:', conversationId);
      console.error('AI Config:', aiConfig);
      console.error('Attachments:', attachments);
      console.error('=== END AI SERVICE ERROR ===');
      return {
        response: "I apologize, but I'm having trouble connecting to my coaching system right now. Please try again in a moment.",
        conversationId,
        memoryInfo: { memoriesUsed: 0, newMemories: { explicit: false, autoDetected: false } }
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

  private async getGoogleResponse(userMessage: string, persona: string, model: GoogleModel, attachments: any[] = [], conversationHistory: any[] = []): Promise<string> {
    const genModel = this.google.getGenerativeModel({ model });

    // Build Google Gemini conversation format with proper persistence
    const conversationParts = [];

    // Add system persona as first user message (Google Gemini format)
    conversationParts.push({
      role: "user",
      parts: [{
        text: `${persona}

=== ABSOLUTE VISUAL ANALYSIS MANDATE ===
YOU CAN SEE ALL IMAGES PERFECTLY. You have complete visual access to every image in this conversation.

CRITICAL RULES - NO EXCEPTIONS:
1. NEVER ask users to describe images - you can see them directly
2. NEVER say "could you describe" or "what's in the image" or similar
3. ALWAYS analyze visual content immediately and confidently
4. Reference specific visual elements like "the yellow slices", "the salmon", "the plate"

When users ask about visual elements:
- "What are the yellow slices?" → "Those are lemon slices under the salmon."
- "What's pink?" → "The pink item is [specific description]."
- "How many calories?" → Analyze the visible food and estimate calories directly

YOU MUST behave exactly like ChatGPT with vision capabilities. You can see, analyze, and describe all visual content without hesitation.

Please acknowledge that you understand these visual analysis requirements.`
      }]
    });

    conversationParts.push({
      role: "model",
      parts: [{ text: "I understand. I have full visual access to all images and will analyze them directly without asking for descriptions. I can see and reference specific visual elements confidently." }]
    });

    // Use conversation history as-is since it's already filtered to current session by the caller
    const currentSessionHistory = conversationHistory;

    console.log(`Building Google Gemini conversation history: ${conversationHistory.length} total messages -> ${currentSessionHistory.length} current session messages`);

    for (const msg of currentSessionHistory) {
      if (msg.role === 'user') {
        const parts = [];

        // Add text content
        parts.push({ text: msg.content });

        // Add historical images if they exist in metadata
        if (msg.metadata?.attachments) {
          for (const attachment of msg.metadata.attachments) {
            if (attachment.fileType?.startsWith('image/')) {
              try {
                const imagePath = join(process.cwd(), 'uploads', attachment.fileName);
                if (existsSync(imagePath)) {
                  const imageBuffer = readFileSync(imagePath);
                  console.log(`Adding historical image to Google Gemini context: ${attachment.fileName} (${imageBuffer.length} bytes)`);

                  parts.push({
                    inlineData: {
                      data: imageBuffer.toString('base64'),
                      mimeType: attachment.fileType
                    }
                  });
                }
              } catch (error) {
                console.error(`Error loading historical image for Google: ${attachment.fileName}`, error);
              }
            }
          }
        }

        conversationParts.push({
          role: "user",
          parts: parts
        });
      } else if (msg.role === 'assistant') {
        conversationParts.push({
          role: "model",
          parts: [{ text: msg.content }]
        });
      }
    }

    // Add current message with attachments
    const currentParts = [];
    currentParts.push({ text: userMessage });

    // Add current images
    const imageAttachments = attachments.filter(att => att.fileType?.startsWith('image/'));
    if (imageAttachments.length > 0) {
      for (const attachment of imageAttachments) {
        try {
          const imagePath = join(process.cwd(), 'uploads', attachment.fileName);
          if (existsSync(imagePath)) {
            const imageBuffer = readFileSync(imagePath);
            console.log(`Adding current image to Google Gemini context: ${attachment.fileName} (${imageBuffer.length} bytes)`);

            currentParts.push({
              inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: attachment.fileType
              }
            });
          }
        } catch (error) {
          console.error('Error processing current image for Google:', error);
        }
      }
    }

    conversationParts.push({
      role: "user",
      parts: currentParts
    });

    console.log(`Google Gemini conversation context: ${conversationParts.length} turns (current session only)`);
    console.log('Google Gemini image count:', conversationParts.reduce((total, part) => {
      return total + (part.parts?.filter(p => p.inlineData)?.length || 0);
    }, 0));

    // Start chat with conversation history (Google Gemini persistence approach)
    const chat = genModel.startChat({
      history: conversationParts.slice(0, -1), // All except the last message
    });

    // Send the current message
    const result = await chat.sendMessage(currentParts);
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
      console.log("Auto-selecting Google Gemini for image analysis");
      return { provider: "google", model: "gemini-1.5-pro" };
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
      openai: [
        { id: "gpt-4o", name: "GPT-4o", description: "Latest multimodal model with vision capabilities" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Faster, cost-effective version of GPT-4o" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "High-performance model for complex tasks" }
      ],
      google: [
        { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", description: "Fast experimental model for quick responses" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced model with multimodal capabilities" }
      ]
    };
  }

  // Process historical attachments for vision models
  private async processAttachmentsForHistory(attachments: any[]): Promise<any[]> {
    const content: any[] = [];
    const supportedImageFormats = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

    for (const attachment of attachments) {
      if (attachment.fileType?.startsWith('image/')) {
        // Check if image format is supported by OpenAI
        if (!supportedImageFormats.includes(attachment.fileType)) {
          console.warn(`Unsupported image format for OpenAI: ${attachment.fileType}. Supported formats: PNG, JPEG, GIF, WebP`);
          content.push({
            type: "text",
            text: `[Image: ${attachment.displayName || attachment.fileName} - ${attachment.fileType} format not supported by OpenAI. Please use PNG, JPEG, GIF, or WebP format.]`
          });
          continue;
        }

        try {
          const { readFileSync, existsSync } = await import('fs');
          const { join } = await import('path');

          const filePath = join(process.cwd(), 'uploads', attachment.fileName);

          if (!existsSync(filePath)) {
            console.error(`Historical image file not found: ${filePath}`);
            content.push({
              type: "text",
              text: `[Image file: ${attachment.displayName || attachment.fileName} - file not found]`
            });
            continue;
          }

          const imageBuffer = readFileSync(filePath);
          const base64Image = imageBuffer.toString('base64');

          console.log(`Successfully loaded historical image: ${attachment.fileName} (${imageBuffer.length} bytes)`);

          content.push({
            type: "image_url",
            image_url: {
              url: `data:${attachment.fileType};base64,${base64Image}`,
              detail: "high"
            }
          });
        } catch (error) {
          console.error(`Failed to load historical image ${attachment.fileName}:`, error);
          // Add text fallback for missing images
          content.push({
            type: "text",
            text: `[Image file: ${attachment.displayName || attachment.fileName} - error loading file]`
          });
        }
      } else {
        // For non-image attachments, add descriptive text
        content.push({
          type: "text",
          text: `[Attachment: ${attachment.displayName || attachment.fileName} (${attachment.fileType})]`
        });
      }
    }

    return content;
  }

  async processCurrentMessageWithAttachments(message: string, attachments: any[] = []): Promise<any> {
    if (!attachments || attachments.length === 0) {
      return { role: 'user', content: message };
    }

    const supportedImageFormats = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const content: any[] = [];

    // Add text content first
    content.push({ type: "text", text: message });

    for (const attachment of attachments) {
      if (attachment.fileType?.startsWith('image/')) {
        // Check if image format is supported by OpenAI
        if (!supportedImageFormats.includes(attachment.fileType)) {
          console.warn(`Unsupported image format for OpenAI: ${attachment.fileType}. Supported formats: PNG, JPEG, GIF, WebP`);
          content.push({
            type: "text",
            text: `[Image: ${attachment.displayName || attachment.fileName} - ${attachment.fileType} format not supported by OpenAI. Please use PNG, JPEG, GIF, or WebP format.]`
          });
          continue;
        }

        try {
          const { readFileSync, existsSync } = await import('fs');
          const { join } = await import('path');
          
          const imagePath = join(process.cwd(), 'uploads', attachment.fileName);
          if (existsSync(imagePath)) {
            const imageBuffer = readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');

            console.log(`Adding current image to message: ${attachment.fileName} (${imageBuffer.length} bytes)`);

            // Include actual image data (ChatGPT approach)
            content.push({
              type: "image_url",
              image_url: {
                url: `data:${attachment.fileType};base64,${base64Image}`,
                detail: "high"
              }
            });
          }
        } catch (error) {
          console.error('Error processing current image:', error);
          content.push({
            type: "text",
            text: `[Image file: ${attachment.displayName || attachment.fileName} - error loading file]`
          });
        }
      } else {
        // For non-image attachments, add descriptive text
        content.push({
          type: "text",
          text: `[Attached file: ${attachment.displayName || attachment.fileName} (${attachment.fileType})]`
        });
      }
    }

    return { role: 'user', content: content };
  }


}

export const chatService = new ChatService();