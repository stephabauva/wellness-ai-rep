/**
 * Phase 3: Advanced Retrieval Intelligence
 * Implements multi-stage retrieval pipeline with contextual re-ranking
 */

import { aiService } from '@shared/services/ai-service';
import { memoryGraphService } from './memory-graph-service-instance.js';
import { storage } from '@shared/database/storage';
import { MemoryEntry, ChatMessage } from '../../shared/schema.js';


interface ConversationContext {
  userId: number;
  conversationId?: string;
  coachingMode: string;
  recentTopics: string[];
  userIntent: string;
  temporalContext: 'immediate' | 'recent' | 'historical';
  emotionalContext?: string;
  sessionLength: number;
}

interface QueryExpansion {
  originalQuery: string;
  expandedTerms: string[];
  synonyms: string[];
  relatedConcepts: string[];
  semanticClusters: string[];
}

interface RetrievalCandidate {
  memory: MemoryEntry;
  scores: {
    semantic: number;
    temporal: number;
    contextual: number;
    graph: number;
    combined: number;
  };
  retrievalReason: string[];
  confidence: number;
}

interface AdaptiveThreshold {
  semantic: number;
  temporal: number;
  contextual: number;
  diversityBonus: number;
  querySpecificity: number;
}

interface RelevantMemory {
  id: string; // Changed from number
  content: string;
  category: string;
  importanceScore: number; // Changed from importance
  relevanceScore: number;
  retrievalReason: string;
  confidenceLevel: number;
  temporalWeight: number;
  contextualBoost: number;
  diversityScore: number;
  createdAt: Date | null; // Changed from Date
}

export class IntelligentMemoryRetrieval {
  private queryExpansionCache: Map<string, QueryExpansion> = new Map();
  private thresholdCache: Map<string, AdaptiveThreshold> = new Map();
  private diversityFilterCache: Map<string, Set<string>> = new Map();

  /**
   * Main retrieval pipeline - Stage 1-4
   */
  async getContextualMemories(
    userId: number,
    query: string,
    conversationContext: ConversationContext,
    maxResults: number = 8
  ): Promise<RelevantMemory[]> {
    const startTime = performance.now();

    try {
      // Stage 1: Intent classification and query expansion
      const expandedQuery = await this.expandQuery(query, conversationContext);
      
      // Stage 2: Multi-vector retrieval (content + context + temporal)
      const candidates = await this.multiVectorSearch(userId, expandedQuery, conversationContext);
      
      // Stage 3: Contextual re-ranking based on conversation state
      const ranked = await this.contextualReRank(candidates, conversationContext);
      
      // Stage 4: Diversity filtering to avoid redundancy
      const finalResults = this.diversityFilter(ranked, maxResults);

      const processingTime = performance.now() - startTime;
      console.log(`[IntelligentRetrieval] Complete pipeline: ${processingTime.toFixed(2)}ms`);

      return finalResults;

    } catch (error) {
      console.error('[IntelligentRetrieval] Pipeline error:', error);
      // Fallback to basic retrieval
      return this.basicFallbackRetrieval(userId, query, maxResults);
    }
  }

