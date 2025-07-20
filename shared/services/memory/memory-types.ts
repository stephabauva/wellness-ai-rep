/**
 * Memory Enhancement Types
 * Type definitions for memory deduplication and enhancement
 */

import type { MemoryEntry } from '../../schema';

export interface RelevantMemory extends MemoryEntry {
  relevanceScore: number;
  retrievalReason: string;
}

export interface DeduplicationResult {
  action: 'skip' | 'merge' | 'update' | 'create';
  existingMemoryId?: string;
  confidence: number;
  reasoning: string;
}