/**
 * @used-by shared/memory-service - Database operations utilities
 * @service-type utility
 * @extracted-from memory-service.ts lines 187-221, 583-607
 */
import { db } from "@shared/database/db";
import { 
  memoryEntries, 
  type InsertMemoryEntry,
  type MemoryEntry,
  type MemoryCategory
} from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from "../logger-service";
import { MemoryCacheManager } from './cache-management';

export class MemoryDatabaseOperations {
  constructor(
    private cacheManager: MemoryCacheManager,
    private generateEmbedding: (text: string) => Promise<number[]>
  ) {}

  // Save memory entry to database
  async saveMemoryEntry(
    userId: number, 
    content: string, 
    options: {
      category: MemoryCategory;
      labels?: string[];
      importance_score: number;
      sourceConversationId?: string;
      sourceMessageId?: number;
      keywords?: string[];
    }
  ): Promise<MemoryEntry | null> {
    try {
      const embedding = await this.generateEmbedding(content);
      
      const memoryData: InsertMemoryEntry = {
        userId,
        content,
        category: options.category,
        labels: options.labels || [],
        importanceScore: options.importance_score,
        keywords: options.keywords || [],
        embedding: JSON.stringify(embedding),
        sourceConversationId: options.sourceConversationId || null,
        sourceMessageId: options.sourceMessageId || null,
      };

      const [memory] = await db.insert(memoryEntries).values(memoryData).returning();
      return memory;
    } catch (error) {
      console.error('Error saving memory entry:', error);
      return null;
    }
  }

  // Tier 2 C: Delete memory with optimized cache invalidation
  async deleteMemory(memoryId: string, userId: number): Promise<boolean> {
    try {
      const [deleted] = await db
        .update(memoryEntries)
        .set({ isActive: false })
        .where(and(
          eq(memoryEntries.id, memoryId),
          eq(memoryEntries.userId, userId)
        ))
        .returning();

      if (deleted) {
        // Clear user cache
        this.cacheManager.clearUserCache(userId);
        
        logger.debug(`Memory ${memoryId} marked as inactive and cache cleared`, { service: 'memory' });
      }

      return !!deleted;
    } catch (error) {
      logger.error('Error deleting memory', error as Error, { service: 'memory' });
      return false;
    }
  }
}