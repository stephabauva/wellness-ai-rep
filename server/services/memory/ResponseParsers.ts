/**
 * Memory Graph Response Parsers - Extracted from MemoryGraphService
 * 
 * Contains all AI response parsing utilities for memory graph operations including
 * fact extraction, relationship analysis, and contradiction resolution parsing.
 */

export interface RelationshipDetectionResult {
  relationshipType: 'contradicts' | 'supports' | 'elaborates' | 'supersedes' | 'related';
  confidence: number;
  strength: number;
  metadata?: any;
}

export class ResponseParsers {
  /**
   * Parse facts response from AI
   */
  static parseFactsResponse(response: string): Array<{content: string, type: string, confidence: number}> {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[ResponseParsers] Error parsing facts response:', error);
      return [];
    }
  }

  /**
   * Parse relationship response from AI
   */
  static parseRelationshipResponse(response: string): RelationshipDetectionResult | null {
    try {
      const parsed = JSON.parse(response);
      if (parsed && parsed.confidence > 0.6) {
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('[ResponseParsers] Error parsing relationship response:', error);
      return null;
    }
  }

  /**
   * Parse resolution response from AI
   */
  static parseResolutionResponse(response: string): {action: string, confidence: number, reason: string} {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('[ResponseParsers] Error parsing resolution response:', error);
      return { action: 'flag', confidence: 0.5, reason: 'Error parsing resolution' };
    }
  }
}