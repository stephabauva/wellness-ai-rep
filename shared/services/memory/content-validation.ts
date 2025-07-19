/**
 * Memory content validation and pattern detection service
 * @used-by memory/memory-service - Content validation and pattern-based detection
 */

import { logger } from "@shared/services/logger-service";
import type { MemoryCategory } from '../../schema';

export class MemoryContentValidator {

  /**
   * Fast pattern-based memory detection
   */
  detectMemoryWorthyFast(message: string): {
    shouldRemember: boolean;
    category: MemoryCategory;
    importance: number;
    extractedInfo: string;
    keywords: string[];
  } {
    const text = message.toLowerCase();
    
    const memoryPatterns = {
      goals: ['want to', 'goal is', 'trying to', 'hope to', 'plan to'],
      preferences: ['prefer', 'like', 'love', 'hate', 'dislike', 'enjoy'],
      constraints: ['cannot', 'can\'t', 'allergic', 'avoid', 'restrict'],
      health: ['weight', 'exercise', 'workout', 'diet', 'calories', 'steps']
    };

    let category: MemoryCategory = 'personal_context';
    let importance = 0.3;
    let shouldRemember = false;
    
    for (const [cat, patterns] of Object.entries(memoryPatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        shouldRemember = true;
        category = cat as MemoryCategory;
        importance = cat === 'goals' ? 0.9 : cat === 'constraints' ? 0.8 : 0.6;
        break;
      }
    }

    const words = message.split(/\s+/)
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase().replace(/[^\w]/g, ''));
    
    const keywords = [...new Set(words)].slice(0, 5);

    return {
      shouldRemember,
      category,
      importance,
      extractedInfo: message.trim(),
      keywords
    };
  }

  /**
   * Detect explicit memory triggers like "remember this" or "don't forget"
   */
  detectExplicitMemoryTriggers(message: string): { type: string; content: string; confidence: number } | null {
    const explicitTriggers = [
      /remember\s+(?:that\s+)?(.+)/i,
      /save\s+(?:this\s+)?(?:to\s+memory\s*:?\s*)?(.+)/i,
      /don't\s+forget\s+(?:that\s+)?(.+)/i,
      /keep\s+in\s+mind\s+(?:that\s+)?(.+)/i,
      /note\s+(?:that\s+)?(.+)/i,
      /make\s+sure\s+(?:you\s+)?remember\s+(.+)/i,
    ];

    for (const trigger of explicitTriggers) {
      const match = message.match(trigger);
      if (match) {
        return {
          type: 'explicit_save',
          content: match[1].trim(),
          confidence: 0.95
        };
      }
    }
    return null;
  }

  /**
   * Validate memory content quality to prevent nonsensical memories
   */
  validateMemoryContent(extractedInfo: string, category: MemoryCategory): boolean {
    // Check for minimum content length
    if (!extractedInfo || extractedInfo.trim().length < 5) {
      logger.debug('Memory content too short', { service: 'memory' });
      return false;
    }

    // Check for undefined or placeholder content
    if (extractedInfo.includes('undefined') || extractedInfo.includes('null') || extractedInfo.includes('N/A')) {
      logger.debug('Placeholder content detected', { service: 'memory' });
      return false;
    }

    // Define nonsensical patterns
    const nonsensicalPatterns = [
      /eating water/i,
      /drinking food/i,
      /sleeping exercise/i,
      /running sleep/i,
      /breathing exercise.*food/i,
      /workout.*water.*drink/i
    ];

    // Category-specific validation
    if (category === 'food_diet') {
      const foodLogicPatterns = [
        /enjoys eating (water|air|nothing)/i,
        /likes drinking (solid|food)/i,
        /allergic to (water|air|breathing)/i,
        /prefers eating (impossible|contradictory)/i
      ];
      
      if (foodLogicPatterns.some(pattern => pattern.test(extractedInfo))) {
        logger.warn('Nonsensical food/diet content detected', { service: 'memory' });
        return false;
      }
    }

    // General nonsensical content check
    if (nonsensicalPatterns.some(pattern => pattern.test(extractedInfo))) {
      logger.warn('Nonsensical content detected', { service: 'memory' });
      return false;
    }

    // Check for very repetitive content (likely processing error)
    const words = extractedInfo.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 3 && uniqueWords.size / words.length < 0.5) {
      logger.debug('Overly repetitive content detected', { service: 'memory' });
      return false;
    }

    return true;
  }
}