/**
 * Memory Graph Consolidation Engine - Extracted from MemoryGraphService
 * 
 * Handles intelligent memory consolidation operations including contradiction resolution,
 * memory merging, and related memory clustering algorithms.
 */

import { db } from '@shared/database/db';
import { 
  memoryEntries, 
  memoryConsolidationLog,
  type MemoryEntry,
  type InsertMemoryConsolidationLog
} from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { aiService } from '@shared/services/ai-service';
import { MemoryPrompts } from './MemoryPrompts';
import { ResponseParsers, type RelationshipDetectionResult } from './ResponseParsers';

export interface ConsolidationResult {
  type: 'merge' | 'supersede' | 'resolve_contradiction' | 'cluster';
  sourceMemoryIds: string[];
  resultMemoryId?: string;
  confidence: number;
  reason: string;
}

export class ConsolidationEngine {
  /**
   * Find contradictory memories using cached relationships - OPTIMIZED
   */
  findContradictoryMemoriesOptimized(
    memories: MemoryEntry[], 
    relationshipMap: Map<string, RelationshipDetectionResult>,
    getCacheKey: (memory1: MemoryEntry, memory2: MemoryEntry) => string
  ): MemoryEntry[][] {
    const contradictoryPairs: MemoryEntry[][] = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memory1 = memories[i];
        const memory2 = memories[j];
        const cacheKey = getCacheKey(memory1, memory2);
        
        const relationship = relationshipMap.get(cacheKey);
        if (relationship?.relationshipType === 'contradicts' && relationship.confidence > 0.8) {
          contradictoryPairs.push([memory1, memory2]);
        }
      }
    }

    return contradictoryPairs;
  }

  /**
   * Find mergeable memories using cached relationships - OPTIMIZED
   */
  findMergeableMemoriesOptimized(
    memories: MemoryEntry[],
    relationshipMap: Map<string, RelationshipDetectionResult>,
    getCacheKey: (memory1: MemoryEntry, memory2: MemoryEntry) => string
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
          
          const cacheKey = getCacheKey(memory, relatedMemory);
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
   * Resolve contradictory memories
   */
  async resolveContradiction(contradictoryMemories: MemoryEntry[]): Promise<ConsolidationResult | null> {
    if (contradictoryMemories.length !== 2) return null;

    const [memory1, memory2] = contradictoryMemories;
    const resolutionPrompt = MemoryPrompts.buildContradictionResolutionPrompt();

    try {
      const chatResponse = await aiService.getChatResponse(
        `Memory 1 (${memory1.createdAt}): ${memory1.content}\\n\\nMemory 2 (${memory2.createdAt}): ${memory2.content}`,
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
      console.error('[ConsolidationEngine] Error resolving contradiction:', error);
      return null;
    }
  }

  /**
   * Merge a cluster of related memories
   */
  async mergeMemoryCluster(cluster: MemoryEntry[]): Promise<ConsolidationResult | null> {
    if (cluster.length < 2) return null;

    const primaryMemory = cluster[0];
    const mergePrompt = MemoryPrompts.buildMergePrompt();
    const memoryContents = cluster.map((m, i) => `Memory ${i + 1}: ${m.content}`).join('\\n\\n');

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
      console.error('[ConsolidationEngine] Error merging memories:', error);
      return null;
    }
  }
}