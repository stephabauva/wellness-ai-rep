import { memoryService } from "./memory-service";
import { CoachingMode, coachingModes } from "@shared/schema";
import {
  ProviderChatMessage,
  AttachmentData,
  MessageContentPart
} from "./providers/ai-provider.interface";
import { OpenAiProvider } from "./providers/openai-provider"; // For OpenAI specific formatting
import { GoogleProvider } from "./providers/google-provider"; // For Google specific formatting

// Helper function to log with service context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[ChatContextService] ${message}`, data || '');
};

export class ChatContextService {
  constructor() {
    log('info', 'ChatContextService initialized');
  }

  private getCoachingPersona(mode: string): string {
    // This function is identical to the one in the original openai-service.ts
    // Consider moving to a shared utility if used elsewhere.
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

  public async buildChatContext(
    userId: number,
    rawMessage: string,
    conversationId: string,
    coachingModeString: string,
    rawConversationHistory: any[], // Type this more strictly if possible (e.g., from DB schema)
    currentAttachments: AttachmentData[],
    targetProvider: 'openai' | 'google' // To determine formatting strategy for attachments
  ): Promise<ProviderChatMessage[]> {
    log('info', `Building chat context for conversation ${conversationId} with provider ${targetProvider}`);

    const coachingMode = coachingModes.includes(coachingModeString as CoachingMode)
      ? coachingModeString
      : "weight-loss";

    const relevantMemories = await memoryService.getContextualMemories(
      userId,
      rawConversationHistory, // Pass full history for memory retrieval context
      rawMessage
    );
    log('info', `Retrieved ${relevantMemories.length} relevant memories.`);

    const basePersona = this.getCoachingPersona(coachingMode);
    const memoryEnhancedPrompt = memoryService.buildSystemPromptWithMemories(relevantMemories, basePersona);

    const systemPromptContent = `=== ABSOLUTE VISUAL ANALYSIS MANDATE ===
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

IMPORTANT: Apply your coaching expertise AFTER you've addressed any visual questions. Always prioritize visual analysis over coaching responses when images are involved.`;

    const conversationContext: ProviderChatMessage[] = [{
      role: 'system',
      content: systemPromptContent,
    }];

    // Filter conversation history to current session only for the main chat flow
    // Memories already used full history.
    const currentSessionHistory = rawConversationHistory.filter(msg =>
      msg.conversationId === conversationId
    );
    log('info', `Filtered ${rawConversationHistory.length} total history messages to ${currentSessionHistory.length} for current session.`);

    for (const msg of currentSessionHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        let messageContent: string | MessageContentPart[];
        const historicalAttachments: AttachmentData[] = msg.metadata?.attachments || [];

        if (historicalAttachments.length > 0) {
          if (targetProvider === 'openai') {
            messageContent = await OpenAiProvider.processMessageWithAttachments(msg.content, historicalAttachments, true);
          } else { // google
            // GoogleProvider's processMessageWithAttachments returns Part[], need to adapt
            // For now, let's assume a similar structure or simplify for context service
            // This highlights a need for a truly provider-agnostic format if possible,
            // or the context service becomes more of a dispatcher to provider-specific formatters.
            // Let's use OpenAI's format as the "generic" rich format for now.
             messageContent = await OpenAiProvider.processMessageWithAttachments(msg.content, historicalAttachments, true);
            // If Google needs Parts[], the GoogleProvider itself will convert from this MessageContentPart[]
          }
           log('info', `Processed historical message ID ${msg.id || 'N/A'} with ${historicalAttachments.length} attachments.`);
        } else {
          messageContent = msg.content;
        }
        conversationContext.push({
          role: msg.role,
          content: messageContent,
          metadata: msg.metadata, // Preserve metadata
        });
      }
    }

    // Process and add current user message with attachments
    let currentMessageContent: string | MessageContentPart[];
    if (currentAttachments && currentAttachments.length > 0) {
      if (targetProvider === 'openai') {
        currentMessageContent = await OpenAiProvider.processMessageWithAttachments(rawMessage, currentAttachments);
      } else { // google
         currentMessageContent = await OpenAiProvider.processMessageWithAttachments(rawMessage, currentAttachments);
        // Again, GoogleProvider will handle conversion from MessageContentPart[] to its specific Part[]
      }
      log('info', `Processed current message with ${currentAttachments.length} attachments.`);
    } else {
      currentMessageContent = rawMessage;
    }
    conversationContext.push({ role: 'user', content: currentMessageContent });

    log('info', `Built context with ${conversationContext.length} messages.`);
    // Basic validation log
    let totalImages = 0;
    conversationContext.forEach((msg, index) => {
      if (Array.isArray(msg.content)) {
        const imageParts = msg.content.filter(c => c.type === 'image_url').length;
        totalImages += imageParts;
      }
    });
    log('info', `Total image_url parts in final context: ${totalImages}`);

    return conversationContext;
  }
}

export const chatContextService = new ChatContextService();
