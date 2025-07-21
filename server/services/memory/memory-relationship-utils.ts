/**
 * Utility functions for Memory Relationship Engine
 * @used-by server/services/memory-relationship-engine
 */

import { MemoryEntry } from '../../../shared/schema';
import { AtomicFact } from './memory-relationship-types';

/**
 * Calculate contradiction score between two memory contents
 */
export function calculateContradictionScore(sourceContent: string, targetContent: string): number {
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

/**
 * Calculate support score based on fact overlap and keyword similarity
 */
export function calculateSupportScore(sourceFacts: AtomicFact[], sourceContent: string, targetContent: string): number {
  // Simple keyword overlap scoring
  const sourceWords = new Set(sourceContent.split(/\s+/).filter(w => w.length > 3));
  const targetWords = new Set(targetContent.split(/\s+/).filter(w => w.length > 3));
  
  const overlap = [...sourceWords].filter(word => targetWords.has(word)).length;
  const maxWords = Math.max(sourceWords.size, targetWords.size);
  
  return maxWords > 0 ? (overlap / maxWords) * 0.8 : 0;
}

/**
 * Calculate temporal score based on creation time proximity
 */
export function calculateTemporalScore(source: MemoryEntry, target: MemoryEntry): number {
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
 * Find common words between two texts
 */
export function findCommonWords(text1: string, text2: string): string[] {
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
  
  return Array.from(words1).filter(word => words2.has(word));
}

/**
 * Group memories by category for clustering
 */
export function groupMemoriesByCategory(memories: MemoryEntry[]): Map<string, MemoryEntry[]> {
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
 * Classify fact type based on content patterns
 */
export function classifyFactType(content: string): AtomicFact['factType'] {
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

/**
 * Calculate confidence score for extracted facts
 */
export function calculateFactConfidence(content: string): number {
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

/**
 * Calculate cluster coherence score
 */
export function calculateClusterCoherence(memories: MemoryEntry[]): number {
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

/**
 * Calculate centroid embedding for clustering
 */
export async function calculateCentroidEmbedding(memories: MemoryEntry[]): Promise<number[]> {
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