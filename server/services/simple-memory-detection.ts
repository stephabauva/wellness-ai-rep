import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
import { memoryEntries, type InsertMemoryEntry } from '../../shared/schema';
import { v4 as uuidv4 } from 'uuid';

interface SimpleMemoryResult {
  shouldRemember: boolean;
  category: 'personal_info' | 'preference' | 'context' | 'goal';
  importance: number;
  summary: string;
  keywords: string[];
}

class SimpleMemoryDetectionService {
  private google: GoogleGenerativeAI;

  constructor() {
    this.google = new GoogleGenerativeAI(
      process.env.GOOGLE_AI_API_KEY || ''
    );
  }

  async analyzeMessage(message: string, userId: number): Promise<void> {
    console.log(`[SimpleMemoryDetection] Analyzing message for user ${userId}: ${message.substring(0, 100)}...`);
    try {
      // Use Google Gemini Flash Lite for cost-effective memory detection
      const model = this.google.getGenerativeModel({ 
        model: "gemini-2.0-flash-lite",
        generationConfig: {
          temperature: 0.1
        }
      });

      const prompt = `Analyze this wellness message for important info: "${message}"

Return JSON only:
{"shouldRemember": true/false, "category": "personal_info|preference|context|goal", "importance": 0.1-1.0, "summary": "brief summary", "keywords": ["key", "words"]}`;

      const response = await model.generateContent(prompt);
      const content = response.response.text();
      
      // Parse JSON response - handle various Gemini response formats
      let cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Try multiple extraction methods
      let jsonStr = '';
      
      // Method 1: Look for complete JSON object
      const jsonMatch = cleanContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      // Method 2: Find JSON in lines
      if (!jsonStr) {
        const lines = cleanContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('{') && trimmed.includes('}')) {
            jsonStr = trimmed;
            break;
          }
        }
      }
      
      // Method 3: Extract everything between first { and last }
      if (!jsonStr) {
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = cleanContent.substring(firstBrace, lastBrace + 1);
        }
      }
      
      if (!jsonStr) {
        console.warn('[SimpleMemoryDetection] No valid JSON found in response:', content);
        return;
      }

      console.log('[SimpleMemoryDetection] Attempting to parse JSON:', jsonStr.substring(0, 200) + '...');
      
      // Clean up common JSON formatting issues
      jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      
      const result: SimpleMemoryResult = JSON.parse(jsonStr);

      if (result.shouldRemember && result.summary && result.importance > 0.5) {
        // Store memory in database
        const memoryEntry: InsertMemoryEntry = {
          userId,
          content: result.summary,
          category: result.category,
          importanceScore: result.importance,
          keywords: result.keywords,
          embedding: [], // Simple implementation without embeddings
          sourceConversationId: null,
          sourceMessageId: null
        };

        await db.insert(memoryEntries).values(memoryEntry);
        console.log(`[SimpleMemoryDetection] Created memory: ${result.summary}`);
      }

    } catch (error) {
      console.error('[SimpleMemoryDetection] Error analyzing message:', error);
    }
  }
}

export const simpleMemoryDetection = new SimpleMemoryDetectionService();