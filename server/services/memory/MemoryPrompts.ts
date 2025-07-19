/**
 * Memory Graph Prompts - Extracted from MemoryGraphService
 * 
 * Contains all AI prompt builders for memory graph operations including
 * fact extraction, relationship analysis, contradiction resolution, and merging.
 */

import type { MemoryEntry } from '@shared/schema';

export class MemoryPrompts {
  /**
   * Build fact extraction prompt
   */
  static buildFactExtractionPrompt(memory: MemoryEntry, sourceContext?: string): string {
    return `You are an expert at extracting atomic facts from memory content. 

Given a memory entry, extract individual atomic facts that can be independently verified.
Each fact should be:
1. Atomic (single piece of information)
2. Specific and verifiable
3. Categorized by type (preference, attribute, relationship, behavior, goal)

Memory Category: ${memory.category}
Source Context: ${sourceContext || 'Not provided'}

Return a JSON array of facts with this structure:
[
  {
    "content": "User prefers morning workouts",
    "type": "preference",
    "confidence": 0.9
  }
]

Focus on extracting 1-5 key facts. Be precise and avoid redundancy.`;
  }

  /**
   * Build relationship analysis prompt
   */
  static buildRelationshipAnalysisPrompt(): string {
    return `You are an expert at analyzing relationships between memory entries.

Given two memories, determine their relationship type:
- contradicts: Information directly conflicts
- supports: Information reinforces or confirms
- elaborates: One memory provides additional detail to the other
- supersedes: Newer information replaces older information
- related: Memories are connected but don't fit other categories

Return JSON with this structure:
{
  "relationshipType": "contradicts|supports|elaborates|supersedes|related",
  "confidence": 0.0-1.0,
  "strength": 0.0-1.0,
  "metadata": { "explanation": "Brief reason for the relationship" }
}

Only respond if confidence > 0.6, otherwise return null.`;
  }

  /**
   * Build contradiction resolution prompt
   */
  static buildContradictionResolutionPrompt(): string {
    return `You are an expert at resolving contradictory information in memory systems.

Given two contradictory memories with timestamps, determine the best resolution:
- supersede: Newer information should replace older (most common)
- merge: Both contain valid but different aspects
- flag: Need human review

Return JSON with this structure:
{
  "action": "supersede|merge|flag",
  "confidence": 0.0-1.0,
  "reason": "Explanation of why this resolution is appropriate"
}`;
  }

  /**
   * Build memory merge prompt
   */
  static buildMergePrompt(): string {
    return `You are an expert at consolidating related memory entries.

Given multiple related memories, create a single consolidated memory that:
1. Preserves all important information
2. Eliminates redundancy
3. Maintains clarity and specificity
4. Uses the same tone and style

Return only the consolidated memory content as a single paragraph.`;
  }
}