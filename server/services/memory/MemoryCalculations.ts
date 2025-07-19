/**
 * Memory Graph Calculations - Extracted from MemoryGraphService
 * 
 * Contains utility calculation functions for memory graph operations including
 * temporal weight calculation and confidence score calculation.
 */

import type { AtomicFact, MemoryRelationship } from '@shared/schema';

export class MemoryCalculations {
  /**
   * Calculate temporal weight for a memory
   */
  static calculateTemporalWeight(createdAt: Date | null): number {
    if (!createdAt) return 0.5;
    
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: newer memories have higher weight
    return Math.exp(-daysSinceCreation / 30); // 30-day half-life
  }

  /**
   * Calculate confidence score based on facts and relationships
   */
  static calculateConfidenceScore(facts: AtomicFact[], relationships: MemoryRelationship[]): number {
    const factConfidence = facts.length > 0 
      ? facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length 
      : 0.5;
    
    const relConfidence = relationships.length > 0
      ? relationships.reduce((sum, rel) => sum + rel.confidence, 0) / relationships.length
      : 0.5;
    
    return (factConfidence + relConfidence) / 2;
  }
}