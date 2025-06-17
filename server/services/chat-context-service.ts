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

function extractTextContent(content: string | MessageContentPart[] | undefined | null): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    // Concatenate text from all text parts, ignore others like image_url for assistant messages
    return content
      .filter(part => part.type === 'text' && part.text)
      .map(part => part.text)
      .join(' ')
      .trim();
  }
  return ''; // Default for undefined, null, or unexpected content
}

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

    // Determine if current attachments contain images to adjust prompt priority
    const hasCurrentImages = currentAttachments.some(att => att.fileType?.startsWith('image/'));
    
    let systemPromptContent: string;
    
    if (hasCurrentImages) {
      // Image-focused prompt when user is actively sharing images
      systemPromptContent = `${memoryEnhancedPrompt}

=== VISUAL ANALYSIS CAPABILITIES ===
You can see and analyze all images in this conversation. When users share images:
- Analyze visual content directly and confidently
- Reference specific visual elements you can see
- Never ask users to describe what you can already see
- Provide detailed visual analysis when requested

Apply both your personal knowledge about this user AND your visual analysis capabilities to provide the most helpful response.`;
    } else {
      // Memory-focused prompt for text-only conversations
      systemPromptContent = `${memoryEnhancedPrompt}

When images are shared, you can analyze them directly. For text conversations, focus on using your knowledge about this user to provide personalized wellness coaching.`;
    }

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
        const baseTextContent = extractTextContent(msg.content);

        if (targetProvider === 'openai') {
            if (msg.role === 'user') {
                if (historicalAttachments.length > 0) {
                    messageContent = await OpenAiProvider.processMessageWithAttachments(baseTextContent, historicalAttachments, true);
                    log('info', `Processed historical USER message ID ${msg.id || 'N/A'} for OpenAI with ${historicalAttachments.length} attachments.`);
                } else {
                    messageContent = baseTextContent; // Ensure even user messages without attachments yield plain string
                }
            } else { // msg.role === 'assistant' for OpenAI
                messageContent = baseTextContent; // Assistant messages are always text for OpenAI
                if (historicalAttachments.length > 0) {
                    log('warn', `Historical ASSISTANT message ID ${msg.id || 'N/A'} for OpenAI had attachments in metadata; these are ignored for OpenAI assistant role.`);
                }
            }
        } else if (targetProvider === 'google') {
            if (msg.role === 'user' && historicalAttachments.length > 0) {
                messageContent = await GoogleProvider.processMessageWithAttachments(baseTextContent, historicalAttachments);
                log('info', `Processed historical USER message ID ${msg.id || 'N/A'} for Google with ${historicalAttachments.length} attachments.`);
            } else { // Assistant messages or user messages without attachments
                messageContent = baseTextContent;
            }
        } else { // Fallback for any other provider or if logic needs refinement
            messageContent = baseTextContent;
            if (historicalAttachments.length > 0) {
                log('warn', `Unsupported targetProvider '${targetProvider}' for historical attachment processing of message ID ${msg.id || 'N/A'}. Using text content only.`);
            }
        }

        // Ensure messageContent is not empty or only whitespace, especially for OpenAI user messages that might only have images
        if (targetProvider === 'openai' && msg.role === 'user') {
            if (Array.isArray(messageContent)) {
                const hasTextPart = messageContent.some(part => part.type === 'text' && part.text && part.text.trim() !== '');
                if (!hasTextPart) {
                    // OpenAI requires a non-empty text part, even if it's just a space, if other parts (like images) are present for user role.
                    // OpenAiProvider.processMessageWithAttachments should ideally handle this. This is a safeguard.
                    const imageParts = messageContent.filter(part => part.type === 'image_url');
                    if (imageParts.length > 0) {
                       // Use original baseTextContent if available and non-empty, otherwise use a space
                       const textForUserMessage = baseTextContent.trim() !== '' ? baseTextContent.trim() : ' ';
                       messageContent = [{type: 'text', text: textForUserMessage }, ...imageParts];
                       log('info', `Ensured text part for historical USER message ID ${msg.id || 'N/A'} for OpenAI with images.`);
                    } else {
                        // This case (array without text or images) should be rare if processMessageWithAttachments works correctly
                        messageContent = baseTextContent.trim() !== '' ? baseTextContent.trim() : ' '; // Fallback to text or space
                    }
                }
            } else if (typeof messageContent === 'string' && messageContent.trim() === '') {
                 // If it became an empty string and there were attachments, it implies attachments were primary.
                 // However, OpenAiProvider.processMessageWithAttachments should have handled this.
                 // If no attachments, an empty string for user message is fine for OpenAI.
                 // If there WERE attachments, this state (empty string) would be unusual.
                 // For safety, if it's an empty string after processing (e.g. only non-text parts that got stripped), use a space.
                 // This specific scenario is less likely with the current structure but added for robustness.
                 if (historicalAttachments.length > 0) { // Only add space if there were attachments that might have been processed away
                    messageContent = ' ';
                 }
            }
        }

        conversationContext.push({
          role: msg.role,
          content: messageContent,
          metadata: msg.metadata,
        });
      }
    }

    // Process and add current user message with attachments
    let currentMessageContent: string | MessageContentPart[];
    const currentBaseTextContent = extractTextContent(rawMessage); // Use for current message too

    if (currentAttachments && currentAttachments.length > 0) {
      if (targetProvider === 'openai') {
        currentMessageContent = await OpenAiProvider.processMessageWithAttachments(currentBaseTextContent, currentAttachments);
        log('info', `Processed current message for OpenAI with ${currentAttachments.length} attachments.`);
      } else if (targetProvider === 'google') {
         currentMessageContent = await GoogleProvider.processMessageWithAttachments(currentBaseTextContent, currentAttachments);
         log('info', `Processed current message for Google with ${currentAttachments.length} attachments.`);
      } else {
        currentMessageContent = currentBaseTextContent;
        log('warn', `Unsupported targetProvider '${targetProvider}' for current attachment processing. Using text content only.`);
      }
    } else {
      currentMessageContent = currentBaseTextContent;
    }

    // Safeguard for current user message for OpenAI (similar to historical)
    if (targetProvider === 'openai' && Array.isArray(currentMessageContent)) {
        const hasTextPart = currentMessageContent.some(part => part.type === 'text' && part.text && part.text.trim() !== '');
        if (!hasTextPart) {
            const imageParts = currentMessageContent.filter(part => part.type === 'image_url');
            if (imageParts.length > 0) {
                const textForUserMessage = currentBaseTextContent.trim() !== '' ? currentBaseTextContent.trim() : ' ';
                currentMessageContent = [{type: 'text', text: textForUserMessage }, ...imageParts];
                log('info', `Ensured text part for CURRENT USER message for OpenAI with images.`);
            } else {
                currentMessageContent = currentBaseTextContent.trim() !== '' ? currentBaseTextContent.trim() : ' ';
            }
        }
    } else if (targetProvider === 'openai' && typeof currentMessageContent === 'string' && currentMessageContent.trim() === '' && currentAttachments && currentAttachments.length > 0) {
        currentMessageContent = ' '; // If only attachments and empty text, send a space for OpenAI user message
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
