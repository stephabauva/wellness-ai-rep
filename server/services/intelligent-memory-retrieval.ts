/**
 * Phase 3: Advanced Retrieval Intelligence
 * Implements multi-stage retrieval pipeline with contextual re-ranking
 */

import { aiService } from '@shared/services/ai-service';
import { memoryGraphService } from './memory-graph-service-instance.js';
import { storage } from '@shared/database/storage';
import { MemoryEntry, ChatMessage } from '../../shared/schema.js';
import { QueryUtils, QueryExpansion } from './memory/query-utils.js';
import { ScoringEngine, ConversationContext, AdaptiveThreshold, RelevantMemory } from './memory/scoring-engine.js';
import { QueryExpansionEngine } from './memory/query-expansion.js';




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


export class IntelligentMemoryRetrieval {
  private diversityFilterCache: Map<string, Set<string>> = new Map();
  private scoringEngine: ScoringEngine = new ScoringEngine();
  private queryExpansionEngine: QueryExpansionEngine = new QueryExpansionEngine();

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
      const expandedQuery = await this.queryExpansionEngine.expandQuery(query, conversationContext);
      
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
      const adaptiveThreshold = await this.scoringEngine.calculateAdaptiveThreshold(expandedQuery, context);

      for (const memoryEntry of userMemories) { // memoryEntry is of type MemoryEntry
        // Calculate multi-dimensional scores using memoryEntry directly
        const semanticScore = await this.scoringEngine.calculateSemanticSimilarity(
          expandedQuery, 
          memoryEntry.content
        );
        
        const temporalScore = this.scoringEngine.calculateTemporalRelevance(memoryEntry, context);
        const contextualScore = await this.scoringEngine.calculateContextualRelevance(memoryEntry, context);
        const graphScore = await this.scoringEngine.calculateGraphRelevance(memoryEntry, expandedQuery);

        // Combined scoring with adaptive weights
        const combinedScore = this.scoringEngine.calculateCombinedScore({
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
            retrievalReason: this.scoringEngine.determineRetrievalReasons({
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

      // Use scoring engine for contextual analysis (methods are private, so we implement inline for now)
      // This could be extracted to public methods in scoring engine if needed
      contextualBoost += 0.1; // Base boost for now

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
      const contentHash = QueryUtils.generateContentHash(candidate.memory.content);
      if (contentHashes.has(contentHash)) continue;

      // Check category diversity
      const categoryLimits = this.getCategoryLimits(maxResults);
      const currentCategoryCount = categoryCount.get(candidate.memory.category) || 0;
      const categoryLimit = categoryLimits.get(candidate.memory.category) || Math.ceil(maxResults / 4);
      
      if (currentCategoryCount >= categoryLimit) continue;

      // Add diversity score
      const diversityScore = this.scoringEngine.calculateDiversityScore(
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





  private getCategoryLimits(maxResults: number): Map<string, number> {
    const limits = new Map<string, number>();
    limits.set('preference', Math.ceil(maxResults * 0.3));
    limits.set('personal_info', Math.ceil(maxResults * 0.2));
    limits.set('context', Math.ceil(maxResults * 0.3));
    limits.set('instruction', Math.ceil(maxResults * 0.2));
    return limits;
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