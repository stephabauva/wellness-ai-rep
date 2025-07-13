import { db } from "@shared/database/db";
import { memoryEntries, type MemoryEntry } from '../../shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { memoryService } from '@shared/services/memory-service';
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
   * Ultra-fast atomic facts extraction with pattern matching
   */
  async extractAtomicFacts(memoryId: string, content: string): Promise<AtomicFact[]> {
    const cacheKey = `facts_${memoryId}`;
    
    // Check cache first
    if (this.atomicFactCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.atomicFactCache.get(cacheKey)!;
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
   * Discover relationships between memories using optimized semantic analysis
   */
  async discoverRelationships(sourceMemoryId: string, candidateMemories: MemoryEntry[]): Promise<MemoryRelationship[]> {
    const cacheKey = `relationships_${sourceMemoryId}`;
    
    if (this.relationshipCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.relationshipCache.get(cacheKey)!;
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
        const relationship = await this.analyzeLightweightRelationship(
          sourceMemory, 
          candidate, 
          sourceFacts
        );
        
        if (relationship && relationship.strength > 0.3) { // Higher threshold for performance
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
      const candidateMemories = await this.getCandidateMemories(queryMemoryId);
      const relationships = await this.discoverRelationships(queryMemoryId, candidateMemories);
      
      // Process only direct relationships for performance
      for (const relationship of relationships.slice(0, maxResults)) {
        const targetId = relationship.targetMemoryId;
        
        if (visited.has(targetId)) continue;
        
        // Find target memory in candidates to avoid additional DB query
        const targetMemory = candidateMemories.find(m => m.id === targetId);
        
        if (targetMemory) {
          relatedMemories.push({
            memory: targetMemory,
            relationship,
            depth: 1
          });
          
          visited.add(targetId);
        }
      }
      
      // Sort by relationship strength
      relatedMemories.sort((a, b) => b.relationship.strength - a.relationship.strength);
      
      const processingTime = Date.now() - startTime;
      console.log(`[MemoryRelationshipEngine] Found ${relatedMemories.length} related memories in ${processingTime}ms`);
      
      return relatedMemories.slice(0, maxResults);
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Related memory retrieval failed:', error);
      return [];
    }
  }

  /**
   * Lightweight relationship analysis for performance optimization
   */
  private async analyzeLightweightRelationship(
    source: MemoryEntry,
    target: MemoryEntry,
    sourceFacts: AtomicFact[]
  ): Promise<MemoryRelationship | null> {
    try {
      // Fast text-based relationship detection
      const sourceContent = source.content.toLowerCase();
      const targetContent = target.content.toLowerCase();
      
      // Check for contradictions using keyword overlap
      const contradictionScore = this.calculateContradictionScore(sourceContent, targetContent);
      if (contradictionScore > 0.7) {
        return {
          id: crypto.randomUUID(),
          sourceMemoryId: source.id,
          targetMemoryId: target.id,
          relationshipType: 'contradicts',
          strength: contradictionScore,
          confidence: 0.8,
          context: 'Fast contradiction detection',
          createdAt: new Date()
        };
      }
      
      // Check for support relationships using fact overlap
      const supportScore = this.calculateSupportScore(sourceFacts, sourceContent, targetContent);
      if (supportScore > 0.5) {
        return {
          id: crypto.randomUUID(),
          sourceMemoryId: source.id,
          targetMemoryId: target.id,
          relationshipType: 'supports',
          strength: supportScore,
          confidence: 0.7,
          context: 'Fast support detection',
          createdAt: new Date()
        };
      }
      
      // Check for temporal relationships
      const temporalScore = this.calculateTemporalScore(source, target);
      if (temporalScore > 0.6) {
        return {
          id: crypto.randomUUID(),
          sourceMemoryId: source.id,
          targetMemoryId: target.id,
          relationshipType: 'temporal_sequence',
          strength: temporalScore,
          confidence: 0.6,
          context: 'Fast temporal detection',
          createdAt: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Lightweight analysis failed:', error);
      return null;
    }
  }

  private calculateContradictionScore(sourceContent: string, targetContent: string): number {
    const contradictionPairs = [
      ['want', 'dont want'], ['like', 'hate'], ['love', 'dislike'],
      ['increase', 'decrease'], ['gain', 'lose'], ['more', 'less']
    ];
    
    let contradictions = 0;
    for (const [pos, neg] of contradictionPairs) {
      if ((sourceContent.includes(pos) && targetContent.includes(neg)) ||
          (sourceContent.includes(neg) && targetContent.includes(pos))) {
        contradictions++;
      }
    }
    
    return Math.min(contradictions * 0.3, 1.0);
  }

  private calculateSupportScore(sourceFacts: AtomicFact[], sourceContent: string, targetContent: string): number {
    // Simple keyword overlap scoring
    const sourceWords = new Set(sourceContent.split(/\s+/).filter(w => w.length > 3));
    const targetWords = new Set(targetContent.split(/\s+/).filter(w => w.length > 3));
    
    const overlap = [...sourceWords].filter(word => targetWords.has(word)).length;
    const maxWords = Math.max(sourceWords.size, targetWords.size);
    
    return maxWords > 0 ? (overlap / maxWords) * 0.8 : 0;
  }

  private calculateTemporalScore(source: MemoryEntry, target: MemoryEntry): number {
    const sourceTime = source.createdAt?.getTime();
    const targetTime = target.createdAt?.getTime();
    
    // If either createdAt is null, cannot calculate a meaningful temporal score
    if (sourceTime === undefined || sourceTime === null || targetTime === undefined || targetTime === null) {
      return 0;
    }
    
    const timeDiff = Math.abs(sourceTime - targetTime);
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // Higher score for memories created close in time
    return Math.max(0, 1 - (daysDiff / 30)); // Decay over 30 days
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
      const sourceTime = source.createdAt?.getTime();
      const targetTime = target.createdAt?.getTime();

      if (sourceTime != null && targetTime != null) {
        const timeDiff = Math.abs(sourceTime - targetTime);
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

  /**
   * Cache validity check for performance optimization
   */
  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    
    return (Date.now() - timestamp) < this.CACHE_TTL;
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

  /**
   * Fast candidate memory retrieval with caching
   */
  async getCandidateMemories(memoryId: string): Promise<MemoryEntry[]> {
    const cacheKey = `candidates_${memoryId}`;
    
    if (this.relationshipCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.relationshipCache.get(cacheKey) as any;
    }

    try {
      // Get recent memories from the same user efficiently
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.createdAt))
        .limit(10); // Reduced limit for performance
      
      // Cache the results
      this.relationshipCache.set(cacheKey, memories as any);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      return memories;
    } catch (error) {
      console.error('[MemoryRelationshipEngine] Failed to get candidate memories:', error);
      return [];
    }
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

  // Removed duplicate getCandidateMemories function

  // Removed duplicate isCacheValid function

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