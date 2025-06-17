import { type MemoryEntry } from '../../shared/schema';
import crypto from 'crypto';

interface FastAtomicFact {
  id: string;
  memoryId: string;
  factType: 'preference' | 'goal' | 'constraint' | 'experience' | 'knowledge';
  content: string;
  confidence: number;
  extractedAt: Date;
}

interface FastRelationship {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: 'supports' | 'contradicts' | 'builds_on' | 'related_to' | 'temporal_sequence';
  strength: number;
  confidence: number;
  context: string;
  createdAt: Date;
}

/**
 * Ultra-Fast Relationship Engine
 * Optimized for <100ms atomic facts and <300ms relationship analysis
 */
export class FastRelationshipEngine {
  // High-performance caches with minimal overhead
  private factCache = new Map<string, FastAtomicFact[]>();
  private relationshipCache = new Map<string, FastRelationship[]>();
  private cacheTimestamps = new Map<string, number>();
  
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_FACTS_PER_MEMORY = 3; // Limit for performance
  private readonly MAX_RELATIONSHIPS = 2; // Limit for performance

  /**
   * Lightning-fast atomic facts extraction using compiled patterns
   * Target: <50ms
   */
  async extractAtomicFacts(memoryId: string, content: string): Promise<FastAtomicFact[]> {
    const cacheKey = `facts_${memoryId}`;
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.factCache.get(cacheKey);
      if (cached) return cached;
    }

    const startTime = Date.now();
    
    try {
      const facts: FastAtomicFact[] = [];
      const text = content.toLowerCase();
      
      // Pre-compiled regex patterns for maximum speed
      const factPatterns = [
        {
          type: 'preference' as const,
          pattern: /\b(?:prefer|like|love|enjoy|hate|dislike|choose)\s+([^.!?]*)/i,
          confidence: 0.8
        },
        {
          type: 'goal' as const,
          pattern: /\b(?:want to|goal|target|aim|trying to|plan to)\s+([^.!?]*)/i,
          confidence: 0.9
        },
        {
          type: 'constraint' as const,
          pattern: /\b(?:cannot|can't|avoid|allergic|restrict|limit)\s+([^.!?]*)/i,
          confidence: 0.85
        }
      ];

      // Single pass through patterns for maximum efficiency
      for (const pattern of factPatterns) {
        const match = text.match(pattern.pattern);
        if (match && facts.length < this.MAX_FACTS_PER_MEMORY) {
          facts.push({
            id: crypto.randomUUID(),
            memoryId,
            factType: pattern.type,
            content: match[0].slice(0, 80), // Truncate for performance
            confidence: pattern.confidence,
            extractedAt: new Date()
          });
        }
      }

      // Cache aggressively
      this.factCache.set(cacheKey, facts);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      const elapsed = Date.now() - startTime;
      console.log(`[FastRelationshipEngine] Extracted ${facts.length} facts in ${elapsed}ms`);
      
      return facts;
    } catch (error) {
      console.error('[FastRelationshipEngine] Fact extraction failed:', error);
      return [];
    }
  }

  /**
   * Ultra-fast relationship discovery using heuristics
   * Target: <200ms
   */
  async discoverRelationships(sourceMemoryId: string, candidates: MemoryEntry[]): Promise<FastRelationship[]> {
    const cacheKey = `rel_${sourceMemoryId}`;
    
    if (this.isCacheValid(cacheKey)) {
      const cached = this.relationshipCache.get(cacheKey);
      if (cached) return cached;
    }

    const startTime = Date.now();
    
    try {
      const relationships: FastRelationship[] = [];
      const sourceMemory = candidates.find(m => m.id === sourceMemoryId);
      
      if (!sourceMemory) return [];

      // Limit candidates for performance
      const limitedCandidates = candidates.slice(0, 3).filter(c => c.id !== sourceMemoryId);
      
      for (const candidate of limitedCandidates) {
        const relationship = this.analyzeRelationshipFast(sourceMemory, candidate);
        if (relationship && relationships.length < this.MAX_RELATIONSHIPS) {
          relationships.push(relationship);
        }
      }

      // Cache results
      this.relationshipCache.set(cacheKey, relationships);
      this.cacheTimestamps.set(cacheKey, Date.now());
      
      const elapsed = Date.now() - startTime;
      console.log(`[FastRelationshipEngine] Discovered ${relationships.length} relationships in ${elapsed}ms`);
      
      return relationships;
    } catch (error) {
      console.error('[FastRelationshipEngine] Relationship discovery failed:', error);
      return [];
    }
  }

