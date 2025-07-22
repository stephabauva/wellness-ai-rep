/**
 * Memory Operations Utilities
 * Database operations for creating, updating, and merging memory entries
 */

import { db } from "@shared/database/db";
import { memoryEntries, type MemoryEntry } from '../../schema';
import { eq, sql } from 'drizzle-orm';
import { memoryService } from '@shared/services/memory-service';
import crypto from 'crypto';

/**
 * Create new memory entry
 */
export async function createNewMemory(
  userId: number,
  detection: any,
  conversationId: string | null,
  semanticHash: string
): Promise<void> {
  const memoryOptions = {
    category: detection.category,
    labels: detection.labels || [],
    importance_score: detection.importance,
    sourceConversationId: conversationId || undefined,
    keywords: detection.keywords
  };

  await memoryService.saveMemoryEntry(userId, detection.extractedInfo, memoryOptions);
}

/**
 * Update existing memory entry
 */
export async function updateExistingMemory(
  memoryId: string,
  detection: any
): Promise<void> {
  try {
    await db
      .update(memoryEntries)
      .set({
        content: detection.extractedInfo,
        importanceScore: Math.max(detection.importance, 0.1), // Ensure minimum importance
        labels: detection.labels || [],
        keywords: detection.keywords,
        updateCount: sql`${memoryEntries.updateCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(memoryEntries.id, memoryId));

    console.log(`[ChatGPTMemoryEnhancement] Updated memory ${memoryId}`);
  } catch (error) {
    console.error('[ChatGPTMemoryEnhancement] Memory update failed:', error);
  }
}

/**
 * Merge with existing memory (placeholder for future enhancement)
 */
export async function mergeWithExistingMemory(
  memoryId: string,
  detection: any
): Promise<void> {
  // For Phase 1, treat merge as update
  await updateExistingMemory(memoryId, detection);
}