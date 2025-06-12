import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
import { 
  memoryEntries, 
  memoryTriggers, 
  memoryAccessLog, 
  conversations,
  conversationMessages,
  type InsertMemoryEntry,
  type MemoryEntry,
  type MemoryCategory
} from '../../shared/schema';
import { eq, desc, and, sql, gt } from 'drizzle-orm';
import { cacheService } from './cache-service';

// Phase 1: Enhanced Memory Detection Interfaces
interface ConversationState {
  currentTurn: number;
  recentTopics: string[];
  userIntent: string;
  emotionalContext: string;
  coachingMode: string;
  previousMemories: MemoryEntry[];
}

interface EnhancedMemoryDetection {
  shouldRemember: boolean;
  category: MemoryCategory;
  importance: number;
  extractedInfo: string;
  keywords: string[];
  reasoning: string;
  conversationalContext: string;
  userIntent: string;
  temporalRelevance: number;
  confidenceLevel: number;
  relationshipMapping: string[];
  contradictionCheck: boolean;
  atomicFacts: string[];
}

interface UserProfile {
  primaryGoal: string;
  coachStyle: string;
  focusAreas: string[];
  preferredLanguage: string;
  currentCoachingMode: string;
}

interface MemoryRelationship {
  type: 'contradicts' | 'supports' | 'elaborates' | 'supersedes';
  targetMemoryId: string;
  strength: number;
  createdAt: Date;
}

interface DynamicSimilarityThreshold {
  querySpecificity: number;
  contextRelevance: number;
  temporalWeight: number;
  baseThreshold: number;
  adjustedThreshold: number;
}

class EnhancedMemoryService {
  private openai: OpenAI;
  private google: GoogleGenerativeAI;
  
  // Phase 1: Context-aware detection cache
  private contextCache: Map<string, ConversationState> = new Map();
  
  // Phase 1: Dynamic threshold cache
  private thresholdCache: Map<string, DynamicSimilarityThreshold> = new Map();
  
