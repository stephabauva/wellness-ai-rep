/**
 * Memory scoring and relevance calculation engine
 * Extracted from intelligent-memory-retrieval.ts for better modularity
 */

import { QueryExpansion, QueryUtils } from './query-utils.js';
import { memoryGraphService } from '../memory-graph-service-instance.js';

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

export interface AdaptiveThreshold {
  semantic: number;
  temporal: number;
  contextual: number;
  diversityBonus: number;
  querySpecificity: number;
}

export interface RelevantMemory {
  id: string;
  content: string;
  category: string;
  importanceScore: number;
  relevanceScore: number;
  retrievalReason: string;
  confidenceLevel: number;
  temporalWeight: number;
  contextualBoost: number;
  diversityScore: number;
  createdAt: Date | null;
}

export class ScoringEngine {
  private thresholdCache: Map<string, AdaptiveThreshold> = new Map();

  /**
   * Calculate semantic similarity between query and memory content
   */
  async calculateSemanticSimilarity(
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
    const commonWords = QueryUtils.findCommonWords(allTerms.toLowerCase(), memoryContent.toLowerCase());
    const totalWords = new Set([
      ...allTerms.toLowerCase().split(/\s+/),
      ...memoryContent.toLowerCase().split(/\s+/)
    ]).size;

    return commonWords.length / Math.max(totalWords, 1);
  }

  /**
   * Calculate temporal relevance based on memory age
   */
  calculateTemporalRelevance(memory: any, context: ConversationContext): number {
    const now = new Date();
    const memoryAge = now.getTime() - new Date(memory.createdAt).getTime();
    const daysSinceCreated = memoryAge / (1000 * 60 * 60 * 24);

    // Exponential decay with different rates based on context
    let decayRate = 0.1;
    if (context.temporalContext === 'immediate') decayRate = 0.05;
    if (context.temporalContext === 'historical') decayRate = 0.2;

    return Math.exp(-decayRate * daysSinceCreated);
  }

  /**
   * Calculate contextual relevance based on conversation state
   */
  async calculateContextualRelevance(
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

  /**
   * Calculate graph-based relevance using memory relationships
   */
  async calculateGraphRelevance(
    memory: any,
    expandedQuery: QueryExpansion
  ): Promise<number> {
    try {
      // Get memory relationships from graph
      const memoryNode = await memoryGraphService.getMemoryNode(memory.id.toString());
      if (!memoryNode || !memoryNode.relationships) return 0.5;

      // Score based on relationship strength to query-relevant memories
      let graphScore = 0.5;
      if (memoryNode.relationships) {
        for (const rel of memoryNode.relationships) {
          const relationshipType = rel.relationshipType;
          if (relationshipType === 'supports' || relationshipType === 'elaborates') {
            graphScore += 0.1 * (typeof rel.strength === 'number' ? rel.strength : 0);
          }
        }
      }

      return Math.min(graphScore, 1.0);
    } catch (error) {
      return 0.5; // Default score if graph analysis fails
    }
  }

  /**
   * Calculate combined score with adaptive weights
   */
  calculateCombinedScore(
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

  /**
   * Calculate adaptive similarity thresholds based on query characteristics
   */
  async calculateAdaptiveThreshold(
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
    const querySpecificity = QueryUtils.calculateQuerySpecificity(expandedQuery);
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

  /**
   * Determine retrieval reasons based on scores
   */
  determineRetrievalReasons(
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

  /**
   * Calculate diversity score for memory selection
   */
  calculateDiversityScore(
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

  // Helper methods for content analysis
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
}