// Chat Nutrition Data Processing Service
// @used-by server/routes/chat-routes.ts

import { nutritionInferenceService } from "./nutrition-inference-service.js";
import { storage } from "./service-registry.js";

interface HealthDataEntry {
  userId: number;
  dataType: string;
  value: string;
  unit: string;
  timestamp: Date;
  source: string;
  category: string;
  metadata: {
    conversationId: string;
    extractedFrom: string;
    [key: string]: any;
  };
}

/**
 * Processes nutrition data from AI response and stores it as health records
 * @param aiResponse The AI response text to analyze
 * @param originalMessage The original user message
 * @param userId The user ID
 * @param conversationId The conversation ID
 * @param hasImages Whether the message contained images
 */
export async function processNutritionData(
  aiResponse: string,
  originalMessage: string,
  userId: number,
  conversationId: string,
  hasImages: boolean = false
): Promise<void> {
  try {
    console.log('[NUTRITION_PROCESSING] Starting nutrition data extraction');
    
    // Extract nutrition data from AI response with memory enhancement
    const nutritionData = await nutritionInferenceService.extractNutritionFromText(
      aiResponse,
      originalMessage,
      hasImages,
      undefined, // timezone - could be added later
      userId
    );

    if (nutritionData) {
      console.log('[NUTRITION_PROCESSING] Nutrition data extracted:', {
        calories: nutritionData.calories,
        confidence: nutritionData.confidence,
        source: nutritionData.source,
        foodItems: nutritionData.foodItems?.length || 0
      });

      // Format for storage
      const formattedData = nutritionInferenceService.formatForStorage(nutritionData);

      // Store nutrition data as health records
      const healthDataEntries: HealthDataEntry[] = [];

      // Create individual entries for each nutrition component
      if (formattedData.calories !== undefined) {
        healthDataEntries.push(createHealthDataEntry(
          userId, 'calories', formattedData.calories.toString(), 'kcal', 
          nutritionData.timestamp, formattedData.metadata, conversationId
        ));
      }

      if (formattedData.protein !== undefined) {
        healthDataEntries.push(createHealthDataEntry(
          userId, 'protein', formattedData.protein.toString(), 'g',
          nutritionData.timestamp, formattedData.metadata, conversationId
        ));
      }

      if (formattedData.carbs !== undefined) {
        healthDataEntries.push(createHealthDataEntry(
          userId, 'carbohydrates', formattedData.carbs.toString(), 'g',
          nutritionData.timestamp, formattedData.metadata, conversationId
        ));
      }

      if (formattedData.fat !== undefined) {
        healthDataEntries.push(createHealthDataEntry(
          userId, 'fat', formattedData.fat.toString(), 'g',
          nutritionData.timestamp, formattedData.metadata, conversationId
        ));
      }

      if (formattedData.fiber !== undefined) {
        healthDataEntries.push(createHealthDataEntry(
          userId, 'fiber', formattedData.fiber.toString(), 'g',
          nutritionData.timestamp, formattedData.metadata, conversationId
        ));
      }

      if (formattedData.sugar !== undefined) {
        healthDataEntries.push(createHealthDataEntry(
          userId, 'sugar', formattedData.sugar.toString(), 'g',
          nutritionData.timestamp, formattedData.metadata, conversationId
        ));
      }

      if (formattedData.sodium !== undefined) {
        healthDataEntries.push(createHealthDataEntry(
          userId, 'sodium', formattedData.sodium.toString(), 'mg',
          nutritionData.timestamp, formattedData.metadata, conversationId
        ));
      }

      // Store all nutrition data as batch
      if (healthDataEntries.length > 0) {
        await storage.createHealthDataBatch(healthDataEntries);
        console.log('[NUTRITION_PROCESSING] Successfully stored', healthDataEntries.length, 'nutrition entries');
        
        // Update food memories after successful storage
        await nutritionInferenceService.updateFoodMemories(userId, nutritionData, conversationId);
        console.log('[NUTRITION_PROCESSING] Updated food memories for user', userId);
      }
    } else {
      console.log('[NUTRITION_PROCESSING] No nutrition data found in AI response');
    }
  } catch (error) {
    console.error('[NUTRITION_PROCESSING] Error processing nutrition data:', error);
    // Don't throw - nutrition processing is supplementary and shouldn't break chat
  }
}

/**
 * Creates a standardized health data entry
 */
function createHealthDataEntry(
  userId: number,
  dataType: string,
  value: string,
  unit: string,
  timestamp: Date,
  metadata: any,
  conversationId: string
): HealthDataEntry {
  return {
    userId,
    dataType,
    value,
    unit,
    timestamp,
    source: 'chat_inference',
    category: 'nutrition',
    metadata: {
      ...metadata,
      conversationId,
      extractedFrom: 'ai_chat'
    }
  };
}