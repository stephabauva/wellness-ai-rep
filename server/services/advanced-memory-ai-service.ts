import { aiService } from './ai-service';
import { chatGPTMemoryEnhancement } from './chatgpt-memory-enhancement';
import { memoryRelationshipEngine } from './memory-relationship-engine';
import { memoryService } from './memory-service';
import { AttachmentData } from './providers/ai-provider.interface';
import crypto from 'crypto';

interface ContextualMemoryInsight {
  memory: any;
  relevanceScore: number;
  relationshipContext: string;
  atomicFacts: string[];
  depth: number;
}

interface EnhancedSystemPrompt {
  basePrompt: string;
  memoryContext: string;
  relationshipInsights: string;
  atomicFactSummary: string;
  totalMemoriesUsed: number;
  processingTime: number;
}

/**
 * Phase 2: Advanced Memory-Aware AI Service
 * Integrates relationship mapping, atomic facts, and semantic clustering 
 * with ChatGPT-style memory enhancement for intelligent conversations
 */
export class AdvancedMemoryAIService {
  private contextCache = new Map<string, ContextualMemoryInsight[]>();
  private promptCache = new Map<string, EnhancedSystemPrompt>();
  
  // Performance optimization settings
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private cacheTimestamps = new Map<string, number>();

  /**
   * Enhanced chat response with Phase 2 relationship-aware memory
   */
  async getChatResponseWithAdvancedMemory(
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
    const startTime = Date.now();
    
    try {
      // Phase 2: Advanced parallel processing with relationship analysis
      const [memoryProcessingResult, enhancedPromptResult] = await Promise.allSettled([
        // Background memory processing with relationship discovery
        this.processWithAdvancedMemoryAnalysis(userId, message, conversationId),
        // Enhanced system prompt with relationship context
        customSystemPrompt 
          ? Promise.resolve({ basePrompt: customSystemPrompt, memoryContext: '', relationshipInsights: '', atomicFactSummary: '', totalMemoriesUsed: 0, processingTime: 0 })
          : this.buildRelationshipAwareSystemPrompt(userId, message)
      ]);

      // Use enhanced system prompt with relationship context
      let systemPrompt = "You are a helpful AI wellness coach with advanced memory capabilities.";
      if (enhancedPromptResult.status === 'fulfilled') {
        const promptData = enhancedPromptResult.value;
        if (typeof promptData === 'string') {
          systemPrompt = promptData;
        } else {
          systemPrompt = this.formatEnhancedPrompt(promptData);
        }
      } else if (customSystemPrompt) {
        systemPrompt = customSystemPrompt;
      }

      // Log processing status for monitoring
      if (memoryProcessingResult.status === 'rejected') {
        console.warn('[AdvancedMemoryAI] Memory processing failed:', memoryProcessingResult.reason);
      }

      // Convert attachments and call AI service
      const attachments: AttachmentData[] = imageAttachments.map((imagePath, index) => ({
        fileName: `image_${index}.jpg`,
        fileType: 'image/jpeg',
        url: imagePath
      }));

      const messageId = Date.now();
      const aiConfig = { provider: "openai", model: modelOverride || "gpt-4o" };
      
      const response = await aiService.getChatResponse(
        message,
        userId,
        conversationId,
        messageId,
        mode,
        conversationHistory,
        aiConfig,
        attachments,
        false // automaticModelSelection
      );

      const totalTime = Date.now() - startTime;
      console.log(`[AdvancedMemoryAI] Chat response completed in ${totalTime}ms`);

      return response;

    } catch (error) {
      console.error('[AdvancedMemoryAI] Error in advanced chat response:', error);
      
      // Fallback to Phase 1 memory enhancement
      try {
        return await chatGPTMemoryEnhancement.getChatResponseWithMemory?.(
          message, userId, conversationId, temperature, mode, 
          conversationHistory, modelOverride, imageAttachments, stream, customSystemPrompt
        );
      } catch (fallbackError) {
        // Final fallback to basic AI service
        const fallbackAttachments: AttachmentData[] = imageAttachments.map((imagePath, index) => ({
          fileName: `image_${index}.jpg`,
          fileType: 'image/jpeg',
          url: imagePath
        }));

        const fallbackMessageId = Date.now();
        const fallbackAiConfig = { provider: "openai", model: modelOverride || "gpt-4o" };

        return await aiService.getChatResponse(
          message, userId, conversationId, fallbackMessageId, mode,
          conversationHistory, fallbackAiConfig, fallbackAttachments
        );
      }
    }
  }