  // Phase 1: Contradiction detection cache
  private contradictionCache: Map<string, boolean> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.google = new GoogleGenerativeAI(
      process.env.GOOGLE_API_KEY || ''
    );
  }

  // Phase 1: Enhanced Context-Aware Memory Detection
  async detectMemoryWorthy(
    message: string, 
    conversationHistory: any[] = [],
    userProfile: UserProfile,
    conversationId?: string
  ): Promise<EnhancedMemoryDetection> {
    
    // Build conversation state
    const conversationState = await this.buildConversationState(
      message, 
      conversationHistory, 
      userProfile, 
      conversationId
    );

    // Generate dynamic, context-aware prompt
    const contextualPrompt = this.generateContextualPrompt(
      message,
      conversationState,
      userProfile
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('[EnhancedMemoryService] Enhanced memory detection timed out after 45 seconds.');
      controller.abort();
    }, 45000);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: contextualPrompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }, { signal: controller.signal });
      
      clearTimeout(timeoutId);

      let content = response.choices[0].message.content || '{}';
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const result = JSON.parse(content);
      
      // Phase 1: Enhanced result processing with atomic facts
      const enhancedResult: EnhancedMemoryDetection = {
        shouldRemember: result.shouldRemember || false,
        category: result.category || 'context',
        importance: result.importance || 0.5,
        extractedInfo: result.extractedInfo || '',
        keywords: result.keywords || [],
        reasoning: result.reasoning || '',
        conversationalContext: conversationState.userIntent,
        userIntent: conversationState.userIntent,
        temporalRelevance: this.calculateTemporalRelevance(message, conversationHistory),
        confidenceLevel: result.confidenceLevel || 0.5,
        relationshipMapping: result.relationshipMapping || [],
        contradictionCheck: await this.checkForContradictions(result.extractedInfo, userProfile),
        atomicFacts: result.atomicFacts || this.extractAtomicFacts(result.extractedInfo)
      };

      return enhancedResult;
      
    } catch (error) {
      console.error('Enhanced memory detection error:', error);
      return this.getDefaultMemoryDetection();
    }
  }

  // Phase 1: Build conversation state for context-aware detection
  private async buildConversationState(
    message: string,
    conversationHistory: any[],
    userProfile: UserProfile,
    conversationId?: string
  ): Promise<ConversationState> {
    
    const cacheKey = conversationId || 'default';
    const cached = this.contextCache.get(cacheKey);
    
    if (cached && Date.now() - cached.currentTurn < 300000) { // 5 minutes cache
      return cached;
    }

    // Extract recent topics using AI
    const topicsPrompt = `Extract the main topics from this conversation history:
    ${conversationHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}
    
    Return as JSON array of topics: ["topic1", "topic2", ...]`;

    let recentTopics: string[] = [];
    try {
      const topicsResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: topicsPrompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      const topicsContent = topicsResponse.choices[0].message.content || '{"topics": []}';
      const parsedTopics = JSON.parse(topicsContent);
      recentTopics = parsedTopics.topics || [];
    } catch (error) {
      console.error('Error extracting topics:', error);
    }

    // Detect user intent
    const userIntent = await this.detectUserIntent(message, conversationHistory);
    
    // Get previous memories for context
    const previousMemories = await this.getRecentMemories(1, 10); // Assuming userId 1 for now

    const state: ConversationState = {
      currentTurn: conversationHistory.length,
      recentTopics,
      userIntent,
      emotionalContext: this.detectEmotionalContext(message),
      coachingMode: userProfile.currentCoachingMode,
      previousMemories
    };

    this.contextCache.set(cacheKey, state);
    return state;
  }

  // Phase 1: Generate dynamic, context-aware prompts
  private generateContextualPrompt(
    message: string,
    conversationState: ConversationState,
    userProfile: UserProfile
  ): string {
    const basePrompt = `You are an intelligent memory system for a wellness coaching AI. Analyze this message with full context awareness.

USER PROFILE:
- Primary Goal: ${userProfile.primaryGoal}
- Coach Style: ${userProfile.coachStyle}
- Focus Areas: ${userProfile.focusAreas.join(', ')}
- Current Mode: ${userProfile.currentCoachingMode}

CONVERSATION CONTEXT:
- User Intent: ${conversationState.userIntent}
- Recent Topics: ${conversationState.recentTopics.join(', ')}
- Emotional Context: ${conversationState.emotionalContext}
- Turn Number: ${conversationState.currentTurn}

EXISTING MEMORIES (for contradiction check):
${conversationState.previousMemories.slice(0, 5).map(m => `- ${m.content} (${m.category})`).join('\n')}

CURRENT MESSAGE: "${message}"

ENHANCED ANALYSIS INSTRUCTIONS:
1. Determine if this information should be remembered based on:
   - Relevance to user's goals and coaching mode
   - Likelihood of future reference
   - Contradiction with existing memories
   - Specificity and actionability

2. Extract atomic facts (break complex information into simple, verifiable statements)

3. Map relationships to existing memories

4. Assess temporal relevance (how time-sensitive is this information?)

5. Provide confidence level in your assessment

Categories:
- "preference": Personal likes, dislikes, workout/food preferences
- "personal_info": Health conditions, medical info, demographics
- "context": Life circumstances, progress updates, situational info
- "instruction": Coaching rules, specific user instructions

Respond with JSON:
{
    "shouldRemember": boolean,
    "category": "preference|personal_info|context|instruction",
    "importance": 0.0-1.0,
    "extractedInfo": "clean version of the information to remember",
    "keywords": ["keyword1", "keyword2", ...],
    "reasoning": "detailed reasoning for the decision",
    "confidenceLevel": 0.0-1.0,
    "relationshipMapping": ["memory_id_or_description", ...],
    "atomicFacts": ["fact1", "fact2", ...]
}`;

    return basePrompt;
  }

  // Phase 1: Calculate temporal relevance
  private calculateTemporalRelevance(message: string, conversationHistory: any[]): number {
    // Check for time-sensitive keywords
    const timeSensitiveKeywords = [
      'today', 'tomorrow', 'this week', 'next week', 'currently', 'right now',
      'recently', 'lately', 'this month', 'temporary', 'for now'
    ];
    
    const hasTimeSensitive = timeSensitiveKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    // Higher relevance for recent conversation context
    const conversationRecency = Math.max(0, 1 - (Date.now() - Date.now()) / (24 * 60 * 60 * 1000));
    
    return hasTimeSensitive ? 0.9 : Math.min(0.7, conversationRecency);
  }

  // Phase 1: Check for contradictions with existing memories
  private async checkForContradictions(extractedInfo: string, userProfile: UserProfile): Promise<boolean> {
    const cacheKey = `contradiction-${extractedInfo.substring(0, 50)}`;
    const cached = this.contradictionCache.get(cacheKey);
    
    if (cached !== undefined) {
      return cached;
    }

    try {
      // Get recent memories for contradiction check
      const recentMemories = await this.getRecentMemories(1, 20); // Assuming userId 1
      
      if (recentMemories.length === 0) {
        this.contradictionCache.set(cacheKey, false);
        return false;
      }

      const contradictionPrompt = `Check if this new information contradicts any existing memories:

NEW INFORMATION: "${extractedInfo}"

EXISTING MEMORIES:
${recentMemories.map(m => `- ${m.content}`).join('\n')}

Return JSON with:
{
    "hasContradiction": boolean,
    "conflictingMemoryIds": ["id1", "id2", ...],
    "severity": "low|medium|high"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: contradictionPrompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"hasContradiction": false}');
      const hasContradiction = result.hasContradiction || false;
      
      this.contradictionCache.set(cacheKey, hasContradiction);
      return hasContradiction;
      
    } catch (error) {
      console.error('Error checking contradictions:', error);
      this.contradictionCache.set(cacheKey, false);
      return false;
    }
  }

  // Phase 1: Extract atomic facts from complex information
  private extractAtomicFacts(extractedInfo: string): string[] {
    // Simple rule-based extraction - can be enhanced with AI
    const sentences = extractedInfo.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    return sentences.map(sentence => sentence.trim()).filter(fact => 
      fact.length > 5 && fact.length < 200
    );
  }

  // Phase 1: Detect user intent from message
  private async detectUserIntent(message: string, conversationHistory: any[]): Promise<string> {
    const intentKeywords = {
      'seeking_advice': ['help', 'advice', 'what should', 'how do i', 'can you help'],
      'sharing_progress': ['did', 'completed', 'finished', 'achieved', 'progress'],
      'expressing_preference': ['like', 'prefer', 'hate', 'love', 'enjoy', 'dislike'],
      'asking_question': ['?', 'what', 'when', 'where', 'how', 'why', 'who'],
      'setting_goal': ['want to', 'goal', 'target', 'aim to', 'plan to'],
      'reporting_issue': ['problem', 'issue', 'difficulty', 'struggle', 'challenge']
    };

    const messageLower = message.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return intent;
      }
    }
    
    return 'general_conversation';
  }

  // Phase 1: Detect emotional context
  private detectEmotionalContext(message: string): string {
    const emotionalKeywords = {
      'positive': ['happy', 'excited', 'great', 'awesome', 'love', 'enjoy', 'motivated'],
      'negative': ['frustrated', 'sad', 'disappointed', 'angry', 'upset', 'discouraged'],
      'neutral': ['okay', 'fine', 'normal', 'regular', 'usual'],
      'determined': ['will', 'must', 'committed', 'dedicated', 'focused', 'determined']
    };

    const messageLower = message.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return emotion;
      }
    }
    
    return 'neutral';
  }

  // Phase 1: Get recent memories for context
  private async getRecentMemories(userId: number, limit: number = 10): Promise<MemoryEntry[]> {
    try {
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(eq(memoryEntries.userId, userId))
        .orderBy(desc(memoryEntries.createdAt))
        .limit(limit);
      
      return memories;
    } catch (error) {
      console.error('Error fetching recent memories:', error);
      return [];
    }
  }

  // Phase 1: Default memory detection result
  private getDefaultMemoryDetection(): EnhancedMemoryDetection {
    return {
      shouldRemember: false,
      category: 'context',
      importance: 0.0,
      extractedInfo: '',
      keywords: [],
      reasoning: 'Error in enhanced AI processing',
      conversationalContext: 'unknown',
      userIntent: 'unknown',
      temporalRelevance: 0.5,
      confidenceLevel: 0.0,
      relationshipMapping: [],
      contradictionCheck: false,
      atomicFacts: []
    };
  }

  // Phase 1: Enhanced memory retrieval with dynamic thresholds
  async getRelevantMemories(
    query: string, 
    userId: number, 
    limit: number = 5,
    contextualHints: string[] = []
  ): Promise<MemoryEntry[]> {
    
    // Calculate dynamic similarity threshold
    const threshold = this.calculateDynamicThreshold(query, contextualHints);
    
    try {
      // Get query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      if (queryEmbedding.length === 0) {
        return [];
      }

      // Get all memories for the user
      const allMemories = await db
        .select()
        .from(memoryEntries)
        .where(eq(memoryEntries.userId, userId))
        .orderBy(desc(memoryEntries.createdAt));

      // Calculate similarities and apply dynamic threshold
      const scoredMemories = [];
      
      for (const memory of allMemories) {
        if (!memory.embedding || !Array.isArray(memory.embedding) || memory.embedding.length === 0) {
          continue;
        }

        const similarity = await this.cosineSimilarity(queryEmbedding, memory.embedding as number[]);
        
        // Apply temporal weighting (boost recent memories)
        const createdAt = memory.createdAt || new Date();
        const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const temporalBoost = Math.max(0.1, 1 - (daysSinceCreated / 30)); // Boost fades over 30 days
        const weightedScore = similarity * (0.8 + 0.2 * temporalBoost);

        if (weightedScore >= threshold.adjustedThreshold) {
          scoredMemories.push({
            ...memory,
            relevanceScore: weightedScore,
            retrievalReason: `Similarity: ${similarity.toFixed(3)}, Temporal boost: ${temporalBoost.toFixed(3)}`
          });
        }
      }

      // Sort by relevance and apply diversity filtering
      scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      const diverseMemories = this.applyDiversityFiltering(scoredMemories, limit);
      
      return diverseMemories.slice(0, limit);
      
    } catch (error) {
      console.error('Enhanced memory retrieval error:', error);
      return [];
    }
  }

  // Phase 1: Calculate dynamic similarity threshold
  private calculateDynamicThreshold(query: string, contextualHints: string[]): DynamicSimilarityThreshold {
    const cacheKey = `threshold-${query.substring(0, 30)}`;
    const cached = this.thresholdCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Base threshold
    let baseThreshold = 0.7;
    
    // Adjust based on query specificity
    const queryLength = query.split(' ').length;
    const querySpecificity = Math.min(1.0, queryLength / 10);
    
    // Adjust based on contextual hints
    const contextRelevance = contextualHints.length > 0 ? 0.8 : 0.5;
    
    // Calculate adjusted threshold
    let adjustedThreshold = baseThreshold;
    
    // Lower threshold for more specific queries
    if (querySpecificity > 0.7) {
      adjustedThreshold -= 0.1;
    }
    
    // Lower threshold when we have contextual hints
    if (contextRelevance > 0.7) {
      adjustedThreshold -= 0.05;
    }
    
    // Ensure threshold stays within reasonable bounds
    adjustedThreshold = Math.max(0.5, Math.min(0.9, adjustedThreshold));
    
    const threshold: DynamicSimilarityThreshold = {
      querySpecificity,
      contextRelevance,
      temporalWeight: 0.2,
      baseThreshold,
      adjustedThreshold
    };
    
    this.thresholdCache.set(cacheKey, threshold);
    return threshold;
  }

  // Phase 1: Apply diversity filtering to prevent redundant memories
  private applyDiversityFiltering(memories: any[], targetCount: number): any[] {
    if (memories.length <= targetCount) {
      return memories;
    }

    const selected = [memories[0]]; // Always take the highest scoring
    const remaining = memories.slice(1);
    
    while (selected.length < targetCount && remaining.length > 0) {
      let bestIndex = 0;
      let bestDiversityScore = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Calculate diversity score (lower similarity to selected memories = higher diversity)
        let diversityScore = candidate.relevanceScore;
        
        for (const selectedMemory of selected) {
          const contentSimilarity = this.calculateTextSimilarity(
            candidate.content, 
            selectedMemory.content
          );
          diversityScore *= (1 - contentSimilarity * 0.5); // Penalize similar content
        }
        
        if (diversityScore > bestDiversityScore) {
          bestDiversityScore = diversityScore;
          bestIndex = i;
        }
      }
      
      selected.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    }
    
    return selected;
  }

  // Phase 1: Simple text similarity calculation
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1Array = text1.toLowerCase().split(/\s+/);
    const words2Array = text2.toLowerCase().split(/\s+/);
    const words1Set = new Set(words1Array);
    const words2Set = new Set(words2Array);
    
    const intersection = words1Array.filter(x => words2Set.has(x));
    const union = [...words1Array, ...words2Array.filter(x => !words1Set.has(x))];
    
    return intersection.length / union.length;
  }

  // Utility methods (kept from original service)
  async generateEmbedding(text: string): Promise<number[]> {
    const cached = await cacheService.getEmbedding(text);
    if (cached && cached.embedding.length > 0) {
      return cached.embedding;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      
      const embedding = response.data[0].embedding;
      cacheService.setEmbedding(text, embedding, 'text-embedding-3-small');
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  async cosineSimilarity(vectorA: number[], vectorB: number[]): Promise<number> {
    if (vectorA.length !== vectorB.length || vectorA.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const enhancedMemoryService = new EnhancedMemoryService();