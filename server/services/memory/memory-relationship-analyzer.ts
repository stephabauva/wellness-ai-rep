/**
 * Relationship analysis logic for Memory Relationship Engine
 * @used-by server/services/memory-relationship-engine
 */

import { MemoryEntry } from '../../../shared/schema';
import { MemoryRelationship, AtomicFact } from './memory-relationship-types';
import { 
  calculateContradictionScore,
  calculateSupportScore,
  calculateTemporalScore,
  findCommonWords
} from './memory-relationship-utils';
import crypto from 'crypto';

/**
 * Advanced relationship analyzer for memory pairs
 */
export class MemoryRelationshipAnalyzer {
  /**
   * Lightweight relationship analysis for performance optimization
   */
  async analyzeLightweightRelationship(
    source: MemoryEntry,
    target: MemoryEntry,
    sourceFacts: AtomicFact[]
  ): Promise<MemoryRelationship | null> {
    try {
      // Fast text-based relationship detection
      const sourceContent = source.content.toLowerCase();
      const targetContent = target.content.toLowerCase();
      
      // Check for contradictions using keyword overlap
      const contradictionScore = calculateContradictionScore(sourceContent, targetContent);
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
      const supportScore = calculateSupportScore(sourceFacts, sourceContent, targetContent);
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
      const temporalScore = calculateTemporalScore(source, target);
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
      console.error('[MemoryRelationshipAnalyzer] Lightweight analysis failed:', error);
      return null;
    }
  }

  /**
   * Comprehensive memory relationship analysis
   */
  async analyzeMemoryRelationship(
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
      const commonWords = findCommonWords(sourceContent, targetContent);
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
      console.error('[MemoryRelationshipAnalyzer] Relationship analysis failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const memoryRelationshipAnalyzer = new MemoryRelationshipAnalyzer();