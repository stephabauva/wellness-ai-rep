/**
 * @used-by shared/memory-service - Memory logging utilities
 * @service-type utility
 * @extracted-from memory-service.ts lines 316-347
 */
import { db } from "@shared/database/db";
import { 
  memoryEntries, 
  memoryAccessLog, 
  type InsertMemoryAccessLog
} from '../../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from "../logger-service";
import type { RelevantMemory } from './memory-types';

export class MemoryLoggingUtils {
  // Log memory usage for analytics
  async logMemoryUsage(
    memories: RelevantMemory[], 
    conversationId: string, 
    usedInResponse: boolean = true
  ): Promise<void> {
    try {
      const accessLogs: InsertMemoryAccessLog[] = memories.map(memory => ({
        memoryEntryId: memory.id,
        conversationId: conversationId || null,
        relevanceScore: memory.relevanceScore,
        usedInResponse,
      }));

      if (accessLogs.length > 0) {
        await db.insert(memoryAccessLog).values(accessLogs);

        // Update access count and last accessed timestamp
        for (const memory of memories) {
          await db
            .update(memoryEntries)
            .set({ 
              accessCount: sql`${memoryEntries.accessCount} + 1`,
              lastAccessed: new Date()
            })
            .where(eq(memoryEntries.id, memory.id));
        }
      }
    } catch (error) {
      logger.error('Error logging memory usage', error as Error, { service: 'memory' });
    }
  }
}