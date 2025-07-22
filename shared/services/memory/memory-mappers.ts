/**
 * Memory Data Mapping Utilities
 * Database to frontend field mapping and sorting utilities
 */

import type { MemoryEntry } from '../../schema';

/**
 * Map database memory fields to frontend expected format
 */
export function mapMemoryFields(memory: any): MemoryEntry {
  return {
    ...memory,
    importanceScore: memory.importanceScore,
    accessCount: memory.accessCount || 0,
    lastAccessed: memory.lastAccessed || memory.createdAt,
    createdAt: memory.createdAt,
    keywords: memory.keywords || []
  };
}

/**
 * Map and sort memories by importance and creation date
 */
export function mapAndSortMemories(memories: any[]): MemoryEntry[] {
  const mappedMemories = memories.map(mapMemoryFields);

  return mappedMemories.sort((a: any, b: any) => {
    if (a.importanceScore !== b.importanceScore) {
      return b.importanceScore - a.importanceScore;
    }
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Process recent memories for overview with content truncation
 */
export function processRecentMemoriesForOverview(memories: any[]): Array<{
  id: string;
  content: string;
  category: string;
  createdAt: string;
}> {
  return memories.map((memory: any) => ({
    id: memory.id,
    content: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
    category: memory.category,
    createdAt: memory.createdAt.toISOString()
  }));
}