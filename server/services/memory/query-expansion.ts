/**
 * Query expansion engine for intelligent memory retrieval
 * Extracted from intelligent-memory-retrieval.ts for better modularity
 */

import { aiService } from '@shared/services/ai-service';
import { QueryUtils, QueryExpansion } from './query-utils.js';

export interface ConversationContext {
  userId: number;
  conversationId?: string;
  coachingMode: string;
  recentTopics: string[];
  userIntent: string;
  temporalContext: 'immediate' | 'recent' | 'historical';
  emotionalContext?: string;
  sessionLength: number;
}

export class QueryExpansionEngine {
  private queryExpansionCache: Map<string, QueryExpansion> = new Map();

  /**
   * Stage 1: Query expansion with semantic understanding
   */
  async expandQuery(
    query: string,
    context: ConversationContext
  ): Promise<QueryExpansion> {
    const cacheKey = `${query}_${context.coachingMode}_${context.userIntent}`;
    
    if (this.queryExpansionCache.has(cacheKey)) {
      return this.queryExpansionCache.get(cacheKey)!;
    }

    try {
      const expansionPrompt = this.buildQueryExpansionPrompt(query, context);
      
      const response = await aiService.getChatResponse(
        expansionPrompt,
        context.userId,
        'query-expansion',
        1,
        context.coachingMode,
        [],
        { provider: 'openai', model: 'gpt-4o' },
        [],
        false
      );

      const expansion = QueryUtils.parseQueryExpansion(response.response, query);
      
      // Cache for 10 minutes
      this.queryExpansionCache.set(cacheKey, expansion);
      setTimeout(() => this.queryExpansionCache.delete(cacheKey), 600000);

      return expansion;

    } catch (error) {
      console.error('[QueryExpansion] Query expansion failed:', error);
      return {
        originalQuery: query,
        expandedTerms: [query],
        synonyms: [],
        relatedConcepts: [],
        semanticClusters: [query]
      };
    }
  }

  /**
   * Build query expansion prompt for AI service
   */
  private buildQueryExpansionPrompt(query: string, context: ConversationContext): string {
    return QueryUtils.buildQueryExpansionPrompt(query, {
      coachingMode: context.coachingMode,
      userIntent: context.userIntent,
      recentTopics: context.recentTopics
    });
  }
}