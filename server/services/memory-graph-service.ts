/**
 * Memory Graph Service - Phase 2: Semantic Memory Graph
 * 
 * Implements intelligent memory relationship mapping, atomic facts extraction,
 * and memory consolidation for ChatGPT-level memory intelligence.
 */

import { db } from '../db.js';
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
} from '../../shared/schema.js';
import { eq, and, or, inArray, sql, desc } from 'drizzle-orm';
import { aiService } from './ai-service.js';

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

export interface RelationshipDetectionResult {
  relationshipType: 'contradicts' | 'supports' | 'elaborates' | 'supersedes' | 'related';
  confidence: number;
  strength: number;
  metadata?: any;
}

export class MemoryGraphService {
  constructor() {
    // Using the singleton aiService instance
  }

  /**
   * Extract atomic facts from memory content
   */
  async extractAtomicFacts(
    memoryEntry: MemoryEntry,
    sourceContext?: string
  ): Promise<AtomicFact[]> {
    const extractionPrompt = this.buildFactExtractionPrompt(memoryEntry, sourceContext);
    
    try {
      const response = await this.aiService.generateResponse([
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: memoryEntry.content }
      ], {
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 1000
      });

      const factsData = this.parseFactsResponse(response);
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
   * Consolidate related memories intelligently
   */
  async consolidateRelatedMemories(userId: number): Promise<ConsolidationResult[]> {
    const userMemories = await db.select()
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ));

    const consolidationResults: ConsolidationResult[] = [];

    // Find contradictory memories
    const contradictions = await this.findContradictoryMemories(userMemories);
    for (const contradiction of contradictions) {
      const result = await this.resolveContradiction(contradiction);
      if (result) consolidationResults.push(result);
    }

    // Find memories that can be merged
    const mergeableClusters = await this.findMergeableMemories(userMemories);
    for (const cluster of mergeableClusters) {
      const result = await this.mergeMemoryCluster(cluster);
      if (result) consolidationResults.push(result);
    }

