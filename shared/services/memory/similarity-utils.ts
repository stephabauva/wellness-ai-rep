/**
 * Similarity Calculation Utilities
 * Pure mathematical functions for memory content similarity analysis
 */

import { cosineSimilaritySync } from './memory-utils';
import { goMemoryService } from '../../../server/services/go-memory-service';

/**
 * Calculate Jaccard similarity (intersection over union)
 */
export function calculateJaccardSimilarity(words1: string[], words2: string[]): number {
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(w => set2.has(w)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Calculate word overlap similarity
 */
export function calculateOverlapSimilarity(words1: string[], words2: string[]): number {
  const intersection = words1.filter(w => words2.includes(w));
  return intersection.length / Math.max(words1.length, words2.length);
}

/**
 * Calculate Levenshtein distance-based similarity
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength > 0 ? 1 - (distance / maxLength) : 0;
}

/**
 * Calculate N-gram similarity for better fuzzy matching
 */
export function calculateNgramSimilarity(words1: string[], words2: string[]): number {
  const n = 2; // Use bigrams
  const ngrams1 = generateNgrams(words1, n);
  const ngrams2 = generateNgrams(words2, n);
  
  if (ngrams1.length === 0 || ngrams2.length === 0) return 0;
  
  const intersection = ngrams1.filter(ngram => ngrams2.includes(ngram));
  return intersection.length / Math.max(ngrams1.length, ngrams2.length);
}

/**
 * Generate N-grams from word array
 */
export function generateNgrams(words: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  // Initialize first row and column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate cosine similarity with Go service fallback for performance
 */
export async function calculateCosineSimilarityWithFallback(
  a: number[], 
  b: number[]
): Promise<number> {
  // Try Go service first for better performance
  if (goMemoryService.isAvailable() && a.length > 100) {
    try {
      return await goMemoryService.calculateCosineSimilarity(a, b);
    } catch (error) {
      console.warn('[MemoryService] Go service fallback to TypeScript implementation:', error);
    }
  }
  
  // Fallback to TypeScript implementation
  return cosineSimilaritySync(a, b);
}