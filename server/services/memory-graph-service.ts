/**
 * Memory Graph Service - Phase 2: Semantic Memory Graph
 * 
 * Implements intelligent memory relationship mapping, atomic facts extraction,
 * and memory consolidation for ChatGPT-level memory intelligence.
 */

import { db } from '@shared/database/db';
import { 
  memoryEntries, 
  atomicFacts, 
  memoryRelationships, 
  memoryConsolidationLog,
  memoryGraphMetrics,
  type MemoryEntry,
  type AtomicFact,
  type MemoryRelationship,
  type InsertAtomicFact,
  type InsertMemoryRelationship,
  type InsertMemoryConsolidationLog
} from '@shared/schema';
import { eq, and, or, inArray, sql, desc } from 'drizzle-orm';
import { aiService } from '@shared/services/ai-service';
import { MemoryPrompts } from './memory/MemoryPrompts';
import { ResponseParsers, type RelationshipDetectionResult } from './memory/ResponseParsers';
import { MemoryCalculations } from './memory/MemoryCalculations';

export interface MemoryNode {
  id: string;
  content: string;
  atomicFacts: AtomicFact[];
  relationships: MemoryRelationship[];
  temporalWeight: number;
  confidenceScore: number;
  category: string;
  importanceScore: number;
}

export interface ConsolidationResult {
  type: 'merge' | 'supersede' | 'resolve_contradiction' | 'cluster';
  sourceMemoryIds: string[];
  resultMemoryId?: string;
  confidence: number;
  reason: string;
}

export class MemoryGraphService {
  private relationshipCache = new Map<string, RelationshipDetectionResult>();
  private cacheTimeout = 3600000; // 1 hour
  private cacheTimestamps = new Map<string, number>();
  
  constructor() {
    // Using the singleton aiService instance
    this.startCacheCleanup();
  }

  private startCacheCleanup(): void {
    setInterval(() => this.cleanExpiredCache(), 300000); // 5 minutes
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (now - timestamp > this.cacheTimeout) {
        this.relationshipCache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    }
  }

  private getCacheKey(memory1: MemoryEntry, memory2: MemoryEntry): string {
    const id1 = memory1.id < memory2.id ? memory1.id : memory2.id;
    const id2 = memory1.id < memory2.id ? memory2.id : memory1.id;
    return `${id1}-${id2}`;
  }

  /**
   * Extract atomic facts from memory content
   */
  async extractAtomicFacts(
    memoryEntry: MemoryEntry,
    sourceContext?: string
  ): Promise<AtomicFact[]> {
    const extractionPrompt = MemoryPrompts.buildFactExtractionPrompt(memoryEntry, sourceContext);
    
    try {
      const chatResponse = await aiService.getChatResponse(
        memoryEntry.content,
        memoryEntry.userId,
        'memory-graph-extraction',
        1,
        'general',
        [{ role: 'system', content: extractionPrompt }],
        { provider: 'openai', model: 'gpt-4o' },
        [],
        false
      );
      const response = chatResponse.response;

      const factsData = ResponseParsers.parseFactsResponse(response);
      const insertedFacts: AtomicFact[] = [];

      for (const factData of factsData) {
        const factToInsert: InsertAtomicFact = {
          memoryEntryId: memoryEntry.id,
          factContent: factData.content,
          factType: factData.type,
          confidence: factData.confidence,
          sourceContext: sourceContext || memoryEntry.content.substring(0, 200)
        };

        const [insertedFact] = await db.insert(atomicFacts)
          .values(factToInsert)
          .returning();
        
        insertedFacts.push(insertedFact);
      }

      return insertedFacts;
    } catch (error) {
      console.error('[MemoryGraphService] Error extracting atomic facts:', error);
      return [];
    }
  }

  /**
   * Detect relationships between memories
   */
  async detectMemoryRelationships(
    newMemory: MemoryEntry,
    existingMemories: MemoryEntry[]
  ): Promise<MemoryRelationship[]> {
    const relationships: MemoryRelationship[] = [];

    for (const existingMemory of existingMemories) {
      const relationshipResult = await this.analyzeMemoryRelationship(newMemory, existingMemory);
      
      if (relationshipResult && relationshipResult.confidence > 0.6) {
        const relationshipToInsert: InsertMemoryRelationship = {
          sourceMemoryId: newMemory.id,
          targetMemoryId: existingMemory.id,
          relationshipType: relationshipResult.relationshipType,
          strength: relationshipResult.strength,
          confidence: relationshipResult.confidence,
          metadata: relationshipResult.metadata
        };

        try {
          const [insertedRelationship] = await db.insert(memoryRelationships)
            .values(relationshipToInsert)
            .returning();
          
          relationships.push(insertedRelationship);
        } catch (error) {
          console.error('[MemoryGraphService] Error inserting relationship:', error);
        }
      }
    }

    return relationships;
  }

