/**
 * Message Processing Operations for Memory Service
 * 
 * Handles the processing of messages for memory extraction, including:
 * - Explicit memory trigger detection
 * - Background memory processing queue management
 * - Memory trigger storage and linking
 */

import { db } from "@shared/database/db";
import { 
  memoryTriggers, 
  type InsertMemoryTrigger,
  type MemoryEntry
} from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from "@shared/services/logger-service";
import { MemoryContentValidator } from './content-validation';
import { MemoryCacheManager } from './cache-management';
import { BackgroundProcessingManager } from './background-processing-manager';
import { MemoryDatabaseOperations } from './database-operations';

export class MemoryMessageProcessor {
  constructor(
    private contentValidator: MemoryContentValidator,
    private cacheManager: MemoryCacheManager,
    private backgroundProcessingManager: BackgroundProcessingManager,
    private databaseOps: MemoryDatabaseOperations
  ) {}

  // Process message for memory extraction with background processing
  async processMessageForMemory(
    userId: number, 
    message: string, 
    conversationId: string, 
    messageId: number,
    conversationHistory: any[] = []
  ): Promise<{
    explicitMemory?: MemoryEntry;
    autoDetectedMemory?: MemoryEntry;
    triggers: any[];
  }> {
    const results: {
      explicitMemory?: MemoryEntry;
      autoDetectedMemory?: MemoryEntry;
      triggers: any[];
    } = { triggers: [] };

    try {
      // Check for explicit triggers (immediate processing for user-requested saves)
      const explicitTrigger = this.contentValidator.detectExplicitMemoryTriggers(message);
      if (explicitTrigger) {
        // Save explicit memory trigger
        const triggerData: InsertMemoryTrigger = {
          messageId,
          triggerType: explicitTrigger.type,
          triggerPhrase: explicitTrigger.content,
          confidence: explicitTrigger.confidence,
        };

        const [trigger] = await db.insert(memoryTriggers).values(triggerData).returning();
        results.triggers.push(trigger);

        // Save the memory immediately for explicit requests
        const memory = await this.databaseOps.saveMemoryEntry(userId, explicitTrigger.content, {
          category: 'instructions',
          importance_score: 0.9,
          sourceConversationId: conversationId,
          sourceMessageId: messageId,
        });

        if (memory) {
          results.explicitMemory = memory;
          // Update trigger with memory ID
          await db
            .update(memoryTriggers)
            .set({ memoryEntryId: memory.id, processed: true })
            .where(eq(memoryTriggers.id, trigger.id));
          
          // Debounced cache invalidation for immediate updates
          this.cacheManager.invalidateUserMemoryCache(userId, 500); // Faster invalidation for explicit saves
        }
      }

      // Background processing for automatic memory detection
      // This prevents blocking the main response flow
      
      // Always queue background memory processing for user messages (messageId can be undefined during streaming)
      this.backgroundProcessingManager.addBackgroundTask('memory_processing', {
        userId,
        message,
        conversationId,
        messageId: messageId || null,
        conversationHistory
      }, 3); // Medium priority

      return results;
    } catch (error) {
      logger.error('Error processing message for memory', error as Error, { service: 'memory' });
      return { triggers: [] };
    }
  }
}