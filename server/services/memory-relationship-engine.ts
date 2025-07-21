import { db } from "@shared/database/db";
import { memoryEntries, type MemoryEntry } from '../../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { memoryService } from '@shared/services/memory-service';
import crypto from 'crypto';
import { 
  MemoryRelationship, 
  AtomicFact, 
  SemanticCluster 
} from './memory/memory-relationship-types.js';
import { 
  calculateContradictionScore,
  calculateSupportScore,
  calculateTemporalScore,
  findCommonWords,
  groupMemoriesByCategory,
  classifyFactType,
  calculateFactConfidence,
  calculateClusterCoherence,
  calculateCentroidEmbedding
} from './memory/memory-relationship-utils.js';
import { MemoryRelationshipCache } from './memory/memory-relationship-cache.js';
import { memoryRelationshipAnalyzer } from './memory/memory-relationship-analyzer.js';
import { createMemoryRetrievalManager } from './memory/memory-retrieval-manager.js';

/**
 * Phase 2: Advanced Memory Relationship Engine
 * Implements semantic memory graphs, atomic fact extraction, and relationship mapping
 */
export class MemoryRelationshipEngine {
  private cache = new MemoryRelationshipCache();
  private retrievalManager = createMemoryRetrievalManager(this.cache);

  /**
   * Ultra-fast atomic facts extraction with pattern matching
   */
  async extractAtomicFacts(memoryId: string, content: string): Promise<AtomicFact[]> {
    const cacheKey = `facts_${memoryId}`;
    
    // Check cache first
    const cachedFacts = this.cache.getAtomicFacts(cacheKey);
    if (cachedFacts) {
      return cachedFacts;
    }

    const startTime = Date.now();
    
    try {
      // Super-fast pattern-based extraction
      const facts: AtomicFact[] = [];
      
      // Quick pattern matching for key fact types
      const patterns = {
        preference: /\b(prefer|like|love|enjoy|hate|dislike)\b/i,
        goal: /\b(want to|goal|target|aim|trying to)\b/i,
        constraint: /\b(cannot|can't|avoid|allergic|restrict)\b/i,
        experience: /\b(did|went|tried|completed)\b/i
      };
      
      // Single pass through content for all patterns
      for (const [factType, pattern] of Object.entries(patterns)) {
        if (pattern.test(content)) {
          facts.push({
            id: crypto.randomUUID(),
            memoryId,
            factType: factType as AtomicFact['factType'],
            content: content.slice(0, 100), // Truncate for performance
            confidence: 0.7,
            extractedAt: new Date()
          });
          break; // Only extract first match for speed
        }
      }
      
      // Cache the results aggressively
      this.cache.setAtomicFacts(cacheKey, facts);
      
      const processingTime = Date.now() - startTime;
      console.log(`[MemoryRelationshipEngine] Extracted ${facts.length} atomic facts in ${processingTime}ms`);
      
      return facts;
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Atomic fact extraction failed:', error);
      return [];
    }
  }

  /**
   * Discover relationships between memories using optimized semantic analysis
   */
  async discoverRelationships(sourceMemoryId: string, candidateMemories: MemoryEntry[]): Promise<MemoryRelationship[]> {
    const cacheKey = `relationships_${sourceMemoryId}`;
    
    const cachedRelationships = this.cache.getRelationships(cacheKey);
    if (cachedRelationships) {
      return cachedRelationships;
    }

    const startTime = Date.now();
    
    try {
      // Use candidate memories directly instead of additional DB query
      const sourceMemory = candidateMemories.find(m => m.id === sourceMemoryId);
      if (!sourceMemory) return [];
      
      const relationships: MemoryRelationship[] = [];
      
      // Pre-extract facts for source memory only once
      const sourceFacts = await this.extractAtomicFacts(sourceMemoryId, sourceMemory.content);
      
      // Limit candidates for performance and use lightweight analysis
      const limitedCandidates = candidateMemories.slice(0, 3).filter(c => c.id !== sourceMemoryId);
      
      for (const candidate of limitedCandidates) {
        // Use lightweight relationship analysis without expensive fact extraction
        const relationship = await memoryRelationshipAnalyzer.analyzeLightweightRelationship(
          sourceMemory, 
          candidate, 
          sourceFacts
        );
        
        if (relationship && relationship.strength > 0.3) { // Higher threshold for performance
          relationships.push(relationship);
        }
      }
      
      // Cache the results
      this.cache.setRelationships(cacheKey, relationships);
      
      const processingTime = Date.now() - startTime;
      console.log(`[MemoryRelationshipEngine] Discovered ${relationships.length} relationships in ${processingTime}ms`);
      
      return relationships;
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Relationship discovery failed:', error);
      return [];
    }
  }

  /**
   * Build semantic clusters from related memories
   */
  async buildSemanticClusters(memories: MemoryEntry[]): Promise<SemanticCluster[]> {
    const cacheKey = `clusters_${memories.length}_${Date.now()}`;
    const startTime = Date.now();
    
    try {
      const clusters: SemanticCluster[] = [];
      
      // Group memories by category first for performance
      const categorizedMemories = groupMemoriesByCategory(memories);
      
      for (const [category, categoryMemories] of categorizedMemories.entries()) {
        if (categoryMemories.length < 2) continue; // Need at least 2 memories for a cluster
        
        const cluster: SemanticCluster = {
          id: crypto.randomUUID(),
          centroidEmbedding: await calculateCentroidEmbedding(categoryMemories),
          memoryIds: categoryMemories.map(m => m.id),
          clusterType: category,
          coherenceScore: calculateClusterCoherence(categoryMemories),
          lastUpdated: new Date()
        };
        
        clusters.push(cluster);
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`[MemoryRelationshipEngine] Built ${clusters.length} semantic clusters in ${processingTime}ms`);
      
      return clusters;
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Cluster building failed:', error);
      return [];
    }
  }

  /**
   * Optimized memory retrieval using lightweight relationship context
   */
  async getRelatedMemories(
    queryMemoryId: string,
    maxDepth: number = 1, // Reduced depth for performance
    maxResults: number = 5 // Reduced results for performance
  ): Promise<{ memory: MemoryEntry; relationship: MemoryRelationship; depth: number }[]> {
    const startTime = Date.now();
    
    try {
      const relatedMemories: { memory: MemoryEntry; relationship: MemoryRelationship; depth: number }[] = [];
      const visited = new Set<string>([queryMemoryId]);
      
      // Get candidate memories once and reuse
      const candidateMemories = await this.retrievalManager.getCandidateMemories(queryMemoryId);
      const relationships = await this.discoverRelationships(queryMemoryId, candidateMemories);
      
      // Use retrieval manager for optimized memory retrieval
      const retrievedMemories = await this.retrievalManager.getRelatedMemories(
        queryMemoryId,
        candidateMemories,
        relationships,
        maxDepth,
        maxResults
      );
      
      relatedMemories.push(...retrievedMemories);
      
      const processingTime = Date.now() - startTime;
      console.log(`[MemoryRelationshipEngine] Found ${relatedMemories.length} related memories in ${processingTime}ms`);
      
      return relatedMemories.slice(0, maxResults);
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Related memory retrieval failed:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */





  /**
   * Fast candidate memory retrieval with caching (delegated to retrieval manager)
   */
  async getCandidateMemories(memoryId: string): Promise<MemoryEntry[]> {
    return this.retrievalManager.getCandidateMemories(memoryId);
  }



  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): any {
    return this.cache.getPerformanceMetrics();
  }

  /**
   * Clear caches (for testing and maintenance)
   */
  clearCaches(): void {
    this.cache.clearCaches();
  }
}

// Export singleton instance
export const memoryRelationshipEngine = new MemoryRelationshipEngine();