  /**
   * Consolidate related memories intelligently - OPTIMIZED
   */
  async consolidateRelatedMemories(userId: number): Promise<ConsolidationResult[]> {
    const startTime = Date.now();
    const userMemories = await db.select()
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ));

    if (userMemories.length < 2) return [];

    const consolidationResults: ConsolidationResult[] = [];

    // Optimized batch relationship analysis
    const relationshipMap = await this.batchAnalyzeRelationships(userMemories);
    
    // Find contradictory memories using cached relationships
    const contradictions = this.findContradictoryMemoriesOptimized(userMemories, relationshipMap);
    const contradictionPromises = contradictions.map(contradiction => 
      this.resolveContradiction(contradiction)
    );
    
    // Find mergeable clusters using cached relationships
    const mergeableClusters = this.findMergeableMemoriesOptimized(userMemories, relationshipMap);
    const mergePromises = mergeableClusters.map(cluster => 
      this.mergeMemoryCluster(cluster)
    );

    // Process all consolidations in parallel
    const allResults = await Promise.allSettled([
      ...contradictionPromises,
      ...mergePromises
    ]);

    for (const result of allResults) {
      if (result.status === 'fulfilled' && result.value) {
        consolidationResults.push(result.value);
      }
    }

    // Update graph metrics
    await this.updateGraphMetrics(userId);

    const processingTime = Date.now() - startTime;
    console.log(`[MemoryGraphService] Consolidated ${userMemories.length} memories in ${processingTime}ms`);

    return consolidationResults;
  }

  /**
   * Get memory node with full graph context
   */
  async getMemoryNode(memoryId: string): Promise<MemoryNode | null> {
    const memory = await db.select()
      .from(memoryEntries)
      .where(eq(memoryEntries.id, memoryId))
      .limit(1);

    if (memory.length === 0) return null;

    const facts = await db.select()
      .from(atomicFacts)
      .where(eq(atomicFacts.memoryEntryId, memoryId));

    const relationships = await db.select()
      .from(memoryRelationships)
      .where(or(
        eq(memoryRelationships.sourceMemoryId, memoryId),
        eq(memoryRelationships.targetMemoryId, memoryId)
      ));

    const memoryEntry = memory[0];
    const temporalWeight = MemoryCalculations.calculateTemporalWeight(memoryEntry.createdAt);
    const confidenceScore = MemoryCalculations.calculateConfidenceScore(facts, relationships);

    return {
      id: memoryEntry.id,
      content: memoryEntry.content,
      atomicFacts: facts,
      relationships,
      temporalWeight,
      confidenceScore,
      category: memoryEntry.category,
      importanceScore: memoryEntry.importanceScore
    };
  }

  /**
   * Batch analyze relationships for all memory pairs - OPTIMIZED
   */
  private async batchAnalyzeRelationships(memories: MemoryEntry[]): Promise<Map<string, RelationshipDetectionResult>> {
    const relationshipMap = new Map<string, RelationshipDetectionResult>();
    const uncachedPairs: Array<[MemoryEntry, MemoryEntry, string]> = [];

    // Check cache first
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memory1 = memories[i];
        const memory2 = memories[j];
        const cacheKey = this.getCacheKey(memory1, memory2);
        
        const cached = this.relationshipCache.get(cacheKey);
        if (cached && this.isCacheValid(cacheKey)) {
          relationshipMap.set(cacheKey, cached);
        } else {
          uncachedPairs.push([memory1, memory2, cacheKey]);
        }
      }
    }

    // Batch process uncached pairs in chunks of 10 for optimal performance
    const chunkSize = 10;
    for (let i = 0; i < uncachedPairs.length; i += chunkSize) {
      const chunk = uncachedPairs.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(([memory1, memory2, cacheKey]) => 
        this.analyzeMemoryRelationshipCached(memory1, memory2, cacheKey)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          const cacheKey = chunk[idx][2];
          relationshipMap.set(cacheKey, result.value);
        }
      });
    }

    return relationshipMap;
  }

  /**
   * Find contradictory memories using cached relationships - OPTIMIZED
   */
  private findContradictoryMemoriesOptimized(
    memories: MemoryEntry[], 
    relationshipMap: Map<string, RelationshipDetectionResult>
  ): MemoryEntry[][] {
    const contradictoryPairs: MemoryEntry[][] = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memory1 = memories[i];
        const memory2 = memories[j];
        const cacheKey = this.getCacheKey(memory1, memory2);
        
        const relationship = relationshipMap.get(cacheKey);
        if (relationship?.relationshipType === 'contradicts' && relationship.confidence > 0.8) {
          contradictoryPairs.push([memory1, memory2]);
        }
      }
    }

    return contradictoryPairs;
  }

  /**
   * Analyze relationship with caching - OPTIMIZED
   */
  private async analyzeMemoryRelationshipCached(
    memory1: MemoryEntry,
    memory2: MemoryEntry,
    cacheKey: string
  ): Promise<RelationshipDetectionResult | null> {
    // Check cache first
    const cached = this.relationshipCache.get(cacheKey);
    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    const analysisPrompt = MemoryPrompts.buildRelationshipAnalysisPrompt();

    try {
      const chatResponse = await aiService.getChatResponse(
        `Memory 1: ${memory1.content}\n\nMemory 2: ${memory2.content}`,
        memory1.userId,
        'memory-relationship-analysis',
        1,
        'general',
        [{ role: 'system', content: analysisPrompt }],
        { provider: 'openai', model: 'gpt-4o' },
        [],
        false
      );
      const response = chatResponse.response;

      const result = ResponseParsers.parseRelationshipResponse(response);
      
      // Cache the result
      if (result) {
        this.relationshipCache.set(cacheKey, result);
        this.cacheTimestamps.set(cacheKey, Date.now());
      }
      
      return result;
    } catch (error) {
      console.error('[MemoryGraphService] Error analyzing relationship:', error);
      return null;
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.cacheTimeout;
  }

  /**
   * Analyze relationship between two memories (legacy method for backward compatibility)
   */
  private async analyzeMemoryRelationship(
    memory1: MemoryEntry,
    memory2: MemoryEntry
  ): Promise<RelationshipDetectionResult | null> {
    const cacheKey = this.getCacheKey(memory1, memory2);
    return this.analyzeMemoryRelationshipCached(memory1, memory2, cacheKey);
  }

  /**
   * Resolve contradictory memories
   */
  private async resolveContradiction(contradictoryMemories: MemoryEntry[]): Promise<ConsolidationResult | null> {
    if (contradictoryMemories.length !== 2) return null;

    const [memory1, memory2] = contradictoryMemories;
    const resolutionPrompt = MemoryPrompts.buildContradictionResolutionPrompt();

    try {
      const chatResponse = await aiService.getChatResponse(
        `Memory 1 (${memory1.createdAt}): ${memory1.content}\n\nMemory 2 (${memory2.createdAt}): ${memory2.content}`,
        memory1.userId,
        'memory-contradiction-resolution',
        1,
        'general',
        [{ role: 'system', content: resolutionPrompt }],
        { provider: 'openai', model: 'gpt-4o' },
        [],
        false
      );
      const response = chatResponse.response;

      const resolution = ResponseParsers.parseResolutionResponse(response);
      
      if (resolution.action === 'supersede') {
        // Deactivate the older memory
        const olderMemory = memory1.createdAt! < memory2.createdAt! ? memory1 : memory2;
        const newerMemory = memory1.createdAt! >= memory2.createdAt! ? memory1 : memory2;

        await db.update(memoryEntries)
          .set({ isActive: false })
          .where(eq(memoryEntries.id, olderMemory.id));

        // Log the consolidation
        const logEntry: InsertMemoryConsolidationLog = {
          userId: memory1.userId,
          consolidationType: 'supersede',
          sourceMemoryIds: [memory1.id, memory2.id],
          resultMemoryId: newerMemory.id,
          confidence: resolution.confidence,
          reasonDescription: resolution.reason
        };

        await db.insert(memoryConsolidationLog).values(logEntry);

        return {
          type: 'supersede',
          sourceMemoryIds: [memory1.id, memory2.id],
          resultMemoryId: newerMemory.id,
          confidence: resolution.confidence,
          reason: resolution.reason
        };
      }

      return null;
    } catch (error) {
      console.error('[MemoryGraphService] Error resolving contradiction:', error);
      return null;
    }
  }

  /**
   * Find mergeable memories using cached relationships - OPTIMIZED
   */
  private findMergeableMemoriesOptimized(
    memories: MemoryEntry[],
    relationshipMap: Map<string, RelationshipDetectionResult>
  ): MemoryEntry[][] {
    const clusters: MemoryEntry[][] = [];
    const processed = new Set<string>();

    // Group by category first for efficiency
    const categorizedMemories = new Map<string, MemoryEntry[]>();
    memories.forEach(memory => {
      const category = memory.category;
      if (!categorizedMemories.has(category)) {
        categorizedMemories.set(category, []);
      }
      categorizedMemories.get(category)!.push(memory);
    });

    // Process each category separately  
    for (const categoryMemories of categorizedMemories.values()) {
      if (categoryMemories.length < 2) continue;
      
      for (const memory of categoryMemories) {
        if (processed.has(memory.id)) continue;

        const cluster = [memory];
        
        for (const relatedMemory of categoryMemories) {
          if (relatedMemory.id === memory.id || processed.has(relatedMemory.id)) continue;
          
          const cacheKey = this.getCacheKey(memory, relatedMemory);
          const relationship = relationshipMap.get(cacheKey);
          
          if (relationship?.relationshipType === 'elaborates' && relationship.confidence > 0.7) {
            cluster.push(relatedMemory);
            processed.add(relatedMemory.id);
          }
        }

        if (cluster.length > 1) {
          clusters.push(cluster);
          cluster.forEach(m => processed.add(m.id));
        }
      }
    }

    return clusters;
  }

  /**
   * Merge a cluster of related memories
   */
  private async mergeMemoryCluster(cluster: MemoryEntry[]): Promise<ConsolidationResult | null> {
    if (cluster.length < 2) return null;

    const primaryMemory = cluster[0];
    const mergePrompt = MemoryPrompts.buildMergePrompt();
    const memoryContents = cluster.map((m, i) => `Memory ${i + 1}: ${m.content}`).join('\n\n');

    try {
      const chatResponse = await aiService.getChatResponse(
        memoryContents,
        primaryMemory.userId,
        'memory-merge',
        1,
        'general',
        [{ role: 'system', content: mergePrompt }],
        { provider: 'openai', model: 'gpt-4o' },
        [],
        false
      );
      const response = chatResponse.response;

      const mergedContent = response.trim();
      
      // Create the merged memory
      const [mergedMemory] = await db.insert(memoryEntries)
        .values({
          userId: primaryMemory.userId,
          content: mergedContent,
          category: primaryMemory.category,
          importanceScore: Math.max(...cluster.map(m => m.importanceScore)),
          keywords: Array.from(new Set(cluster.flatMap(m => m.keywords || []))),
          embedding: primaryMemory.embedding, // Will be updated by embedding service
          sourceConversationId: primaryMemory.sourceConversationId
        })
        .returning();

      // Deactivate original memories
      await db.update(memoryEntries)
        .set({ isActive: false })
        .where(inArray(memoryEntries.id, cluster.map(m => m.id)));

      // Log the consolidation
      const logEntry: InsertMemoryConsolidationLog = {
        userId: primaryMemory.userId,
        consolidationType: 'merge',
        sourceMemoryIds: cluster.map(m => m.id),
        resultMemoryId: mergedMemory.id,
        confidence: 0.8,
        reasonDescription: `Merged ${cluster.length} related memories into consolidated entry`
      };

      await db.insert(memoryConsolidationLog).values(logEntry);

      return {
        type: 'merge',
        sourceMemoryIds: cluster.map(m => m.id),
        resultMemoryId: mergedMemory.id,
        confidence: 0.8,
        reason: `Merged ${cluster.length} related memories`
      };
    } catch (error) {
      console.error('[MemoryGraphService] Error merging memories:', error);
      return null;
    }
  }

  /**
   * Update graph metrics for a user
   */
  private async updateGraphMetrics(userId: number): Promise<void> {
    const totalMemories = await db.select({ count: sql`count(*)` })
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ));

    const totalRelationships = await db.select({ count: sql`count(*)` })
      .from(memoryRelationships)
      .innerJoin(memoryEntries, eq(memoryRelationships.sourceMemoryId, memoryEntries.id))
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryRelationships.isActive, true)
      ));

    const contradictionCount = await db.select({ count: sql`count(*)` })
      .from(memoryRelationships)
      .innerJoin(memoryEntries, eq(memoryRelationships.sourceMemoryId, memoryEntries.id))
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryRelationships.relationshipType, 'contradicts'),
        eq(memoryRelationships.isActive, true)
      ));

    const consolidationCount = await db.select({ count: sql`count(*)` })
      .from(memoryConsolidationLog)
      .where(eq(memoryConsolidationLog.userId, userId));

    const memCount = (totalMemories[0]?.count as number) || 0;
    const relCount = (totalRelationships[0]?.count as number) || 0;
    const avgRel = memCount > 0 ? relCount / memCount : 0;
    const density = memCount > 1 ? relCount / (memCount * (memCount - 1) / 2) : 0;

    await db.insert(memoryGraphMetrics)
      .values({
        userId,
        totalMemories: memCount,
        totalRelationships: relCount,
        avgRelationshipsPerMemory: avgRel,
        contradictionCount: (contradictionCount[0]?.count as number) || 0,
        consolidationCount: (consolidationCount[0]?.count as number) || 0,
        graphDensity: density
      })
      .onConflictDoUpdate({
        target: memoryGraphMetrics.userId,
        set: {
          totalMemories: memCount,
          totalRelationships: relCount,
          avgRelationshipsPerMemory: avgRel,
          contradictionCount: (contradictionCount[0]?.count as number) || 0,
          consolidationCount: (consolidationCount[0]?.count as number) || 0,
          graphDensity: density,
          lastCalculated: sql`NOW()`
        }
      });
  }
}