  /**
   * Process message with advanced memory analysis including relationships
   */
  private async processWithAdvancedMemoryAnalysis(
    userId: number,
    message: string,
    conversationId: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Phase 1: Basic deduplication and memory processing
      await chatGPTMemoryEnhancement.processWithDeduplication(userId, message, conversationId);
      
      // Phase 2: Advanced relationship analysis
      const userMemories = await this.getUserRecentMemories(userId, 20);
      
      if (userMemories.length > 1) {
        // Extract atomic facts from the new message
        const messageHash = crypto.createHash('md5').update(message).digest('hex');
        await memoryRelationshipEngine.extractAtomicFacts(messageHash, message);
        
        // Discover relationships with existing memories
        const mostRecentMemory = userMemories[0];
        await memoryRelationshipEngine.discoverRelationships(mostRecentMemory.id, userMemories.slice(1));
        
        // Build semantic clusters for improved organization
        await memoryRelationshipEngine.buildSemanticClusters(userMemories);
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`[AdvancedMemoryAI] Advanced memory analysis completed in ${processingTime}ms`);
      
    } catch (error) {
      console.error('[AdvancedMemoryAI] Advanced memory analysis failed:', error);
      // Continue without advanced analysis - Phase 1 still works
    }
  }

  /**
   * Build relationship-aware system prompt with contextual insights
   */
  async buildRelationshipAwareSystemPrompt(
    userId: number,
    currentMessage: string
  ): Promise<EnhancedSystemPrompt> {
    const promptCacheKey = `advanced_prompt_${userId}_${crypto.createHash('md5').update(currentMessage.toLowerCase().trim()).digest('hex')}`;
    
    // Check cache first
    if (this.promptCache.has(promptCacheKey) && this.isCacheValid(promptCacheKey)) {
      return this.promptCache.get(promptCacheKey)!;
    }

    const startTime = Date.now();
    
    try {
      // Get contextual memory insights with relationships
      const memoryInsights = await this.getContextualMemoryInsights(userId, currentMessage);
      
      // Build enhanced prompt components
      const basePrompt = "You are a helpful AI wellness coach with advanced memory and relationship understanding.";
      
      const memoryContext = this.buildMemoryContextFromInsights(memoryInsights);
      const relationshipInsights = this.buildRelationshipInsights(memoryInsights);
      const atomicFactSummary = this.buildAtomicFactSummary(memoryInsights);
      
      const enhancedPrompt: EnhancedSystemPrompt = {
        basePrompt,
        memoryContext,
        relationshipInsights,
        atomicFactSummary,
        totalMemoriesUsed: memoryInsights.length,
        processingTime: Date.now() - startTime
      };
      
      // Cache the result
      this.promptCache.set(promptCacheKey, enhancedPrompt);
      this.cacheTimestamps.set(promptCacheKey, Date.now());
      
      return enhancedPrompt;
      
    } catch (error) {
      console.error('[AdvancedMemoryAI] Enhanced prompt building failed:', error);
      return {
        basePrompt: "You are a helpful AI wellness coach.",
        memoryContext: '',
        relationshipInsights: '',
        atomicFactSummary: '',
        totalMemoriesUsed: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get contextual memory insights with relationship analysis
   */
  private async getContextualMemoryInsights(
    userId: number,
    currentMessage: string
  ): Promise<ContextualMemoryInsight[]> {
    const cacheKey = `insights_${userId}_${crypto.createHash('md5').update(currentMessage).digest('hex')}`;
    
    if (this.contextCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    try {
      const insights: ContextualMemoryInsight[] = [];
      
      // Get recent user memories
      const userMemories = await this.getUserRecentMemories(userId, 10);
      
      if (userMemories.length === 0) {
        return insights;
      }
      
      // For each memory, get related memories through relationship analysis
      for (const memory of userMemories.slice(0, 3)) { // Limit for performance
        try {
          const relatedMemories = await memoryRelationshipEngine.getRelatedMemories(memory.id, 2, 5);
          const atomicFacts = await memoryRelationshipEngine.extractAtomicFacts(memory.id, memory.content);
          
          const insight: ContextualMemoryInsight = {
            memory,
            relevanceScore: this.calculateRelevanceScore(memory.content, currentMessage),
            relationshipContext: this.buildRelationshipContext(relatedMemories),
            atomicFacts: atomicFacts.map(fact => fact.content),
            depth: 0
          };
          
          insights.push(insight);
          
          // Add related memories as additional insights
          for (const related of relatedMemories.slice(0, 2)) {
            insights.push({
              memory: related.memory,
              relevanceScore: related.relationship.strength,
              relationshipContext: `${related.relationship.relationshipType}: ${related.relationship.context}`,
              atomicFacts: [],
              depth: related.depth
            });
          }
          
        } catch (error) {
          console.warn('[AdvancedMemoryAI] Relationship analysis failed for memory:', memory.id, error);
        }
      }
      
      // Sort by relevance and limit results
      insights.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const limitedInsights = insights.slice(0, 8);
      
      // Cache the results
      this.contextCache.set(cacheKey, limitedInsights);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return limitedInsights;
      
    } catch (error) {
      console.error('[AdvancedMemoryAI] Contextual insights failed:', error);
      return [];
    }
  }

  /**
   * Helper methods for building prompt components
   */
  private buildMemoryContextFromInsights(insights: ContextualMemoryInsight[]): string {
    if (insights.length === 0) return '';
    
    const contextItems = insights
      .filter(insight => insight.depth === 0) // Primary memories only
      .slice(0, 4)
      .map(insight => {
        const priority = insight.relevanceScore > 0.8 ? '[Important]' : '';
        return `- ${priority} ${insight.memory.content}`.trim();
      });
    
    return contextItems.join('\n');
  }

  private buildRelationshipInsights(insights: ContextualMemoryInsight[]): string {
    const relationships = insights
      .filter(insight => insight.relationshipContext && insight.depth > 0)
      .slice(0, 3)
      .map(insight => `- ${insight.relationshipContext}`)
      .join('\n');
    
    return relationships || '';
  }

  private buildAtomicFactSummary(insights: ContextualMemoryInsight[]): string {
    const allFacts = insights.flatMap(insight => insight.atomicFacts);
    const topFacts = allFacts.slice(0, 5);
    
    return topFacts.length > 0 ? `Key facts: ${topFacts.join('; ')}` : '';
  }

  private formatEnhancedPrompt(promptData: EnhancedSystemPrompt): string {
    let prompt = promptData.basePrompt;
    
    if (promptData.memoryContext) {
      prompt += `\n\nUser context:\n${promptData.memoryContext}`;
    }
    
    if (promptData.relationshipInsights) {
      prompt += `\n\nRelationship insights:\n${promptData.relationshipInsights}`;
    }
    
    if (promptData.atomicFactSummary) {
      prompt += `\n\n${promptData.atomicFactSummary}`;
    }
    
    prompt += '\n\nUse this information naturally to provide personalized, contextually-aware guidance. Do not explicitly mention that you are referencing stored information or relationships.';
    
    return prompt;
  }

  private calculateRelevanceScore(memoryContent: string, currentMessage: string): number {
    const memoryWords = new Set(memoryContent.toLowerCase().split(/\s+/));
    const messageWords = new Set(currentMessage.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...memoryWords].filter(word => messageWords.has(word)));
    const union = new Set([...memoryWords, ...messageWords]);
    
    return intersection.size / union.size;
  }

  private buildRelationshipContext(relatedMemories: any[]): string {
    return relatedMemories
      .slice(0, 2)
      .map(rm => `${rm.relationship.relationshipType}: ${rm.relationship.context}`)
      .join('; ');
  }

  private async getUserRecentMemories(userId: number, limit: number = 10): Promise<any[]> {
    try {
      // Use existing memory service to get recent memories
      const allMemories = await memoryService.getUserMemories(userId);
      return allMemories.slice(0, limit);
    } catch (error) {
      console.error('[AdvancedMemoryAI] Failed to get user memories:', error);
      return [];
    }
  }

  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }

  /**
   * Advanced memory retrieval with relationship context
   */
  async getAdvancedMemoryInsights(
    userId: number,
    query: string,
    maxResults: number = 8
  ): Promise<ContextualMemoryInsight[]> {
    try {
      return await this.getContextualMemoryInsights(userId, query);
    } catch (error) {
      console.error('[AdvancedMemoryAI] Advanced memory insights failed:', error);
      return [];
    }
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): any {
    return {
      contextCacheSize: this.contextCache.size,
      promptCacheSize: this.promptCache.size,
      relationshipEngineMetrics: memoryRelationshipEngine.getPerformanceMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear caches (for testing and maintenance)
   */
  clearCaches(): void {
    this.contextCache.clear();
    this.promptCache.clear();
    this.cacheTimestamps.clear();
    memoryRelationshipEngine.clearCaches();
  }
}

// Export singleton instance
export const advancedMemoryAIService = new AdvancedMemoryAIService();