  /**
   * Fast relationship analysis using keyword overlap
   */
  private analyzeRelationshipFast(source: MemoryEntry, target: MemoryEntry): FastRelationship | null {
    const sourceText = source.content.toLowerCase();
    const targetText = target.content.toLowerCase();
    
    // Fast contradiction detection
    const contradictionPairs = [
      ['want', 'dont want'], ['like', 'hate'], ['increase', 'decrease']
    ];
    
    for (const [pos, neg] of contradictionPairs) {
      if ((sourceText.includes(pos) && targetText.includes(neg)) ||
          (sourceText.includes(neg) && targetText.includes(pos))) {
        return {
          id: crypto.randomUUID(),
          sourceMemoryId: source.id,
          targetMemoryId: target.id,
          relationshipType: 'contradicts',
          strength: 0.8,
          confidence: 0.85,
          context: `Contradiction detected: ${pos} vs ${neg}`,
          createdAt: new Date()
        };
      }
    }
    
    // Fast support detection via keyword overlap
    const sourceWords = new Set(sourceText.split(/\s+/).filter(w => w.length > 3));
    const targetWords = new Set(targetText.split(/\s+/).filter(w => w.length > 3));
    
    const overlap = [...sourceWords].filter(word => targetWords.has(word)).length;
    const maxWords = Math.max(sourceWords.size, targetWords.size);
    const overlapRatio = maxWords > 0 ? overlap / maxWords : 0;
    
    if (overlapRatio > 0.3) {
      return {
        id: crypto.randomUUID(),
        sourceMemoryId: source.id,
        targetMemoryId: target.id,
        relationshipType: 'supports',
        strength: Math.min(overlapRatio * 1.5, 1.0),
        confidence: 0.7,
        context: `${overlap} shared concepts`,
        createdAt: new Date()
      };
    }
    
    // Fast temporal relationship
    if (source.createdAt && target.createdAt) {
      const timeDiff = Math.abs(source.createdAt.getTime() - target.createdAt.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        return {
          id: crypto.randomUUID(),
          sourceMemoryId: source.id,
          targetMemoryId: target.id,
          relationshipType: 'temporal_sequence',
          strength: Math.max(0.3, 1 - (hoursDiff / 24)),
          confidence: 0.6,
          context: `Created ${Math.round(hoursDiff)}h apart`,
          createdAt: new Date()
        };
      }
    }
    
    return null;
  }

  /**
   * Fast related memories retrieval with minimal depth
   * Target: <150ms
   */
  async getRelatedMemories(
    queryMemoryId: string,
    candidates: MemoryEntry[],
    maxResults: number = 3
  ): Promise<{ memory: MemoryEntry; relationship: FastRelationship; depth: number }[]> {
    const startTime = Date.now();
    
    try {
      const relationships = await this.discoverRelationships(queryMemoryId, candidates);
      const relatedMemories = [];
      
      for (const relationship of relationships.slice(0, maxResults)) {
        const targetMemory = candidates.find(m => m.id === relationship.targetMemoryId);
        if (targetMemory) {
          relatedMemories.push({
            memory: targetMemory,
            relationship,
            depth: 1 // Fixed depth for performance
          });
        }
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`[FastRelationshipEngine] Found ${relatedMemories.length} related memories in ${elapsed}ms`);
      
      return relatedMemories;
    } catch (error) {
      console.error('[FastRelationshipEngine] Related memories failed:', error);
      return [];
    }
  }

  /**
   * Fast semantic clustering with minimal computation
   * Target: <100ms
   */
  async buildSemanticClusters(memories: MemoryEntry[]): Promise<{
    id: string;
    type: string;
    memoriesCount: number;
    coherenceScore: number;
    lastUpdated: Date;
  }[]> {
    const startTime = Date.now();
    
    try {
      const clusters = [];
      
      // Simple category-based clustering for speed
      const categoryGroups = new Map<string, MemoryEntry[]>();
      
      for (const memory of memories.slice(0, 10)) { // Limit for performance
        const category = memory.category || 'general';
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(memory);
      }
      
      // Create clusters from categories
      for (const [category, groupMemories] of categoryGroups) {
        if (groupMemories.length >= 2) {
          clusters.push({
            id: crypto.randomUUID(),
            type: category,
            memoriesCount: groupMemories.length,
            coherenceScore: this.calculateSimpleCoherence(groupMemories),
            lastUpdated: new Date()
          });
        }
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`[FastRelationshipEngine] Built ${clusters.length} clusters in ${elapsed}ms`);
      
      return clusters;
    } catch (error) {
      console.error('[FastRelationshipEngine] Clustering failed:', error);
      return [];
    }
  }

  /**
   * Simple coherence calculation for performance
   */
  private calculateSimpleCoherence(memories: MemoryEntry[]): number {
    if (memories.length < 2) return 0;
    
    // Count shared words across memories
    const allWords = memories.flatMap(m => 
      m.content.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    
    const wordCounts = new Map<string, number>();
    for (const word of allWords) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    const sharedWords = Array.from(wordCounts.values()).filter(count => count > 1).length;
    return Math.min(sharedWords / allWords.length, 1.0);
  }

  /**
   * Cache management utilities
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    return timestamp ? (Date.now() - timestamp) < this.CACHE_TTL : false;
  }

  /**
   * Performance monitoring
   */
  getPerformanceStats(): {
    factCacheSize: number;
    relationshipCacheSize: number;
    cacheHitRate: string;
    avgProcessingTime: string;
  } {
    return {
      factCacheSize: this.factCache.size,
      relationshipCacheSize: this.relationshipCache.size,
      cacheHitRate: 'N/A', // Would need hit/miss tracking
      avgProcessingTime: 'N/A' // Would need timing history
    };
  }

  /**
   * Clear caches for memory management
   */
  clearCaches(): void {
    this.factCache.clear();
    this.relationshipCache.clear();
    this.cacheTimestamps.clear();
  }
}

export const fastRelationshipEngine = new FastRelationshipEngine();