import { AiService } from './ai-service';
import { chatGPTMemoryEnhancement } from './chatgpt-memory-enhancement';
import { AttachmentData } from './providers/ai-provider.interface';

/**
 * Memory-Enhanced AI Service
 * Extends existing AiService with ChatGPT-style memory integration
 * Phase 1: Core memory enhancement with real-time deduplication
 */
export class MemoryEnhancedAIService extends AiService {
  private chatGPTMemory = chatGPTMemoryEnhancement;

  /**
   * Enhanced chat response with memory integration
   * Processes memories in parallel with chat response for optimal performance
   */
  async getChatResponseWithMemory(
    message: string,
    userId: number,
    conversationId: string,
    temperature: number = 0.7,
    mode: string = 'creative',
    conversationHistory: any[] = [],
    modelOverride?: string,
    imageAttachments: string[] = [],
    stream: boolean = false,
    customSystemPrompt?: string
  ): Promise<any> {
    try {
      // Phase 1: Parallel processing approach (ChatGPT style)
      const [memoryProcessingResult, enhancedPromptResult] = await Promise.allSettled([
        // Background memory processing (non-blocking)
        this.chatGPTMemory.processWithDeduplication(userId, message, conversationId),
        // Enhanced system prompt generation
        customSystemPrompt 
          ? Promise.resolve(customSystemPrompt)
          : this.chatGPTMemory.buildEnhancedSystemPrompt(userId, message)
      ]);

      // Use enhanced system prompt or fallback to custom/default
      let systemPrompt = "You are a helpful AI wellness coach.";
      if (enhancedPromptResult.status === 'fulfilled') {
        systemPrompt = enhancedPromptResult.value;
      } else if (customSystemPrompt) {
        systemPrompt = customSystemPrompt;
      }

      // Log memory processing status for debugging
      if (memoryProcessingResult.status === 'rejected') {
        console.warn('[MemoryEnhancedAI] Memory processing failed:', memoryProcessingResult.reason);
      }

      // Convert image attachments to proper format
      const attachments: AttachmentData[] = imageAttachments.map(imagePath => ({
        data: imagePath,
        fileType: 'image/jpeg' // Default, could be enhanced with actual type detection
      }));

      // Call existing chat response method with enhanced system prompt
      const response = await this.getChatResponse(
        message,
        userId,
        conversationId,
        temperature,
        mode,
        conversationHistory,
        modelOverride,
        attachments,
        stream,
        systemPrompt
      );

      // Memory processing completes in background - no need to await
      return response;

    } catch (error) {
      console.error('[MemoryEnhancedAI] Error in enhanced chat response:', error);
      
      // Fallback to existing service without memory enhancement
      const attachments: AttachmentData[] = imageAttachments.map(imagePath => ({
        data: imagePath,
        fileType: 'image/jpeg'
      }));

      return await this.getChatResponse(
        message,
        userId,
        conversationId,
        temperature,
        mode,
        conversationHistory,
        modelOverride,
        attachments,
        stream,
        customSystemPrompt
      );
    }
  }

  /**
   * Get memory-enhanced health insights
   */
  async getMemoryEnhancedHealthInsights(
    healthData: any,
    userId: number,
    timeRange: string = '7d'
  ): Promise<any> {
    try {
      // Build context with relevant health-related memories
      const healthPrompt = await this.chatGPTMemory.buildEnhancedSystemPrompt(
        userId, 
        `health insights analysis for ${timeRange}`
      );

      // Use existing health insights method with enhanced prompt
      return await this.getHealthInsights(healthData, timeRange, healthPrompt);
    } catch (error) {
      console.error('[MemoryEnhancedAI] Error in health insights:', error);
      // Fallback to standard health insights
      return await this.getHealthInsights(healthData, timeRange);
    }
  }

  /**
   * Check if memory enhancement is available
   */
  isMemoryEnhancementAvailable(): boolean {
    return this.chatGPTMemory !== null;
  }

  /**
   * Get memory enhancement performance metrics
   */
  getMemoryMetrics(): any {
    return this.chatGPTMemory.getPerformanceMetrics();
  }

  /**
   * Clear memory caches (for testing/maintenance)
   */
  clearMemoryCaches(): void {
    this.chatGPTMemory.clearCaches();
  }
}

// Export singleton instance
export const memoryEnhancedAIService = new MemoryEnhancedAIService();