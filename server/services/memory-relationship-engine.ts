import { db } from '../db';
import { memoryEntries, type MemoryEntry } from '../../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { memoryService } from './memory-service';
import crypto from 'crypto';

interface MemoryRelationship {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: 'supports' | 'contradicts' | 'builds_on' | 'related_to' | 'temporal_sequence';
  strength: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  context: string;
  createdAt: Date;
}

interface AtomicFact {
  id: string;
  memoryId: string;
  factType: 'preference' | 'goal' | 'constraint' | 'experience' | 'knowledge';
  content: string;
  confidence: number;
  extractedAt: Date;
}

interface SemanticCluster {
  id: string;
  centroidEmbedding: number[];
  memoryIds: string[];
  clusterType: string;
  coherenceScore: number;
  lastUpdated: Date;
}

/**
 * Phase 2: Advanced Memory Relationship Engine
 * Implements semantic memory graphs, atomic fact extraction, and relationship mapping
 */
export class MemoryRelationshipEngine {
  private relationshipCache = new Map<string, MemoryRelationship[]>();
  private atomicFactCache = new Map<string, AtomicFact[]>();
  private clusterCache = new Map<string, SemanticCluster>();
  
  // Performance optimization caches
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private cacheTimestamps = new Map<string, number>();

  /**
   * Analyze and extract atomic facts from memory content
   */
  async extractAtomicFacts(memoryId: string, content: string): Promise<AtomicFact[]> {
    const cacheKey = `facts_${memoryId}`;
    
    // Check cache first
    if (this.atomicFactCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.atomicFactCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    
    try {
      // Extract atomic facts using lightweight pattern matching
      const facts: AtomicFact[] = [];
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length === 0) continue;
        
        // Classify fact type based on content patterns
        const factType = this.classifyFactType(trimmed);
        
        const fact: AtomicFact = {
          id: crypto.randomUUID(),
          memoryId,
          factType,
          content: trimmed,
          confidence: this.calculateFactConfidence(trimmed),
          extractedAt: new Date()
        };
        
        facts.push(fact);
      }
      
      // Cache the results
      this.atomicFactCache.set(cacheKey, facts);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      const processingTime = Date.now() - startTime;
      console.log(`[MemoryRelationshipEngine] Extracted ${facts.length} atomic facts in ${processingTime}ms`);
      
      return facts;
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Atomic fact extraction failed:', error);
      return [];
    }
  }

  /**
   * Discover relationships between memories using semantic analysis
   */
  async discoverRelationships(sourceMemoryId: string, candidateMemories: MemoryEntry[]): Promise<MemoryRelationship[]> {
    const cacheKey = `relationships_${sourceMemoryId}`;
    
    if (this.relationshipCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.relationshipCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    
    try {
      // Get source memory
      const sourceMemory = await db
        .select()
        .from(memoryEntries)
        .where(eq(memoryEntries.id, sourceMemoryId))
        .limit(1);
      
      if (sourceMemory.length === 0) return [];
      
      const relationships: MemoryRelationship[] = [];
      const sourceFacts = await this.extractAtomicFacts(sourceMemoryId, sourceMemory[0].content);
      
      // Analyze relationships with candidate memories
      for (const candidate of candidateMemories.slice(0, 5)) { // Limit for performance
        if (candidate.id === sourceMemoryId) continue;
        
        const candidateFacts = await this.extractAtomicFacts(candidate.id, candidate.content);
        const relationship = await this.analyzeMemoryRelationship(
          sourceMemory[0], 
          candidate, 
          sourceFacts, 
          candidateFacts
        );
        
        if (relationship) {
          relationships.push(relationship);
        }
      }
      
      // Cache the results
      this.relationshipCache.set(cacheKey, relationships);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
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
      const categorizedMemories = this.groupMemoriesByCategory(memories);
      
      for (const [category, categoryMemories] of categorizedMemories.entries()) {
        if (categoryMemories.length < 2) continue; // Need at least 2 memories for a cluster
        
        const cluster: SemanticCluster = {
          id: crypto.randomUUID(),
          centroidEmbedding: await this.calculateCentroidEmbedding(categoryMemories),
          memoryIds: categoryMemories.map(m => m.id),
          clusterType: category,
          coherenceScore: this.calculateClusterCoherence(categoryMemories),
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
   * Enhanced memory retrieval using relationship context
   */
  async getRelatedMemories(
    queryMemoryId: string,
    maxDepth: number = 2,
    maxResults: number = 8
  ): Promise<{ memory: MemoryEntry; relationship: MemoryRelationship; depth: number }[]> {
    const startTime = Date.now();
    
    try {
      const relatedMemories: { memory: MemoryEntry; relationship: MemoryRelationship; depth: number }[] = [];
      const visited = new Set<string>([queryMemoryId]);
      const queue: { memoryId: string; depth: number }[] = [{ memoryId: queryMemoryId, depth: 0 }];
      
      while (queue.length > 0 && relatedMemories.length < maxResults) {
        const { memoryId, depth } = queue.shift()!;
        
        if (depth >= maxDepth) continue;
        
        // Get memories related to current memory
        const candidateMemories = await this.getCandidateMemories(memoryId);
        const relationships = await this.discoverRelationships(memoryId, candidateMemories);
        
        for (const relationship of relationships) {
          const targetId = relationship.targetMemoryId;
          
          if (visited.has(targetId) || relatedMemories.length >= maxResults) continue;
          
          // Get target memory details
          const targetMemory = await db
            .select()
            .from(memoryEntries)
            .where(eq(memoryEntries.id, targetId))
            .limit(1);
          
          if (targetMemory.length > 0) {
            relatedMemories.push({
              memory: targetMemory[0],
              relationship,
              depth: depth + 1
            });
            
            visited.add(targetId);
            
            // Add to queue for further exploration
            if (depth + 1 < maxDepth) {
              queue.push({ memoryId: targetId, depth: depth + 1 });
            }
          }
        }
      }
      
      // Sort by relationship strength and depth
      relatedMemories.sort((a, b) => {
        const strengthDiff = b.relationship.strength - a.relationship.strength;
        return strengthDiff !== 0 ? strengthDiff : a.depth - b.depth;
      });
      
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
  private classifyFactType(content: string): AtomicFact['factType'] {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('want') || lowerContent.includes('like') || lowerContent.includes('prefer')) {
      return 'preference';
    }
    if (lowerContent.includes('goal') || lowerContent.includes('target') || lowerContent.includes('aim')) {
      return 'goal';
    }
    if (lowerContent.includes('cannot') || lowerContent.includes('avoid') || lowerContent.includes('limit')) {
      return 'constraint';
    }
    if (lowerContent.includes('did') || lowerContent.includes('went') || lowerContent.includes('tried')) {
      return 'experience';
    }
    
    return 'knowledge';
  }

  private calculateFactConfidence(content: string): number {
    // Simple confidence scoring based on content characteristics
    let confidence = 0.5;
    
    // Increase confidence for specific statements
    if (content.includes('always') || content.includes('never')) confidence += 0.2;
    if (content.includes('specifically') || content.includes('exactly')) confidence += 0.15;
    if (content.length > 50) confidence += 0.1; // Longer statements tend to be more detailed
    
    // Decrease confidence for uncertain language
    if (content.includes('maybe') || content.includes('probably')) confidence -= 0.2;
    if (content.includes('think') || content.includes('believe')) confidence -= 0.1;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private async analyzeMemoryRelationship(
    source: MemoryEntry,
    target: MemoryEntry,
    sourceFacts: AtomicFact[],
    targetFacts: AtomicFact[]
  ): Promise<MemoryRelationship | null> {
    try {
      // Lightweight relationship analysis based on content similarity
      const sourceContent = source.content.toLowerCase();
      const targetContent = target.content.toLowerCase();
      
      // Check for contradictions
      const contradictoryPairs = [
        ['like', 'hate'], ['want', 'avoid'], ['can', 'cannot'], 
        ['love', 'dislike'], ['prefer', 'reject']
      ];
      
      for (const [positive, negative] of contradictoryPairs) {
        if ((sourceContent.includes(positive) && targetContent.includes(negative)) ||
            (sourceContent.includes(negative) && targetContent.includes(positive))) {
          return {
            id: crypto.randomUUID(),
            sourceMemoryId: source.id,
            targetMemoryId: target.id,
            relationshipType: 'contradicts',
            strength: 0.8,
            confidence: 0.9,
            context: `Contradictory statements detected: ${positive} vs ${negative}`,
            createdAt: new Date()
          };
        }
      }
      
      // Check for supporting relationships
      const commonWords = this.findCommonWords(sourceContent, targetContent);
      if (commonWords.length > 2) {
        return {
          id: crypto.randomUUID(),
          sourceMemoryId: source.id,
          targetMemoryId: target.id,
          relationshipType: 'supports',
          strength: Math.min(0.9, commonWords.length * 0.2),
          confidence: 0.7,
          context: `Common themes: ${commonWords.slice(0, 3).join(', ')}`,
          createdAt: new Date()
        };
      }
      
      // Check for temporal relationships
      const timeDiff = Math.abs(source.createdAt.getTime() - target.createdAt.getTime());
      if (timeDiff < 24 * 60 * 60 * 1000) { // Within 24 hours
        return {
          id: crypto.randomUUID(),
          sourceMemoryId: source.id,
          targetMemoryId: target.id,
          relationshipType: 'temporal_sequence',
          strength: 0.6,
          confidence: 0.8,
          context: 'Created within 24 hours of each other',
          createdAt: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Relationship analysis failed:', error);
      return null;
    }
  }

  private findCommonWords(text1: string, text2: string): string[] {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
    
    return Array.from(words1).filter(word => words2.has(word));
  }

  private groupMemoriesByCategory(memories: MemoryEntry[]): Map<string, MemoryEntry[]> {
    const groups = new Map<string, MemoryEntry[]>();
    
    for (const memory of memories) {
      const category = memory.category || 'general';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(memory);
    }
    
    return groups;
  }

  private async calculateCentroidEmbedding(memories: MemoryEntry[]): Promise<number[]> {
    // Simplified centroid calculation - in production, this would use actual embeddings
    const words = memories.flatMap(m => m.content.toLowerCase().split(/\s+/));
    const wordFreq = new Map<string, number>();
    
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
    
    // Create a simple frequency-based "embedding"
    const topWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return topWords.map(([_, freq]) => freq / words.length);
  }

  private calculateClusterCoherence(memories: MemoryEntry[]): number {
    if (memories.length < 2) return 0;
    
    // Simple coherence based on shared words
    const allWords = memories.map(m => new Set(m.content.toLowerCase().split(/\s+/)));
    let totalOverlap = 0;
    let comparisons = 0;
    
    for (let i = 0; i < allWords.length; i++) {
      for (let j = i + 1; j < allWords.length; j++) {
        const intersection = new Set([...allWords[i]].filter(x => allWords[j].has(x)));
        const union = new Set([...allWords[i], ...allWords[j]]);
        totalOverlap += intersection.size / union.size;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalOverlap / comparisons : 0;
  }

  private async getCandidateMemories(memoryId: string): Promise<MemoryEntry[]> {
    // Get recent memories from the same user
    const sourceMemory = await db
      .select()
      .from(memoryEntries)
      .where(eq(memoryEntries.id, memoryId))
      .limit(1);
    
    if (sourceMemory.length === 0) return [];
    
    return await db
      .select()
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, sourceMemory[0].userId),
        eq(memoryEntries.isActive, true)
      ))
      .orderBy(desc(memoryEntries.createdAt))
      .limit(20);
  }

  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }

  /**
   * Performance monitoring
   */
  getPerformanceMetrics(): any {
    return {
      relationshipCacheSize: this.relationshipCache.size,
      atomicFactCacheSize: this.atomicFactCache.size,
      clusterCacheSize: this.clusterCache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear caches (for testing and maintenance)
   */
  clearCaches(): void {
    this.relationshipCache.clear();
    this.atomicFactCache.clear();
    this.clusterCache.clear();
    this.cacheTimestamps.clear();
  }
}

// Export singleton instance
export const memoryRelationshipEngine = new MemoryRelationshipEngine();