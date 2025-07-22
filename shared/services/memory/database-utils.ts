/**
 * Memory Database Utilities
 * Database operations for memory service
 */

import { db } from "@shared/database/db";
import { memoryEntries } from '../../schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Check for semantic duplicate memories in database
 */
export async function checkSemanticDuplicate(userId: number, semanticHash: string): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: memoryEntries.id })
      .from(memoryEntries)
      .where(and(
        eq(memoryEntries.userId, userId),
        sql`${memoryEntries.content} ILIKE '%' || ${semanticHash.slice(0, 8)} || '%'`,
        eq(memoryEntries.isActive, true)
      ))
      .limit(1);

    return existing.length > 0;
  } catch (error) {
    console.error('[MemoryService] Duplicate check failed:', error);
    return false;
  }
}