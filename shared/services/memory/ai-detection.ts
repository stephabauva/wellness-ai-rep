/**
 * AI-powered memory detection system
 * @used-by memory/memory-service - AI memory detection capabilities
 */

import OpenAI from 'openai';
import { logger } from "@shared/services/logger-service";
import type { MemoryCategory } from '../../schema';

export interface MemoryDetectionResult {
  shouldRemember: boolean;
  category: MemoryCategory;
  importance: number;
  extractedInfo: string;
  labels: string[];
  keywords: string[];
  reasoning: string;
}

export class AIMemoryDetector {
  private openai: OpenAI;

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  /**
   * AI-powered detection of memory-worthy content
   */
  async detectMemoryWorthy(
    message: string, 
    conversationHistory: any[] = [],
    validateContentFn: (content: string, category: MemoryCategory) => boolean
  ): Promise<MemoryDetectionResult> {
    const prompt = `Analyze this wellness coaching conversation message and determine if it contains information worth remembering for future coaching sessions.

Look for:
1. Personal health preferences (workout types, dietary restrictions, preferred activities) - category: "preferences"
2. Important personal information (health conditions, goals, lifestyle) - category: "personal_context"
3. Significant health context that might be referenced later - category: "personal_context"
4. User instructions or coaching preferences - category: "instructions"
5. Food and diet information - category: "food_diet"
6. Goals and objectives - category: "goals"

Message: "${message}"

Previous context: ${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

IMPORTANT: Use these exact categories:
- "preferences" for likes, dislikes, workout preferences, general preferences
- "personal_context" for health conditions, allergies, medical information, lifestyle, background
- "instructions" for specific coaching instructions and rules
- "food_diet" for nutrition, food preferences, allergies, dietary restrictions
- "goals" for fitness goals, nutrition goals, targets

For labels, use semantic categorization:
- For food_diet: "allergy", "preference", "restriction", "dangerous", "mild", "meal-timing"
- For personal_context: "background", "health-history", "lifestyle", "medical", "physical-limitation"
- For goals: "weight-loss", "muscle-gain", "nutrition", "fitness", "target"
- For preferences: "general", "workout", "environment"
- For instructions: "behavior", "communication", "reminder"

Respond with JSON:
{
    "shouldRemember": boolean,
    "category": "preferences|personal_context|instructions|food_diet|goals",
    "importance": 0.0-1.0,
    "extractedInfo": "clean version of the information to remember",
    "labels": ["semantic-label1", "semantic-label2", ...],
    "keywords": ["keyword1", "keyword2", ...],
    "reasoning": "why this should/shouldn't be remembered"
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.warn('[MemoryService] Memory detection (detectMemoryWorthy) timed out after 45 seconds for message processing.');
        controller.abort();
    }, 45000); // 45 seconds

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);

      let content = response.choices[0].message.content || '{}';
      // Clean up markdown formatting if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Extract JSON from text if needed
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const result = JSON.parse(content);
      
      // Validate content quality before returning positive result
      const extractedInfo = result.extractedInfo || '';
      const category = result.category || 'personal_context';
      const shouldRemember = result.shouldRemember && extractedInfo && validateContentFn(extractedInfo, category as MemoryCategory);
      
      if (result.shouldRemember && !shouldRemember) {
        logger.info('Memory rejected due to quality validation', { service: 'memory' });
      }
      
      return {
        shouldRemember: shouldRemember,
        category: category,
        importance: result.importance || 0.5,
        extractedInfo: extractedInfo,
        labels: result.labels || [],
        keywords: result.keywords || [],
        reasoning: shouldRemember ? result.reasoning || '' : 'Content failed quality validation'
      };
    } catch (error) {
      console.error('Timeout or error in memory detection:', error);
      return {
        shouldRemember: false,
        category: 'personal_context',
        importance: 0.0,
        extractedInfo: '',
        labels: [],
        keywords: [],
        reasoning: 'Error in AI processing'
      };
    }
  }
}