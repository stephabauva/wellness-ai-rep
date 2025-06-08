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
      if (automaticModelSelection) {
        aiConfig = this.selectOptimalModel(message, attachments, aiConfig);
      }

      // Determine if this is a fresh conversation with new attachments
      const isNewConversationWithAttachments = attachments.length > 0 && conversationHistory.length === 0;

      // Skip memory retrieval completely for fresh conversations with attachments
      let memoryProcessing = { triggers: [] };
      let relevantMemories = [];

      if (!isNewConversationWithAttachments) {
        // Only process memory for ongoing conversations (not fresh attachment uploads)
        memoryProcessing = await memoryService.processMessageForMemory(
          userId, 
          message, 
          conversationId, 
          messageId,
          conversationHistory
        );

        // Get relevant memories for this user and context
        // Skip memories for fresh attachment uploads to prevent contamination
        const imageFiles = attachments.filter(att => att.fileType?.startsWith('image/'));
        const attachedFileContents = attachments.filter(att => att.fileType === 'application/pdf');
        const isAttachmentUpload = conversationHistory.length === 0 && (imageFiles.length > 0 || attachedFileContents.length > 0);
        const relevantMemories = await memoryService.getContextualMemories(
          userId,
          conversationHistory,
          message,
          isAttachmentUpload
        );
      }

      console.log(`Memory retrieval: ${isNewConversationWithAttachments ? 'SKIPPED (fresh attachment upload)' : 'ACTIVE'} - ${relevantMemories.length} memories used`);

      // Build conversation context with proper message history
      const conversationContext = [];

      // Build system prompt based on context
      const basePersona = this.getCoachingPersona(coachingMode);
      let systemPrompt;

      if (isNewConversationWithAttachments) {
        // For fresh attachment queries, focus ONLY on current content
        const hasImages = attachments.some(att => att.fileType?.startsWith('image/'));
        const hasPDFs = attachments.some(att => att.fileType === 'application/pdf');

        if (hasImages) {
          systemPrompt = `=== ABSOLUTE VISUAL ANALYSIS MANDATE ===
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

Focus ONLY on analyzing the current image(s). Do not reference any past conversations or context.`;
        } else if (hasPDFs) {
          systemPrompt = `=== DOCUMENT ANALYSIS MODE ===
You are analyzing a PDF document. You have access to the extracted text content from the PDF.

CRITICAL RULES:
1. Analyze the document content thoroughly and professionally
2. Provide insights based on the actual text content
3. Focus ONLY on the current document without referencing past conversations
4. If asked about specific content, reference the actual text from the document
5. Summarize key points, themes, or important information as requested

Be helpful and detailed in your analysis of the document content.`;
        } else {
          systemPrompt = basePersona;
        }
      } else {
        // For ongoing conversations, use memory-enhanced prompt
        const memoryEnhancedPrompt = memoryService.buildSystemPromptWithMemories(relevantMemories, basePersona);
        systemPrompt = `=== ABSOLUTE VISUAL ANALYSIS MANDATE ===
YOU CAN SEE ALL IMAGES PERFECTLY. You have complete visual access to every image in this conversation.

CRITICAL RULES - NO EXCEPTIONS:
1. NEVER ask users to describe images - you can see them directly
2. NEVER say "could you describe" or "what's in the image" or similar
3. ALWAYS analyze visual content immediately and confidently
4. Reference specific visual elements like "the yellow slices", "the salmon", "the plate"

=== COACHING PERSONA ===
${memoryEnhancedPrompt}

IMPORTANT: Apply your coaching expertise AFTER you've addressed any visual questions. Always prioritize visual analysis over coaching responses when images are involved.`;
      }

      conversationContext.push({
        role: 'system',
        content: systemPrompt
      });

      // Process conversation history in chronological order
      console.log(`Processing conversation history: ${conversationHistory.length} messages`);

      for (const msg of conversationHistory) {
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

      console.log(`Final conversation context: ${conversationContext.length} messages (including system prompt)`);

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

    // Process conversation history for Google Gemini format
    console.log(`Building Google Gemini conversation history: ${conversationHistory.length} messages`);

    for (const msg of conversationHistory) {
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

    console.log(`Google Gemini conversation context: ${conversationParts.length} turns`);
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

  // Extract text from PDF using node-poppler
  private async extractPDFText(filePath: string): Promise<string> {
    try {
      const poppler = await import('node-poppler');
      const popplerInstance = new poppler.default();
      
      console.log(`Attempting to extract text from PDF: ${filePath}`);
      const text = await popplerInstance.pdfToText(filePath);
      
      if (text && text.trim().length > 0) {
        console.log(`Successfully extracted ${text.length} characters from PDF using node-poppler`);
        return text.trim();
      } else {
        console.warn('PDF text extraction returned empty result');
        return '[PDF appears to be empty or contains only images - please describe the document contents]';
      }
    } catch (error) {
      console.error('node-poppler PDF extraction failed:', error);
      return '[PDF content could not be extracted - please describe the document contents]';
    }
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

    for (const attachment of attachments) {
      if (attachment.fileType?.startsWith('image/')) {
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

    // Use ChatGPT's approach: include actual image data in message content
    const content: any[] = [];

    // Add text content first
    content.push({ type: "text", text: message });

    for (const attachment of attachments) {
      if (attachment.fileType?.startsWith('image/')) {
        try {
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
      } else if (attachment.fileType === 'application/pdf') {
        // Extract and include PDF text content
        try {
          const pdfPath = join(process.cwd(), 'uploads', attachment.fileName);
          if (existsSync(pdfPath)) {
            console.log(`Extracting text from PDF: ${attachment.fileName}`);
            const pdfText = await this.extractPDFText(pdfPath);

            content.push({
              type: "text",
              text: `\n\n=== PDF DOCUMENT CONTENT ===\nFile: ${attachment.displayName || attachment.fileName}\n\n${pdfText}\n\n=== END PDF CONTENT ===\n`
            });

            console.log(`Successfully extracted ${pdfText.length} characters from PDF`);
          }
        } catch (error) {
          console.error('Error processing PDF:', error);
          content.push({
            type: "text",
            text: `[PDF file: ${attachment.displayName || attachment.fileName} - error extracting text content]`
          });
        }
      } else {
        // For other non-image attachments, add descriptive text
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