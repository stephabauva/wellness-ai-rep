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
  type InsertMemoryTrigger,
  type InsertMemoryAccessLog,
  type MemoryEntry,
  type MemoryCategory
} from '../../shared/schema';
import { eq, desc, and, sql, gt } from 'drizzle-orm';

interface MemoryDetectionResult {
  shouldRemember: boolean;
  category: MemoryCategory;
  importance: number;
  extractedInfo: string;
  keywords: string[];
  reasoning: string;
}

interface RelevantMemory extends MemoryEntry {
  relevanceScore: number;
  retrievalReason: string;
}

class MemoryService {
  private openai: OpenAI;
  private google: GoogleGenerativeAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.google = new GoogleGenerativeAI(
      process.env.GOOGLE_API_KEY || ''
    );
  }

  // Detect explicit memory triggers like "remember this" or "don't forget"
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

  // AI-powered detection of memory-worthy content
  async detectMemoryWorthy(message: string, conversationHistory: any[] = []): Promise<MemoryDetectionResult> {
    const prompt = `Analyze this wellness coaching conversation message and determine if it contains information worth remembering for future coaching sessions.

Look for:
1. Personal health preferences (workout types, dietary restrictions, preferred activities) - category: "preference"
2. Important personal information (health conditions, goals, lifestyle) - category: "personal_info"
3. Significant health context that might be referenced later - category: "context"
4. User instructions or coaching preferences - category: "instruction"
5. Corrections to previous information
6. Progress milestones or achievements

Message: "${message}"

Previous context: ${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

IMPORTANT: Use these exact categories:
- "preference" for likes, dislikes, workout preferences, food preferences
- "personal_info" for health conditions, allergies, medical information
- "context" for situational information, progress updates, life circumstances
- "instruction" for specific coaching instructions and rules

Respond with JSON:
{
    "shouldRemember": boolean,
    "category": "preference|personal_info|context|instruction",
    "importance": 0.0-1.0,
    "extractedInfo": "clean version of the information to remember",
    "keywords": ["keyword1", "keyword2", ...],
    "reasoning": "why this should/shouldn't be remembered"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      let content = response.choices[0].message.content || '{}';
      // Clean up markdown formatting if present
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Extract JSON from text if needed
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const result = JSON.parse(content);
      return {
        shouldRemember: result.shouldRemember || false,
        category: result.category || 'context',
        importance: result.importance || 0.5,
        extractedInfo: result.extractedInfo || '',
        keywords: result.keywords || [],
        reasoning: result.reasoning || ''
      };
    } catch (error) {
      console.error('Error in memory detection:', error);
      return {
        shouldRemember: false,
        category: 'context',
        importance: 0.0,
        extractedInfo: '',
        keywords: [],
        reasoning: 'Error in AI processing'
      };
    }
  }

  // Generate embeddings for semantic search
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  // Save memory entry to database
  async saveMemoryEntry(
    userId: number, 
    content: string, 
    options: {
      category: MemoryCategory;
      importance_score: number;
      sourceConversationId?: string;
      sourceMessageId?: number;
      keywords?: string[];
    }
  ): Promise<MemoryEntry | null> {
    try {
      const embedding = await this.generateEmbedding(content);
      
      const memoryData: InsertMemoryEntry = {
        userId,
        content,
        category: options.category,
        importanceScore: options.importance_score,
        keywords: options.keywords || [],
        embedding: JSON.stringify(embedding),
        sourceConversationId: options.sourceConversationId,
        sourceMessageId: options.sourceMessageId,
      };

      const [memory] = await db.insert(memoryEntries).values(memoryData).returning();
      return memory;
    } catch (error) {
      console.error('Error saving memory entry:', error);
      return null;
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Retrieve relevant memories based on context
  async getContextualMemories(
    userId: number, 
    conversationHistory: any[], 
    currentMessage: string
  ): Promise<RelevantMemory[]> {
    try {
      // Skip memory retrieval for fresh conversations (no history)
      if (conversationHistory.length === 0) {
        console.log('Skipping memory retrieval: fresh conversation detected');
        return [];
      }

      // Combine recent conversation + current message for context
      const context = [
        ...conversationHistory.slice(-3),
        { role: 'user', content: currentMessage }
      ].map(m => m.content).join(' ');

      // Generate embedding for current context
      const contextEmbedding = await this.generateEmbedding(context);

      // Get all memories for the user
      const userMemories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.importanceScore));

      // Calculate semantic similarity and create relevant memories
      const relevantMemories: RelevantMemory[] = [];

      for (const memory of userMemories) {
        if (!memory.embedding) continue;

        try {
          if (memory.embedding) {
            let memoryEmbedding;
            if (typeof memory.embedding === 'string') {
              memoryEmbedding = JSON.parse(memory.embedding);
            } else {
              memoryEmbedding = memory.embedding;
            }
            
            if (Array.isArray(memoryEmbedding) && memoryEmbedding.length > 0 && Array.isArray(contextEmbedding)) {
              const similarity = this.cosineSimilarity(contextEmbedding, memoryEmbedding);
              
              if (similarity > 0.7) { // Threshold for relevance
                relevantMemories.push({
                  ...memory,
                  relevanceScore: similarity * memory.importanceScore,
                  retrievalReason: 'semantic_similarity'
                });
              }
            }
          }
        } catch (error) {
          console.error('Error parsing memory embedding for memory', memory.id, ':', error);
        }
      }

      // Also get high-importance recent memories
      const recentImportantMemories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true),
          gt(memoryEntries.importanceScore, 0.8)
        ))
        .orderBy(desc(memoryEntries.createdAt))
        .limit(3);

      // Add recent important memories
      for (const memory of recentImportantMemories) {
        if (!relevantMemories.find(rm => rm.id === memory.id)) {
          relevantMemories.push({
            ...memory,
            relevanceScore: memory.importanceScore,
            retrievalReason: 'high_importance'
          });
        }
      }

      // Sort by relevance score and return top memories
      return relevantMemories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 8);
        
    } catch (error) {
      console.error('Error retrieving contextual memories:', error);
      return [];
    }
  }

  // Process message for memory extraction
  async processMessageForMemory(
    userId: number, 
    message: string, 
    conversationId: string, 
    messageId: number,
    conversationHistory: any[] = []
  ): Promise<{
    explicitMemory?: MemoryEntry;
    autoDetectedMemory?: MemoryEntry;
    triggers: any[];
  }> {
    const results: {
      explicitMemory?: MemoryEntry;
      autoDetectedMemory?: MemoryEntry;
      triggers: any[];
    } = { triggers: [] };

    try {
      // Check for explicit triggers
      const explicitTrigger = this.detectExplicitMemoryTriggers(message);
      if (explicitTrigger) {
        // Save explicit memory trigger
        const triggerData: InsertMemoryTrigger = {
          messageId,
          triggerType: explicitTrigger.type,
          triggerPhrase: explicitTrigger.content,
          confidence: explicitTrigger.confidence,
        };

        const [trigger] = await db.insert(memoryTriggers).values(triggerData).returning();
        results.triggers.push(trigger);

        // Save the memory
        const memory = await this.saveMemoryEntry(userId, explicitTrigger.content, {
          category: 'instruction',
          importance_score: 0.9,
          sourceConversationId: conversationId,
          sourceMessageId: messageId,
        });

        if (memory) {
          results.explicitMemory = memory;
          // Update trigger with memory ID
          await db
            .update(memoryTriggers)
            .set({ memoryEntryId: memory.id, processed: true })
            .where(eq(memoryTriggers.id, trigger.id));
        }
      }

      // Check for automatic memory detection
      const autoDetection = await this.detectMemoryWorthy(message, conversationHistory);
      if (autoDetection.shouldRemember) {
        // Save auto detection trigger
        const triggerData: InsertMemoryTrigger = {
          messageId,
          triggerType: 'auto_detected',
          confidence: autoDetection.importance,
        };

        const [trigger] = await db.insert(memoryTriggers).values(triggerData).returning();
        results.triggers.push(trigger);

        // Save the memory
        const memory = await this.saveMemoryEntry(userId, autoDetection.extractedInfo, {
          category: autoDetection.category,
          importance_score: autoDetection.importance,
          sourceConversationId: conversationId,
          sourceMessageId: messageId,
          keywords: autoDetection.keywords,
        });

        if (memory) {
          results.autoDetectedMemory = memory;
          // Update trigger with memory ID
          await db
            .update(memoryTriggers)
            .set({ memoryEntryId: memory.id, processed: true })
            .where(eq(memoryTriggers.id, trigger.id));
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing message for memory:', error);
      return { triggers: [] };
    }
  }

  // Log memory usage for analytics
  async logMemoryUsage(
    memories: RelevantMemory[], 
    conversationId: string, 
    usedInResponse: boolean = true
  ): Promise<void> {
    try {
      const accessLogs: InsertMemoryAccessLog[] = memories.map(memory => ({
        memoryEntryId: memory.id,
        conversationId,
        relevanceScore: memory.relevanceScore,
        usedInResponse,
      }));

      if (accessLogs.length > 0) {
        await db.insert(memoryAccessLog).values(accessLogs);

        // Update access count and last accessed timestamp
        for (const memory of memories) {
          await db
            .update(memoryEntries)
            .set({ 
              accessCount: sql`${memoryEntries.accessCount} + 1`,
              lastAccessed: new Date()
            })
            .where(eq(memoryEntries.id, memory.id));
        }
      }
    } catch (error) {
      console.error('Error logging memory usage:', error);
    }
  }

  // Build system prompt with relevant memories
  buildSystemPromptWithMemories(memories: RelevantMemory[], basePersona?: string): string {
    const persona = basePersona || "You are a helpful AI wellness coach. Provide personalized advice based on the conversation.";
    
    if (memories.length === 0) {
      return persona;
    }

    const memoryContext = memories.map(memory => 
      `- ${memory.content} (${memory.category}, importance: ${memory.importanceScore})`
    ).join('\n');

    return `${persona}

REMEMBERED INFORMATION:
${memoryContext}

Use this information to personalize your responses, but don't explicitly mention that you're using remembered information unless directly relevant to the conversation.`;
  }

  // Get user's memories for management interface
  async getUserMemories(userId: number, category?: MemoryCategory): Promise<MemoryEntry[]> {
    try {
      const whereConditions = [
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ];

      if (category) {
        whereConditions.push(eq(memoryEntries.category, category));
      }

      return await db
        .select()
        .from(memoryEntries)
        .where(and(...whereConditions))
        .orderBy(desc(memoryEntries.importanceScore), desc(memoryEntries.createdAt));
    } catch (error) {
      console.error('Error getting user memories:', error);
      return [];
    }
  }

  // Delete memory
  async deleteMemory(memoryId: string, userId: number): Promise<boolean> {
    try {
      const [deleted] = await db
        .update(memoryEntries)
        .set({ isActive: false })
        .where(and(
          eq(memoryEntries.id, memoryId),
          eq(memoryEntries.userId, userId)
        ))
        .returning();

      return !!deleted;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
  }
}

export const memoryService = new MemoryService();