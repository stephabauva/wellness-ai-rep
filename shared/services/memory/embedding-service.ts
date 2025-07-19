/**
 * Embedding generation service for semantic search
 * @used-by memory/memory-service - Embedding generation and caching
 */

import OpenAI from 'openai';
import { cacheService } from "@shared/services/cache-service";

export class EmbeddingService {
  private openai: OpenAI;

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  /**
   * Generate embeddings for semantic search with caching
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = await cacheService.getEmbedding(text);
    if (cached && cached.embedding.length > 0) {
      return cached.embedding;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('[MemoryService] Embedding generation (generateEmbedding) timed out after 45 seconds.');
        controller.abort();
    }, 45000); // 45 seconds

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);
      
      const embedding = response.data[0].embedding;
      
      // Cache the embedding for future use
      cacheService.setEmbedding(text, embedding, 'text-embedding-3-small');
      
      return embedding;
    } catch (error) {
      console.error('Timeout or error generating embedding:', error);
      return [];
    }
  }
}