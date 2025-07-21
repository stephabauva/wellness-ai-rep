import { DateContextParser, type DateContext } from './health/date-context-parser.js';
import { nutritionMemoryService } from './nutrition-memory-service.js';
import { nutritionDataSchema, type NutritionData } from '../types/nutrition-types.js';
import { parseNutritionValues } from '../utilities/nutrition-pattern-parser.js';
import { extractMealType, extractFoodItems } from '../utilities/nutrition-classifiers.js';
import { formatForStorage } from '../utilities/nutrition-formatters.js';

// Helper function to log with service context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[NutritionInferenceService] ${message}`, data || '');
};


export class NutritionInferenceService {
  constructor() {
    log('info', 'NutritionInferenceService initialized');
  }

  /**
   * Extract nutrition information from AI response text
   * Handles both explicit values and inferred estimates
   * Now includes date context parsing and memory-enhanced estimation
   */
  public async extractNutritionFromText(
    responseText: string,
    originalMessage?: string,
    hasImages?: boolean,
    timezone?: string,
    userId?: number
  ): Promise<NutritionData | null> {
    try {
      log('info', 'Extracting nutrition data from AI response');
      
      // Check if response contains nutrition-related content
      if (!this.containsNutritionContent(responseText)) {
        log('info', 'No nutrition content detected in response');
        return null;
      }

      // Extract nutrition values using various patterns
      const nutritionValues = parseNutritionValues(responseText);
      
      // Determine confidence based on source and explicitness
      const confidence = this.determineConfidence(responseText, originalMessage, hasImages);
      
      // Determine source based on analysis
      const source = this.determineSource(responseText, originalMessage, hasImages);
      
      // Extract meal type if mentioned
      const mealType = extractMealType(responseText, originalMessage);
      
      // Extract food items mentioned
      const foodItems = extractFoodItems(responseText, originalMessage);

      // Parse date context from the conversation
      const dateContext = this.parseDateContext(responseText, originalMessage, timezone);

      // Enhance with memory-based inference if user ID provided
      let memoryEnhancement: any = null;
      if (userId && foodItems.length > 0) {
        memoryEnhancement = await nutritionMemoryService.enhanceNutritionInference(
          userId,
          foodItems,
          mealType
        );
        
        // Use memory-based calorie estimation if no explicit calories found
        if (!nutritionValues.calories && memoryEnhancement.estimatedCalories) {
          nutritionValues.calories = memoryEnhancement.estimatedCalories;
          log('info', 'Enhanced nutrition data with memory-based estimation', {
            estimatedCalories: memoryEnhancement.estimatedCalories,
            reasoning: memoryEnhancement.reasoning
          });
        }
      }

      // Build nutrition data object
      const nutritionData: NutritionData = {
        ...nutritionValues,
        timestamp: dateContext.date,
        confidence,
        source,
        mealType,
        foodItems,
        originalText: originalMessage,
        dateContext: {
          confidence: dateContext.confidence,
          source: dateContext.source,
          originalText: dateContext.originalText,
        },
      };

      // Validate the extracted data
      const validatedData = nutritionDataSchema.parse(nutritionData);
      
      log('info', 'Successfully extracted nutrition data', {
        calories: validatedData.calories,
        confidence: validatedData.confidence,
        source: validatedData.source,
        foodItems: validatedData.foodItems?.length || 0
      });
      
      return validatedData;
    } catch (error) {
      log('error', 'Failed to extract nutrition data:', error);
      return null;
    }
  }

  /**
   * Check if response contains nutrition-related content
   */
  private containsNutritionContent(text: string): boolean {
    const nutritionKeywords = [
      'calories', 'protein', 'carbs', 'carbohydrates', 'fat', 'fiber', 'sugar', 'sodium',
      'kcal', 'cal', 'grams', 'mg', 'nutrition', 'nutrients', 'macros', 'macronutrients',
      'ate', 'eating', 'meal', 'food', 'breakfast', 'lunch', 'dinner', 'snack',
      'burger', 'pizza', 'salad', 'chicken', 'rice', 'pasta', 'bread', 'fruit',
      'vegetable', 'drink', 'water', 'coffee', 'tea', 'juice'
    ];
    
    const lowerText = text.toLowerCase();
    return nutritionKeywords.some(keyword => lowerText.includes(keyword));
  }


