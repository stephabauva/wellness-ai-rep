/**
 * Memory Prompt Utilities
 * Utilities for building AI prompts with memory context
 */

import type { RelevantMemory } from './memory-types';

/**
 * Build system prompt with relevant memories
 */
export function buildSystemPromptWithMemories(
  memories: RelevantMemory[], 
  basePersona?: string
): string {
  const persona = basePersona || "You are a helpful AI wellness coach. Provide personalized advice based on the conversation.";
  
  if (memories.length === 0) {
    return persona;
  }

  const memoryContext = memories.map(memory => 
    `- ${memory.content} (${memory.category}, importance: ${memory.importanceScore})`
  ).join('\n');

  return `${persona}

REMEMBERED INFORMATION ABOUT THIS USER:
${memoryContext}

Use this remembered information to personalize your responses naturally. Don't explicitly mention that you're using stored information unless directly relevant to the conversation.`;
}