/**
 * Memory Similarity Operations
 * Stub implementation to fix server startup - needs proper implementation later
 */

import type { RelevantMemory } from './memory-types';

/**
 * Utility class for memory similarity operations
 */
export class MemorySimilarityOperations {
  constructor(
    embeddingService?: any,
    cache?: any
  ) {
    // Stub constructor
  }

  /**
   * Calculates similarity between two memories
   * @param memory1 - First memory
   * @param memory2 - Second memory
   * @returns Similarity score between 0-1
   */
  calculateMemorySimilarity(memory1: RelevantMemory, memory2: RelevantMemory): number {
    if (!memory1 || !memory2) return 0;
    if (memory1.id === memory2.id) return 1;

    // Stub implementation - basic text similarity
    return this.calculateTextSimilarity(memory1.content, memory2.content);
  }

  /**
   * Finds similar memories to a given memory
   * @param targetMemory - Memory to find similarities for
   * @param candidateMemories - Array of memories to compare against
   * @param threshold - Minimum similarity threshold
   * @returns Array of similar memories with scores
   */
  findSimilarMemories(
    targetMemory: RelevantMemory, 
    candidateMemories: RelevantMemory[], 
    threshold: number = 0.7
  ): Array<RelevantMemory & { similarityScore: number }> {
    if (!candidateMemories || candidateMemories.length === 0) {
      return [];
    }

    return candidateMemories
      .filter(memory => memory.id !== targetMemory.id)
      .map(memory => ({
        ...memory,
        similarityScore: this.calculateMemorySimilarity(targetMemory, memory)
      }))
      .filter(memory => memory.similarityScore >= threshold)
      .sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Groups memories by similarity clusters
   * @param memories - Array of memories to cluster
   * @param threshold - Similarity threshold for clustering
   * @returns Array of memory clusters
   */
  clusterMemoriesBySimilarity(
    memories: RelevantMemory[], 
    threshold: number = 0.8
  ): RelevantMemory[][] {
    if (!memories || memories.length === 0) {
      return [];
    }

    const clusters: RelevantMemory[][] = [];
    const processed = new Set<string>();

    for (const memory of memories) {
      if (processed.has(memory.id)) continue;

      const cluster = [memory];
      processed.add(memory.id);

      // Find similar memories for this cluster
      for (const candidate of memories) {
        if (processed.has(candidate.id)) continue;

        const similarity = this.calculateMemorySimilarity(memory, candidate);
        if (similarity >= threshold) {
          cluster.push(candidate);
          processed.add(candidate.id);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Calculates basic text similarity using simple string comparison
   * @param text1 - First text string
   * @param text2 - Second text string
   * @returns Similarity score between 0-1
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;

    // Convert to lowercase and split into words
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    // Calculate Jaccard similarity (intersection over union)
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Gets cached similarity between two vectors (stub implementation)
   * @param vectorA - First vector
   * @param vectorB - Second vector
   * @returns Cached similarity score or null if not cached
   */
  getCachedSimilarity(vectorA: number[], vectorB: number[]): number | null {
    // Stub implementation - no caching for now
    return null;
  }

  /**
   * Calculates cosine similarity between two vectors (async version)
   * @param a - First vector
   * @param b - Second vector
   * @returns Promise with cosine similarity score
   */
  async cosineSimilarity(a: number[], b: number[]): Promise<number> {
    // Stub implementation - delegate to sync version
    return this.cosineSimilaritySync(a, b);
  }

  /**
   * Calculates cosine similarity between two vectors (sync version)
   * @param a - First vector
   * @param b - Second vector
   * @returns Cosine similarity score
   */
  cosineSimilaritySync(a: number[], b: number[]): number {
    if (!a || !b) return 0;
    if (a.length !== b.length) return 0;

    // Basic cosine similarity calculation
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      norm1 += a[i] * a[i];
      norm2 += b[i] * b[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Calculates cosine similarity between memory embeddings (stub implementation)
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns Cosine similarity score
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    return this.cosineSimilaritySync(embedding1, embedding2);
  }
}