/**
 * Memory Prompt Utilities
 * Stub implementation to fix server startup - needs proper implementation later
 */

import type { RelevantMemory } from './memory-types';

/**
 * Builds a system prompt with relevant memories
 * @param memories - Array of relevant memories to include in prompt
 * @param basePersona - Optional base persona string
 * @returns Enhanced system prompt with memory context
 */
export function buildSystemPromptWithMemories(
  memories: RelevantMemory[], 
  basePersona?: string
): string {
  // Stub implementation - build basic prompt with memories
  let prompt = basePersona || "You are a helpful AI assistant.";
  
  if (memories && memories.length > 0) {
    prompt += "\n\nRelevant context from previous conversations:";
    
    memories.forEach((memory, index) => {
      prompt += `\n${index + 1}. ${memory.content || 'Memory content'}`;
    });
    
    prompt += "\n\nPlease use this context to provide more personalized and relevant responses.";
  }
  
  return prompt;
}