  /**
   * Determine confidence level based on various factors
   */
  private determineConfidence(
    responseText: string,
    originalMessage?: string,
    hasImages?: boolean
  ): 'high' | 'medium' | 'low' {
    const lowerResponse = responseText.toLowerCase();
    const lowerOriginal = originalMessage?.toLowerCase() || '';
    
    // High confidence: explicit numbers provided by user or detailed analysis
    if (lowerOriginal.includes('calories') || lowerOriginal.includes('protein') || 
        lowerOriginal.includes('carbs') || lowerOriginal.includes('fat')) {
      return 'high';
    }

    // High confidence: AI provides specific nutritional analysis
    if (lowerResponse.includes('approximately') || lowerResponse.includes('estimated') ||
        lowerResponse.includes('roughly') || lowerResponse.includes('about')) {
      return 'medium';
    }

    // Medium confidence: photo analysis
    if (hasImages) {
      return 'medium';
    }

    // Low confidence: general food mentions without specific values
    return 'low';
  }

  /**
   * Determine the source of nutrition information
   */
  private determineSource(
    responseText: string,
    originalMessage?: string,
    hasImages?: boolean
  ): 'user_provided' | 'ai_inferred' | 'photo_analysis' {
    const lowerOriginal = originalMessage?.toLowerCase() || '';
    
    // User explicitly provided nutrition info
    if (lowerOriginal.includes('calories') || lowerOriginal.includes('protein') || 
        lowerOriginal.includes('carbs') || lowerOriginal.includes('fat')) {
      return 'user_provided';
    }

    // Photo analysis
    if (hasImages) {
      return 'photo_analysis';
    }

    // AI inferred from text
    return 'ai_inferred';
  }


  /**
   * Parse date context from conversation text
   */
  private parseDateContext(
    responseText: string,
    originalMessage?: string,
    timezone?: string
  ): DateContext {
    // Combine both the original message and AI response for better context
    const combinedText = `${originalMessage || ''} ${responseText}`;
    
    // Parse date context using the date parser utility
    const dateContext = DateContextParser.parseDateContext(combinedText, new Date(), timezone);
    
    // Validate the parsed date to ensure it's reasonable
    if (!DateContextParser.validateDateRange(dateContext.date)) {
      log('warn', 'Parsed date is outside reasonable range, using current date', {
        parsedDate: dateContext.date.toISOString(),
        currentDate: new Date().toISOString()
      });
      
      return {
        date: new Date(),
        confidence: 'low',
        source: 'default',
        originalText: combinedText
      };
    }
    
    log('info', 'Successfully parsed date context', {
      date: dateContext.date.toISOString(),
      confidence: dateContext.confidence,
      source: dateContext.source
    });
    
    return dateContext;
  }

  /**
   * Validate nutrition data ranges
   */
  public validateNutritionData(data: NutritionData): boolean {
    try {
      nutritionDataSchema.parse(data);
      return true;
    } catch (error) {
      log('warn', 'Nutrition data validation failed:', error);
      return false;
    }
  }

  /**
   * Update food memories based on extracted nutrition data
   */
  public async updateFoodMemories(
    userId: number,
    nutritionData: NutritionData,
    conversationId: string
  ): Promise<void> {
    try {
      await nutritionMemoryService.updateFoodMemories(userId, nutritionData, conversationId);
      log('info', 'Successfully updated food memories', {
        userId,
        foodItems: nutritionData.foodItems?.length || 0,
        mealType: nutritionData.mealType
      });
    } catch (error) {
      log('error', 'Failed to update food memories:', error);
    }
  }

  /**
   * Get user's dietary information for safety checks
   */
  public async getUserDietaryInfo(userId: number) {
    try {
      return await nutritionMemoryService.getDietaryInfo(userId);
    } catch (error) {
      log('error', 'Failed to get dietary info:', error);
      return { restrictions: [], allergies: [], preferences: [], goals: [] };
    }
  }

}

// Export singleton instance
export const nutritionInferenceService = new NutritionInferenceService();