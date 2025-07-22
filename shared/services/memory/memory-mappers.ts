/**
 * Memory Mapping Utilities
 * Stub implementation to fix server startup - needs proper implementation later
 */

import type { RelevantMemory } from './memory-types';

/**
 * Maps and sorts memories based on relevance and recency
 * @param memories - Raw memory entries to map and sort
 * @returns Sorted array of mapped memories
 */
export function mapAndSortMemories(memories: any[]): RelevantMemory[] {
  // Stub implementation - basic mapping and sorting
  if (!memories || memories.length === 0) {
    return [];
  }
  
  return memories
    .map(memory => ({
      id: memory.id,
      content: memory.content || memory.text || '',
      relevanceScore: memory.relevanceScore || 0.5,
      timestamp: memory.timestamp || memory.createdAt || new Date(),
      ...memory
    }))
    .sort((a, b) => {
      // Sort by relevance score descending, then by timestamp descending
      if (a.relevanceScore !== b.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}

/**
 * Maps memory fields to standardized format
 * @param rawMemory - Raw memory object from database
 * @returns Mapped memory with standardized fields
 */
export function mapMemoryFields(rawMemory: any): RelevantMemory {
  // Stub implementation - basic field mapping
  return {
    id: rawMemory.id,
    content: rawMemory.content || rawMemory.text || '',
    relevanceScore: rawMemory.relevanceScore || 0.5,
    timestamp: rawMemory.timestamp || rawMemory.createdAt || new Date(),
    userId: rawMemory.userId,
    importance: rawMemory.importance || 0.5,
    ...rawMemory
  };
}

/**
 * Processes recent memories for overview display
 * @param memories - Array of recent memories
 * @param limit - Maximum number of memories to process
 * @returns Processed memories for overview
 */
export function processRecentMemoriesForOverview(memories: any[], limit: number = 10): any[] {
  // Stub implementation - basic processing
  if (!memories || memories.length === 0) {
    return [];
  }
  
  return memories
    .slice(0, limit)
    .map(memory => ({
      id: memory.id,
      content: memory.content || memory.text || '',
      timestamp: memory.timestamp || memory.createdAt || new Date(),
      importance: memory.importance || 0.5,
      category: memory.category || 'general'
    }));
}