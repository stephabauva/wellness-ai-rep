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
import { BatchAnalyzer } from './memory/BatchAnalyzer';
import { ConsolidationEngine, type ConsolidationResult } from './memory/ConsolidationEngine';

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


export class MemoryGraphService {
  private batchAnalyzer: BatchAnalyzer;
  private consolidationEngine: ConsolidationEngine;
  
  constructor() {
    // Using the singleton aiService instance
    this.batchAnalyzer = new BatchAnalyzer();
    this.consolidationEngine = new ConsolidationEngine();
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
    const relationshipMap = await this.batchAnalyzer.batchAnalyzeRelationships(userMemories);
    
    // Find contradictory memories using cached relationships
    const contradictions = this.consolidationEngine.findContradictoryMemoriesOptimized(
      userMemories, 
      relationshipMap,
      (m1, m2) => this.batchAnalyzer.getCacheKeyForMemories(m1, m2)
    );
    const contradictionPromises = contradictions.map(contradiction => 
      this.consolidationEngine.resolveContradiction(contradiction)
    );
    
    // Find mergeable clusters using cached relationships
    const mergeableClusters = this.consolidationEngine.findMergeableMemoriesOptimized(
      userMemories,
      relationshipMap,
      (m1, m2) => this.batchAnalyzer.getCacheKeyForMemories(m1, m2)
    );
    const mergePromises = mergeableClusters.map(cluster => 
      this.consolidationEngine.mergeMemoryCluster(cluster)
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
   * Analyze relationship between two memories (legacy method for backward compatibility)
   */
  private async analyzeMemoryRelationship(
    memory1: MemoryEntry,
    memory2: MemoryEntry
  ): Promise<RelationshipDetectionResult | null> {
    return this.batchAnalyzer.analyzeSingleRelationship(memory1, memory2);
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