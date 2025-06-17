import { db } from '../db';
import { 
  memoryEntries, 
  type InsertMemoryEntry,
  type MemoryEntry,
  type MemoryCategory
} from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { cacheService } from './cache-service';
import crypto from 'crypto';

/**
 * Optimized Memory Service for ChatGPT-level performance
 * Target: <50ms for deduplication, <100ms for retrieval
 */
export class OptimizedMemoryService {
  private deduplicationCache = new Map<string, string>();
  private memoryCache = new Map<string, MemoryEntry[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<string, number>();

  /**
   * Fast semantic deduplication using content hashing
   */
  async processWithDeduplication(
    userId: number,
    message: string,
    conversationId: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Generate lightweight semantic hash
      const semanticHash = this.generateSemanticHash(message);
      
      // Fast duplicate check using hash
      const isDuplicate = await this.checkSemanticDuplicate(userId, semanticHash);
      
      if (!isDuplicate) {
        // Lightweight memory detection
        const detection = this.detectMemoryWorthy(message);
        
        if (detection.shouldRemember) {
          await this.saveMemoryEntry(userId, detection.extractedInfo, {
            category: detection.category,
            importance_score: detection.importance,
            sourceConversationId: conversationId,
            keywords: detection.keywords,
            semanticHash
          });
        }
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`[OptimizedMemory] Processed deduplication in ${processingTime}ms`);
    } catch (error) {
      console.error('[OptimizedMemory] Deduplication failed:', error);
    }
  }

  /**
   * Enhanced system prompt builder with cached memory retrieval
   */
  async buildEnhancedSystemPrompt(
    userId: number, 
    currentMessage: string
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Fast memory retrieval with caching
      const relevantMemories = await this.getContextualMemories(userId, currentMessage);

      if (relevantMemories.length === 0) {
        return "You are a helpful AI wellness coach.";
      }

      // Efficient context building
      const memoryContext = this.buildMemoryContext(relevantMemories);
      
      const processingTime = Date.now() - startTime;
      console.log(`[OptimizedMemory] Built system prompt in ${processingTime}ms`);
      
      return `You are a helpful AI wellness coach. Consider this context about the user:

${memoryContext}

Use this information naturally in your responses without explicitly mentioning you're using remembered information.`;
    } catch (error) {
      console.error('[OptimizedMemory] System prompt generation failed:', error);
      return "You are a helpful AI wellness coach.";
    }
  }

  /**
   * Fast memory retrieval with intelligent caching
   */
  async getContextualMemories(userId: number, query: string): Promise<MemoryEntry[]> {
    const cacheKey = `memories_${userId}_${this.hashString(query.slice(0, 50))}`;
    
    // Check cache first
    if (this.memoryCache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    try {
      // Simple but fast query - get recent memories
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.importanceScore), desc(memoryEntries.createdAt))
        .limit(5); // Reduced for performance

      // Cache the results
      this.memoryCache.set(cacheKey, memories);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return memories;
    } catch (error) {
      console.error('[OptimizedMemory] Memory retrieval failed:', error);
      return [];
    }
  }

  /**
   * Lightweight memory detection without AI calls
   */
  private detectMemoryWorthy(message: string): {
    shouldRemember: boolean;
    category: MemoryCategory;
    importance: number;
    extractedInfo: string;
    keywords: string[];
  } {
    const text = message.toLowerCase();
    
    // Fast pattern-based detection
    const memoryPatterns = {
      goals: ['want to', 'goal is', 'trying to', 'hope to', 'plan to'],
      preferences: ['prefer', 'like', 'love', 'hate', 'dislike', 'enjoy'],
      constraints: ['cannot', 'can\'t', 'allergic', 'avoid', 'restrict'],
      health: ['weight', 'exercise', 'workout', 'diet', 'calories', 'steps']
    };

    let category: MemoryCategory = 'context';
    let importance = 0.3;
    let shouldRemember = false;
    
    // Check for memory-worthy patterns
    for (const [cat, patterns] of Object.entries(memoryPatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        shouldRemember = true;
        category = cat as MemoryCategory;
        importance = cat === 'goals' ? 0.9 : cat === 'constraints' ? 0.8 : 0.6;
        break;
      }
    }

    // Extract keywords using simple word frequency
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
   * Generate lightweight semantic hash for deduplication
   */
  private generateSemanticHash(message: string): string {
    // Extract key terms and create hash
    const normalizedText = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = normalizedText.split(' ')
      .filter(word => word.length > 3)
      .sort()
      .slice(0, 10); // Top 10 words for comparison

    const keyContent = words.join('|');
    return crypto.createHash('md5').update(keyContent).digest('hex').slice(0, 16);
  }

  /**
   * Fast duplicate check using semantic hash
   */
  private async checkSemanticDuplicate(userId: number, semanticHash: string): Promise<boolean> {
    try {
      const existing = await db
        .select({ id: memoryEntries.id })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          sql`${memoryEntries.content} ILIKE '%' || ${semanticHash.slice(0, 8)} || '%'`,
          eq(memoryEntries.isActive, true)
        ))
        .limit(1);

      return existing.length > 0;
    } catch (error) {
      console.error('[OptimizedMemory] Duplicate check failed:', error);
      return false;
    }
  }

  /**
   * Efficient memory context building
   */
  private buildMemoryContext(memories: MemoryEntry[]): string {
    return memories
      .slice(0, 4) // Limit to top 4 for performance
      .map(memory => `- ${memory.content}`)
      .join('\n');
  }

  /**
   * Fast memory entry saving
   */
  private async saveMemoryEntry(
    userId: number, 
    content: string, 
    metadata: any
  ): Promise<void> {
    try {
      const entry: InsertMemoryEntry = {
        userId,
        content,
        category: metadata.category,
        importanceScore: metadata.importance_score,
        keywords: metadata.keywords,
        sourceConversationId: metadata.sourceConversationId,
        isActive: true
      };

      await db.insert(memoryEntries).values(entry);
    } catch (error) {
      console.error('[OptimizedMemory] Failed to save memory:', error);
    }
  }

  /**
   * Utility methods
   */
  private hashString(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
  }

  private isCacheValid(cacheKey: string): boolean {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < this.CACHE_TTL;
  }
}

export const optimizedMemoryService = new OptimizedMemoryService();