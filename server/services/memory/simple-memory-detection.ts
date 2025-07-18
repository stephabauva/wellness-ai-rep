// @used-by memory/domain
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { db } from "@shared/database/db";
import { memoryEntries, users, type InsertMemoryEntry } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

interface SimpleMemoryResult {
  shouldRemember: boolean;
  category: 'personal_info' | 'preference' | 'context' | 'goal';
  importance: number;
  summary: string;
  keywords: string[];
}

// Initialize AI providers lazily
let google: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;

const getGoogleAI = () => {
  if (!google) {
    google = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  }
  return google;
};

const getOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  }
  return openai;
};

const validateMemoryContent = (content: string, category: 'personal_info' | 'preference' | 'context' | 'goal'): boolean => {
  // Check for minimum content length
  if (!content || content.trim().length < 5) {
    console.log(`[SimpleMemoryDetection] Content too short: "${content}"`);
    return false;
  }

  // Check for undefined or placeholder content
  if (content.includes('undefined') || content.includes('null') || content.includes('N/A')) {
    console.log(`[SimpleMemoryDetection] Placeholder content detected: "${content}"`);
    return false;
  }

  // Define nonsensical patterns that indicate poor quality content
  const nonsensicalPatterns = [
    /eating water/i,
    /drinking food/i,
    /sleeping exercise/i,
    /running sleep/i,
    /breathing exercise.*food/i,
    /workout.*water.*drink/i
  ];

  // Category-specific validation
  if (category === 'preference') {
    // For food/diet preferences, check for logical inconsistencies
    const foodLogicPatterns = [
      /enjoys eating (water|air|nothing)/i,
      /likes drinking (solid|food)/i,
      /prefers (impossible|contradictory)/i
    ];
    
    if (foodLogicPatterns.some(pattern => pattern.test(content))) {
      console.log(`[SimpleMemoryDetection] Nonsensical food preference: "${content}"`);
      return false;
    }
  }

  // General nonsensical content check
  if (nonsensicalPatterns.some(pattern => pattern.test(content))) {
    console.log(`[SimpleMemoryDetection] Nonsensical content detected: "${content}"`);
    return false;
  }

  // Check for very repetitive content (likely processing error)
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 3 && uniqueWords.size / words.length < 0.5) {
    console.log(`[SimpleMemoryDetection] Overly repetitive content: "${content}"`);
    return false;
  }

  return true;
};

export const analyzeMessage = async (message: string, userId: number): Promise<void> => {
  console.log(`[SimpleMemoryDetection] Analyzing message for user ${userId}: ${message.substring(0, 100)}...`);
  try {
    // Get user's memory detection settings
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      console.log(`[SimpleMemoryDetection] User ${userId} not found`);
      return;
    }

    const memoryProvider = user.memoryDetectionProvider || "google";
    const memoryModel = user.memoryDetectionModel || "gemini-2.0-flash-lite";

    // Skip memory detection if disabled
    if (memoryProvider === "none") {
      console.log(`[SimpleMemoryDetection] Memory detection disabled for user ${userId}`);
      return;
    }

    const prompt = `Analyze this wellness message for important info: "${message}"

Return JSON only:
{"shouldRemember": true/false, "category": "personal_info|preference|context|goal", "importance": 0.1-1.0, "summary": "brief summary", "keywords": ["key", "words"]}`;

    let content: string;

    if (memoryProvider === "google") {
      const googleAI = getGoogleAI();
      const model = googleAI.getGenerativeModel({ 
        model: memoryModel,
        generationConfig: {
          temperature: 0.1
        }
      });

      const response = await model.generateContent(prompt);
      content = response.response.text();
    } else if (memoryProvider === "openai") {
      const openaiClient = getOpenAI();
      const response = await openaiClient.chat.completions.create({
        model: memoryModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 200
      });

      content = response.choices[0]?.message?.content || "";
    } else {
      console.log(`[SimpleMemoryDetection] Unknown provider: ${memoryProvider}`);
      return;
    }
    
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

    // Validate memory content quality before storage
    if (result.shouldRemember && result.summary && result.importance > 0.5 && validateMemoryContent(result.summary, result.category)) {
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
};