  /**
   * Stage 1: Query expansion with semantic understanding
   */
  private async expandQuery(
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

      const expansion = this.parseQueryExpansion(response.response, query);
      
      // Cache for 10 minutes
      this.queryExpansionCache.set(cacheKey, expansion);
      setTimeout(() => this.queryExpansionCache.delete(cacheKey), 600000);

      return expansion;

    } catch (error) {
      console.error('[IntelligentRetrieval] Query expansion failed:', error);
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
   * Stage 2: Multi-vector search with different scoring dimensions
   */
  private async multiVectorSearch(
    userId: number,
    expandedQuery: QueryExpansion,
    context: ConversationContext
  ): Promise<RetrievalCandidate[]> {
    try {
      // Get actual memory entries from the database using db connection
      const { db } = await import('@shared/database/db');
      const { memoryEntries } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');

      const userMemories = await db.select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ));

      const candidates: RetrievalCandidate[] = [];
      const adaptiveThreshold = await this.calculateAdaptiveThreshold(expandedQuery, context);

      for (const memoryEntry of userMemories) { // memoryEntry is of type MemoryEntry
        // Calculate multi-dimensional scores using memoryEntry directly
        const semanticScore = await this.calculateSemanticSimilarity(
          expandedQuery, 
          memoryEntry.content
        );
        
        const temporalScore = this.calculateTemporalRelevance(memoryEntry, context);
        const contextualScore = await this.calculateContextualRelevance(memoryEntry, context);
        const graphScore = await this.calculateGraphRelevance(memoryEntry, expandedQuery);

        // Combined scoring with adaptive weights
        const combinedScore = this.calculateCombinedScore({
          semantic: semanticScore,
          temporal: temporalScore,
          contextual: contextualScore,
          graph: graphScore
        }, context);

        if (combinedScore > adaptiveThreshold.semantic) {
          candidates.push({
            memory: memoryEntry, // Use memoryEntry directly
            scores: {
              semantic: semanticScore,
              temporal: temporalScore,
              contextual: contextualScore,
              graph: graphScore,
              combined: combinedScore
            },
            retrievalReason: this.determineRetrievalReasons({
              semantic: semanticScore,
              temporal: temporalScore,
              contextual: contextualScore,
              graph: graphScore
            }, adaptiveThreshold),
            confidence: Math.min(combinedScore * 1.2, 1.0)
          });
        }
      }

      return candidates.sort((a, b) => b.scores.combined - a.scores.combined);

    } catch (error) {
      console.error('[IntelligentRetrieval] Database access failed, using fallback:', error);
      return [];
    }
  }

  /**
   * Stage 3: Contextual re-ranking based on conversation state
   */
  private async contextualReRank(
    candidates: RetrievalCandidate[],
    context: ConversationContext
  ): Promise<RetrievalCandidate[]> {
    // Apply contextual boosts
    for (const candidate of candidates) {
      let contextualBoost = 1.0;

      // Boost based on coaching mode alignment
      if (this.isMemoryRelevantToCoachingMode(candidate.memory, context.coachingMode)) {
        contextualBoost += 0.15;
      }

      // Boost based on recent topic relevance
      if (this.isMemoryRelevantToRecentTopics(candidate.memory, context.recentTopics)) {
        contextualBoost += 0.20;
      }

      // Boost based on user intent alignment
      if (this.isMemoryRelevantToIntent(candidate.memory, context.userIntent)) {
        contextualBoost += 0.25;
      }

      // Temporal context boost
      if (context.temporalContext === 'immediate' && this.isRecentMemory(candidate.memory)) {
        contextualBoost += 0.10;
      }

      // Apply boost to combined score
      candidate.scores.combined *= contextualBoost;
      candidate.confidence = Math.min(candidate.confidence * contextualBoost, 1.0);
    }

    return candidates.sort((a, b) => b.scores.combined - a.scores.combined);
  }

  /**
   * Stage 4: Diversity filtering to prevent redundant memories
   */
  private diversityFilter(
    candidates: RetrievalCandidate[],
    maxResults: number
  ): RelevantMemory[] {
    const selectedMemories: RelevantMemory[] = [];
    const contentHashes = new Set<string>();
    const categoryCount = new Map<string, number>();

    for (const candidate of candidates) {
      if (selectedMemories.length >= maxResults) break;

      // Check content diversity
      const contentHash = this.generateContentHash(candidate.memory.content);
      if (contentHashes.has(contentHash)) continue;

      // Check category diversity
      const categoryLimits = this.getCategoryLimits(maxResults);
      const currentCategoryCount = categoryCount.get(candidate.memory.category) || 0;
      const categoryLimit = categoryLimits.get(candidate.memory.category) || Math.ceil(maxResults / 4);
      
      if (currentCategoryCount >= categoryLimit) continue;

      // Add diversity score
      const diversityScore = this.calculateDiversityScore(
        candidate.memory,
        selectedMemories,
        contentHashes.size
      );

      selectedMemories.push({
        id: candidate.memory.id,
        content: candidate.memory.content,
        category: candidate.memory.category,
        importanceScore: candidate.memory.importanceScore, // Changed from importance
        relevanceScore: candidate.scores.combined,
        retrievalReason: candidate.retrievalReason.join(', '),
        confidenceLevel: candidate.confidence,
        temporalWeight: candidate.scores.temporal,
        contextualBoost: candidate.scores.contextual,
        diversityScore,
        createdAt: candidate.memory.createdAt
      });

      contentHashes.add(contentHash);
      categoryCount.set(candidate.memory.category, currentCategoryCount + 1);
    }

    return selectedMemories;
  }

  /**
   * Calculate adaptive similarity thresholds based on query characteristics
   */
  private async calculateAdaptiveThreshold(
    expandedQuery: QueryExpansion,
    context: ConversationContext
  ): Promise<AdaptiveThreshold> {
    const cacheKey = `${expandedQuery.originalQuery}_${context.coachingMode}_${context.userIntent}`;
    
    if (this.thresholdCache.has(cacheKey)) {
      return this.thresholdCache.get(cacheKey)!;
    }

    // Base thresholds
    let semanticThreshold = 0.7;
    let temporalThreshold = 0.3;
    let contextualThreshold = 0.5;
    let diversityBonus = 0.1;

    // Adjust based on query specificity
    const querySpecificity = this.calculateQuerySpecificity(expandedQuery);
    if (querySpecificity > 0.8) {
      semanticThreshold -= 0.1; // More lenient for specific queries
    } else if (querySpecificity < 0.4) {
      semanticThreshold += 0.1; // More strict for vague queries
    }

    // Adjust based on conversation context
    if (context.temporalContext === 'immediate') {
      temporalThreshold += 0.2;
    }

    if (context.sessionLength > 10) {
      contextualThreshold += 0.1; // More contextual awareness in longer sessions
    }

    const threshold = {
      semantic: semanticThreshold,
      temporal: temporalThreshold,
      contextual: contextualThreshold,
      diversityBonus,
      querySpecificity
    };

    // Cache for 5 minutes
    this.thresholdCache.set(cacheKey, threshold);
    setTimeout(() => this.thresholdCache.delete(cacheKey), 300000);

    return threshold;
  }

  // Helper methods for scoring and analysis
  private async calculateSemanticSimilarity(
    expandedQuery: QueryExpansion,
    memoryContent: string
  ): Promise<number> {
    // Use expanded terms for better matching
    const allTerms = [
      expandedQuery.originalQuery,
      ...expandedQuery.expandedTerms,
      ...expandedQuery.synonyms,
      ...expandedQuery.relatedConcepts
    ].join(' ');

    // Simple text similarity (in production, use vector embeddings)
    const commonWords = this.findCommonWords(allTerms.toLowerCase(), memoryContent.toLowerCase());
    const totalWords = new Set([
      ...allTerms.toLowerCase().split(/\s+/),
      ...memoryContent.toLowerCase().split(/\s+/)
    ]).size;

    return commonWords.length / Math.max(totalWords, 1);
  }

  private calculateTemporalRelevance(memory: any, context: ConversationContext): number {
    const now = new Date();
    const memoryAge = now.getTime() - new Date(memory.createdAt).getTime();
    const daysSinceCreated = memoryAge / (1000 * 60 * 60 * 24);

    // Exponential decay with different rates based on context
    let decayRate = 0.1;
    if (context.temporalContext === 'immediate') decayRate = 0.05;
    if (context.temporalContext === 'historical') decayRate = 0.2;

    return Math.exp(-decayRate * daysSinceCreated);
  }

  private async calculateContextualRelevance(
    memory: any,
    context: ConversationContext
  ): Promise<number> {
    let relevance = 0.5; // Base relevance

    // Coaching mode alignment
    if (this.isMemoryRelevantToCoachingMode(memory, context.coachingMode)) {
      relevance += 0.2;
    }

    // Recent topics alignment
    if (this.isMemoryRelevantToRecentTopics(memory, context.recentTopics)) {
      relevance += 0.2;
    }

    // User intent alignment
    if (this.isMemoryRelevantToIntent(memory, context.userIntent)) {
      relevance += 0.3;
    }

    return Math.min(relevance, 1.0);
  }

  private async calculateGraphRelevance(
    memory: any,
    expandedQuery: QueryExpansion
  ): Promise<number> {
    try {
      // Get memory relationships from graph
      const memoryNode = await memoryGraphService.getMemoryNode(memory.id.toString());
      if (!memoryNode || !memoryNode.relationships) return 0.5;

      // Score based on relationship strength to query-relevant memories
      let graphScore = 0.5;
      if (memoryNode.relationships) { // Ensure relationships exist
        for (const rel of memoryNode.relationships) {
          // Assuming rel is of type MemoryRelationship or similar, which has relationshipType
          const relationshipType = rel.relationshipType;
          if (relationshipType === 'supports' || relationshipType === 'elaborates') {
            // Ensure rel.strength exists and is a number if MemoryRelationship is not strictly enforced
            graphScore += 0.1 * (typeof rel.strength === 'number' ? rel.strength : 0);
          }
        }
      }

      return Math.min(graphScore, 1.0);
    } catch (error) {
      return 0.5; // Default score if graph analysis fails
    }
  }

  private calculateCombinedScore(
    scores: { semantic: number; temporal: number; contextual: number; graph: number },
    context: ConversationContext
  ): number {
    // Adaptive weights based on context
    let weights = {
      semantic: 0.4,
      temporal: 0.2,
      contextual: 0.3,
      graph: 0.1
    };

    // Adjust weights based on context
    if (context.temporalContext === 'immediate') {
      weights.temporal = 0.3;
      weights.semantic = 0.35;
    }

    if (context.sessionLength > 10) {
      weights.contextual = 0.4;
      weights.semantic = 0.3;
    }

    return (
      scores.semantic * weights.semantic +
      scores.temporal * weights.temporal +
      scores.contextual * weights.contextual +
      scores.graph * weights.graph
    );
  }

  // Additional helper methods
  private buildQueryExpansionPrompt(query: string, context: ConversationContext): string {
    return `You are a semantic query expansion expert. Given a user query and context, expand it with related terms, synonyms, and concepts.

Query: "${query}"
Coaching Mode: ${context.coachingMode}
User Intent: ${context.userIntent}
Recent Topics: ${context.recentTopics.join(', ')}

Please provide a JSON response with:
{
  "expandedTerms": ["term1", "term2", ...],
  "synonyms": ["synonym1", "synonym2", ...],
  "relatedConcepts": ["concept1", "concept2", ...],
  "semanticClusters": ["cluster1", "cluster2", ...]
}

Focus on health, wellness, and fitness terminology relevant to the coaching context.`;
  }

  private parseQueryExpansion(response: string, originalQuery: string): QueryExpansion {
    try {
      let content = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];
      
      const parsed = JSON.parse(content);
      return {
        originalQuery,
        expandedTerms: parsed.expandedTerms || [],
        synonyms: parsed.synonyms || [],
        relatedConcepts: parsed.relatedConcepts || [],
        semanticClusters: parsed.semanticClusters || []
      };
    } catch (error) {
      return {
        originalQuery,
        expandedTerms: [originalQuery],
        synonyms: [],
        relatedConcepts: [],
        semanticClusters: [originalQuery]
      };
    }
  }

  private determineRetrievalReasons(
    scores: { semantic: number; temporal: number; contextual: number; graph: number },
    threshold: AdaptiveThreshold
  ): string[] {
    const reasons: string[] = [];
    
    if (scores.semantic > threshold.semantic) reasons.push('semantic_match');
    if (scores.temporal > threshold.temporal) reasons.push('temporal_relevance');
    if (scores.contextual > threshold.contextual) reasons.push('contextual_relevance');
    if (scores.graph > 0.6) reasons.push('graph_connection');
    
    return reasons.length > 0 ? reasons : ['general_relevance'];
  }

  private isMemoryRelevantToCoachingMode(memory: any, coachingMode: string): boolean {
    const modeKeywords = {
      fitness: ['workout', 'exercise', 'gym', 'training', 'fitness'],
      nutrition: ['food', 'diet', 'meal', 'nutrition', 'calories'],
      wellness: ['sleep', 'stress', 'mental', 'wellness', 'health'],
      general: ['goal', 'progress', 'motivation', 'habit']
    };

    const keywords = modeKeywords[coachingMode as keyof typeof modeKeywords] || modeKeywords.general;
    return keywords.some(keyword => 
      memory.content.toLowerCase().includes(keyword) || 
      memory.category.toLowerCase().includes(keyword)
    );
  }

  private isMemoryRelevantToRecentTopics(memory: any, recentTopics: string[]): boolean {
    return recentTopics.some(topic => 
      memory.content.toLowerCase().includes(topic.toLowerCase())
    );
  }

  private isMemoryRelevantToIntent(memory: any, userIntent: string): boolean {
    const intentKeywords = {
      question: ['?', 'how', 'what', 'when', 'where', 'why'],
      goal_setting: ['goal', 'target', 'aim', 'objective'],
      progress_check: ['progress', 'achievement', 'result', 'improvement'],
      advice_seeking: ['advice', 'suggestion', 'recommendation', 'help']
    };

    const keywords = intentKeywords[userIntent as keyof typeof intentKeywords] || [];
    return keywords.some(keyword => 
      memory.content.toLowerCase().includes(keyword)
    );
  }

  private isRecentMemory(memory: any): boolean {
    const daysSinceCreated = (Date.now() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated <= 7; // Within last week
  }

  private calculateQuerySpecificity(expandedQuery: QueryExpansion): number {
    const totalTerms = expandedQuery.expandedTerms.length + 
                      expandedQuery.synonyms.length + 
                      expandedQuery.relatedConcepts.length;
    
    // More specific queries have fewer expanded terms
    return Math.max(0, 1 - (totalTerms / 20));
  }

  private findCommonWords(text1: string, text2: string): string[] {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    
    return Array.from(words1).filter(word => words2.has(word));
  }

  private generateContentHash(content: string): string {
    // Simple content hash for diversity checking
    return content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .sort()
      .slice(0, 5)
      .join('_');
  }

  private getCategoryLimits(maxResults: number): Map<string, number> {
    const limits = new Map<string, number>();
    limits.set('preference', Math.ceil(maxResults * 0.3));
    limits.set('personal_info', Math.ceil(maxResults * 0.2));
    limits.set('context', Math.ceil(maxResults * 0.3));
    limits.set('instruction', Math.ceil(maxResults * 0.2));
    return limits;
  }

  private calculateDiversityScore(
    memory: any,
    existingMemories: RelevantMemory[],
    diversityCount: number
  ): number {
    // Higher score for memories that add diversity
    const baseDiversity = Math.min(diversityCount / 10, 1.0);
    
    // Bonus for different categories
    const existingCategories = new Set(existingMemories.map(m => m.category));
    const categoryBonus = existingCategories.has(memory.category) ? 0 : 0.2;
    
    return Math.min(baseDiversity + categoryBonus, 1.0);
  }

// ... (other code) ...

  private async basicFallbackRetrieval(
    userId: number,
    query: string,
    maxResults: number
  ): Promise<RelevantMemory[]> {
    // Simple fallback using basic text matching on ChatMessages
    const chatMessages: ChatMessage[] = await storage.getMessages(userId);

    return chatMessages
      .filter(msg =>
        msg.content.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, maxResults)
      .map((msg: ChatMessage) => ({
        id: msg.id.toString(), // Convert number id to string
        content: msg.content,
        category: 'chat_history', // Assign a default category
        importanceScore: 0.5, // Assign a default importanceScore
        relevanceScore: 0.7,
        retrievalReason: 'fallback_text_match_chat',
        confidenceLevel: 0.6,
        temporalWeight: 0.5,
        contextualBoost: 0.5,
        diversityScore: 0.5,
        createdAt: msg.timestamp // Changed from memory.createdAt
      }));
  }
}

export const intelligentMemoryRetrieval = new IntelligentMemoryRetrieval();