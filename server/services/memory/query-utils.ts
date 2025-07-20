/**
 * Query processing and content analysis utilities
 * Extracted from intelligent-memory-retrieval.ts for better modularity
 */

export interface QueryExpansion {
  originalQuery: string;
  expandedTerms: string[];
  synonyms: string[];
  relatedConcepts: string[];
  semanticClusters: string[];
}

export class QueryUtils {
  /**
   * Parse AI response for query expansion
   */
  static parseQueryExpansion(response: string, originalQuery: string): QueryExpansion {
    try {
      let content = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];
      
      const parsed = JSON.parse(content);
      return {
        originalQuery,
        expandedTerms: parsed.expandedTerms || [],
        synonyms: parsed.synonyms || [],
        relatedConcepts: parsed.relatedConcepts || [],
        semanticClusters: parsed.semanticClusters || []
      };
    } catch (error) {
      return {
        originalQuery,
        expandedTerms: [originalQuery],
        synonyms: [],
        relatedConcepts: [],
        semanticClusters: [originalQuery]
      };
    }
  }

  /**
   * Calculate query specificity score
   */
  static calculateQuerySpecificity(expandedQuery: QueryExpansion): number {
    const totalTerms = expandedQuery.expandedTerms.length + 
                      expandedQuery.synonyms.length + 
                      expandedQuery.relatedConcepts.length;
    
    // More specific queries have fewer expanded terms
    return Math.max(0, 1 - (totalTerms / 20));
  }

  /**
   * Find common words between two texts
   */
  static findCommonWords(text1: string, text2: string): string[] {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));
    
    return Array.from(words1).filter(word => words2.has(word));
  }

  /**
   * Generate content hash for diversity checking
   */
  static generateContentHash(content: string): string {
    return content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .sort()
      .slice(0, 5)
      .join('_');
  }

  /**
   * Build query expansion prompt for AI service
   */
  static buildQueryExpansionPrompt(query: string, context: { coachingMode: string; userIntent: string; recentTopics: string[] }): string {
    return `You are a semantic query expansion expert. Given a user query and context, expand it with related terms, synonyms, and concepts.

Query: "${query}"
Coaching Mode: ${context.coachingMode}
User Intent: ${context.userIntent}
Recent Topics: ${context.recentTopics.join(', ')}

Please provide a JSON response with:
{
  "expandedTerms": ["term1", "term2", ...],
  "synonyms": ["synonym1", "synonym2", ...],
  "relatedConcepts": ["concept1", "concept2", ...],
  "semanticClusters": ["cluster1", "cluster2", ...]
}

Focus on health, wellness, and fitness terminology relevant to the coaching context.`;
  }
}