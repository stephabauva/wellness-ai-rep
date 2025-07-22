/**
 * @used-by shared/memory-service - Memory similarity calculation operations
 * @service-type utility
 * @extracted-from memory-service.ts lines 141-144, 221-230
 */
import { cosineSimilaritySync } from './memory-utils';
import { calculateCosineSimilarityWithFallback } from './similarity-utils';
import { getCachedSimilarityWithFallback } from './cache-utils';
import { MemoryCacheManager } from './cache-management';
import { BackgroundProcessingManager } from './background-processing-manager';

export class MemorySimilarityOperations {
  constructor(
    private cacheManager: MemoryCacheManager,
    private backgroundProcessingManager: BackgroundProcessingManager
  ) {}

  // Get cached vector similarity with background calculation
  getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    return getCachedSimilarityWithFallback(vectorA, vectorB, this.cacheManager, this.backgroundProcessingManager);
  }

  // Calculate cosine similarity between two vectors
  // Tier 3 A: Use Go service for performance-critical similarity calculations
  async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    return calculateCosineSimilarityWithFallback(a, b);
  }

  // Synchronous cosine similarity using imported utility
  cosineSimilaritySync(a: number[], b: number[]): number {
    return cosineSimilaritySync(a, b);
  }
}