    // Update graph metrics
    await this.updateGraphMetrics(userId);

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
    const temporalWeight = this.calculateTemporalWeight(memoryEntry.createdAt);
    const confidenceScore = this.calculateConfidenceScore(facts, relationships);

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
   * Find memories that contradict each other
   */
  private async findContradictoryMemories(memories: MemoryEntry[]): Promise<MemoryEntry[][]> {
    const contradictoryPairs: MemoryEntry[][] = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memory1 = memories[i];
        const memory2 = memories[j];

        const relationship = await this.analyzeMemoryRelationship(memory1, memory2);
        if (relationship?.relationshipType === 'contradicts' && relationship.confidence > 0.8) {
          contradictoryPairs.push([memory1, memory2]);
        }
      }
    }

    return contradictoryPairs;
  }

  /**
   * Analyze relationship between two memories
   */
  private async analyzeMemoryRelationship(
    memory1: MemoryEntry,
    memory2: MemoryEntry
  ): Promise<RelationshipDetectionResult | null> {
    const analysisPrompt = this.buildRelationshipAnalysisPrompt();

    try {
      const response = await this.aiService.generateResponse([
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: `Memory 1: ${memory1.content}\n\nMemory 2: ${memory2.content}` }
      ], {
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 500
      });

      return this.parseRelationshipResponse(response);
    } catch (error) {
      console.error('[MemoryGraphService] Error analyzing relationship:', error);
      return null;
    }
  }

  /**
   * Resolve contradictory memories
   */
  private async resolveContradiction(contradictoryMemories: MemoryEntry[]): Promise<ConsolidationResult | null> {
    if (contradictoryMemories.length !== 2) return null;

    const [memory1, memory2] = contradictoryMemories;
    const resolutionPrompt = this.buildContradictionResolutionPrompt();

    try {
      const response = await this.aiService.generateResponse([
        { role: 'system', content: resolutionPrompt },
        { 
          role: 'user', 
          content: `Memory 1 (${memory1.createdAt}): ${memory1.content}\n\nMemory 2 (${memory2.createdAt}): ${memory2.content}`
        }
      ], {
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 800
      });

      const resolution = this.parseResolutionResponse(response);
      
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
   * Find memories that can be merged
   */
  private async findMergeableMemories(memories: MemoryEntry[]): Promise<MemoryEntry[][]> {
    const clusters: MemoryEntry[][] = [];
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id)) continue;

      const relatedMemories = memories.filter(m => 
        m.id !== memory.id && 
        !processed.has(m.id) &&
        m.category === memory.category
      );

      const cluster = [memory];
      for (const relatedMemory of relatedMemories) {
        const relationship = await this.analyzeMemoryRelationship(memory, relatedMemory);
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

    return clusters;
  }

  /**
   * Merge a cluster of related memories
   */
  private async mergeMemoryCluster(cluster: MemoryEntry[]): Promise<ConsolidationResult | null> {
    if (cluster.length < 2) return null;

    const mergePrompt = this.buildMergePrompt();
    const memoryContents = cluster.map((m, i) => `Memory ${i + 1}: ${m.content}`).join('\n\n');

    try {
      const response = await this.aiService.generateResponse([
        { role: 'system', content: mergePrompt },
        { role: 'user', content: memoryContents }
      ], {
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 1000
      });

      const mergedContent = response.trim();
      
      // Create the merged memory
      const primaryMemory = cluster[0];
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

  /**
   * Calculate temporal weight for a memory
   */
  private calculateTemporalWeight(createdAt: Date | null): number {
    if (!createdAt) return 0.5;
    
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: newer memories have higher weight
    return Math.exp(-daysSinceCreation / 30); // 30-day half-life
  }

  /**
   * Calculate confidence score based on facts and relationships
   */
  private calculateConfidenceScore(facts: AtomicFact[], relationships: MemoryRelationship[]): number {
    const factConfidence = facts.length > 0 
      ? facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length 
      : 0.5;
    
    const relConfidence = relationships.length > 0
      ? relationships.reduce((sum, rel) => sum + rel.confidence, 0) / relationships.length
      : 0.5;
    
    return (factConfidence + relConfidence) / 2;
  }

  /**
   * Build fact extraction prompt
   */
  private buildFactExtractionPrompt(memory: MemoryEntry, sourceContext?: string): string {
    return `You are an expert at extracting atomic facts from memory content. 

Given a memory entry, extract individual atomic facts that can be independently verified.
Each fact should be:
1. Atomic (single piece of information)
2. Specific and verifiable
3. Categorized by type (preference, attribute, relationship, behavior, goal)

Memory Category: ${memory.category}
Source Context: ${sourceContext || 'Not provided'}

Return a JSON array of facts with this structure:
[
  {
    "content": "User prefers morning workouts",
    "type": "preference",
    "confidence": 0.9
  }
]

Focus on extracting 1-5 key facts. Be precise and avoid redundancy.`;
  }

  /**
   * Build relationship analysis prompt
   */
  private buildRelationshipAnalysisPrompt(): string {
    return `You are an expert at analyzing relationships between memory entries.

Given two memories, determine their relationship type:
- contradicts: Information directly conflicts
- supports: Information reinforces or confirms
- elaborates: One memory provides additional detail to the other
- supersedes: Newer information replaces older information
- related: Memories are connected but don't fit other categories

Return JSON with this structure:
{
  "relationshipType": "contradicts|supports|elaborates|supersedes|related",
  "confidence": 0.0-1.0,
  "strength": 0.0-1.0,
  "metadata": { "explanation": "Brief reason for the relationship" }
}

Only respond if confidence > 0.6, otherwise return null.`;
  }

  /**
   * Build contradiction resolution prompt
   */
  private buildContradictionResolutionPrompt(): string {
    return `You are an expert at resolving contradictory information in memory systems.

Given two contradictory memories with timestamps, determine the best resolution:
- supersede: Newer information should replace older (most common)
- merge: Both contain valid but different aspects
- flag: Need human review

Return JSON with this structure:
{
  "action": "supersede|merge|flag",
  "confidence": 0.0-1.0,
  "reason": "Explanation of why this resolution is appropriate"
}`;
  }

  /**
   * Build memory merge prompt
   */
  private buildMergePrompt(): string {
    return `You are an expert at consolidating related memory entries.

Given multiple related memories, create a single consolidated memory that:
1. Preserves all important information
2. Eliminates redundancy
3. Maintains clarity and specificity
4. Uses the same tone and style

Return only the consolidated memory content as a single paragraph.`;
  }

  /**
   * Parse facts response from AI
   */
  private parseFactsResponse(response: string): Array<{content: string, type: string, confidence: number}> {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[MemoryGraphService] Error parsing facts response:', error);
      return [];
    }
  }

  /**
   * Parse relationship response from AI
   */
  private parseRelationshipResponse(response: string): RelationshipDetectionResult | null {
    try {
      const parsed = JSON.parse(response);
      if (parsed && parsed.confidence > 0.6) {
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('[MemoryGraphService] Error parsing relationship response:', error);
      return null;
    }
  }

  /**
   * Parse resolution response from AI
   */
  private parseResolutionResponse(response: string): {action: string, confidence: number, reason: string} {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('[MemoryGraphService] Error parsing resolution response:', error);
      return { action: 'flag', confidence: 0.5, reason: 'Error parsing resolution' };
    }
  }
}