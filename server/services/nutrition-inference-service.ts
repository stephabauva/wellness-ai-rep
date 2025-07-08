import { z } from 'zod';
import { DateContextParser, type DateContext } from '../utils/date-context-parser.js';

// Helper function to log with service context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[NutritionInferenceService] ${message}`, data || '');
};

// Nutrition data structure based on the plan
export const nutritionDataSchema = z.object({
  calories: z.number().min(0).max(10000).optional(),
  protein: z.number().min(0).max(1000).optional(), // grams
  carbs: z.number().min(0).max(1000).optional(),   // grams
  fat: z.number().min(0).max(1000).optional(),     // grams
  fiber: z.number().min(0).max(200).optional(),    // grams
  sugar: z.number().min(0).max(500).optional(),    // grams
  sodium: z.number().min(0).max(10000).optional(), // mg
  timestamp: z.date(),
  confidence: z.enum(['high', 'medium', 'low']),
  source: z.enum(['user_provided', 'ai_inferred', 'photo_analysis']),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  foodItems: z.array(z.string()).optional(), // List of identified food items
  originalText: z.string().optional(), // Original message text for reference
  dateContext: z.object({
    confidence: z.enum(['high', 'medium', 'low']),
    source: z.enum(['explicit', 'relative', 'inferred', 'default']),
    originalText: z.string().optional(),
  }).optional(), // Date parsing context information
});

export type NutritionData = z.infer<typeof nutritionDataSchema>;

export class NutritionInferenceService {
  constructor() {
    log('info', 'NutritionInferenceService initialized');
  }

  /**
   * Extract nutrition information from AI response text
   * Handles both explicit values and inferred estimates
   * Now includes date context parsing
   */
  public extractNutritionFromText(
    responseText: string,
    originalMessage?: string,
    hasImages?: boolean,
    timezone?: string
  ): NutritionData | null {
    try {
      log('info', 'Extracting nutrition data from AI response');
      
      // Check if response contains nutrition-related content
      if (!this.containsNutritionContent(responseText)) {
        log('info', 'No nutrition content detected in response');
        return null;
      }

      // Extract nutrition values using various patterns
      const nutritionValues = this.parseNutritionValues(responseText);
      
      // Determine confidence based on source and explicitness
      const confidence = this.determineConfidence(responseText, originalMessage, hasImages);
      
      // Determine source based on analysis
      const source = this.determineSource(responseText, originalMessage, hasImages);
      
      // Extract meal type if mentioned
      const mealType = this.extractMealType(responseText, originalMessage);
      
      // Extract food items mentioned
      const foodItems = this.extractFoodItems(responseText, originalMessage);

      // Parse date context from the conversation
      const dateContext = this.parseDateContext(responseText, originalMessage, timezone);

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
   * Parse nutrition values from text using regex patterns
   */
  private parseNutritionValues(text: string): Partial<NutritionData> {
    const values: Partial<NutritionData> = {};
    
    // Calories patterns
    const caloriesPattern = /(\d+(?:\.\d+)?)\s*(?:calories|kcal|cal)/gi;
    const caloriesMatch = text.match(caloriesPattern);
    if (caloriesMatch) {
      const caloriesValue = parseFloat(caloriesMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(caloriesValue)) values.calories = caloriesValue;
    }

    // Protein patterns
    const proteinPattern = /(\d+(?:\.\d+)?)\s*(?:grams?|g)\s*(?:of\s+)?protein/gi;
    const proteinMatch = text.match(proteinPattern);
    if (proteinMatch) {
      const proteinValue = parseFloat(proteinMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(proteinValue)) values.protein = proteinValue;
    }

    // Carbs patterns
    const carbsPattern = /(\d+(?:\.\d+)?)\s*(?:grams?|g)\s*(?:of\s+)?(?:carbs|carbohydrates)/gi;
    const carbsMatch = text.match(carbsPattern);
    if (carbsMatch) {
      const carbsValue = parseFloat(carbsMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(carbsValue)) values.carbs = carbsValue;
    }

    // Fat patterns
    const fatPattern = /(\d+(?:\.\d+)?)\s*(?:grams?|g)\s*(?:of\s+)?fat/gi;
    const fatMatch = text.match(fatPattern);
    if (fatMatch) {
      const fatValue = parseFloat(fatMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(fatValue)) values.fat = fatValue;
    }

    // Fiber patterns
    const fiberPattern = /(\d+(?:\.\d+)?)\s*(?:grams?|g)\s*(?:of\s+)?fiber/gi;
    const fiberMatch = text.match(fiberPattern);
    if (fiberMatch) {
      const fiberValue = parseFloat(fiberMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(fiberValue)) values.fiber = fiberValue;
    }

    // Sugar patterns
    const sugarPattern = /(\d+(?:\.\d+)?)\s*(?:grams?|g)\s*(?:of\s+)?sugar/gi;
    const sugarMatch = text.match(sugarPattern);
    if (sugarMatch) {
      const sugarValue = parseFloat(sugarMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(sugarValue)) values.sugar = sugarValue;
    }

    // Sodium patterns
    const sodiumPattern = /(\d+(?:\.\d+)?)\s*(?:mg|milligrams?)\s*(?:of\s+)?sodium/gi;
    const sodiumMatch = text.match(sodiumPattern);
    if (sodiumMatch) {
      const sodiumValue = parseFloat(sodiumMatch[0].replace(/[^\d.]/g, ''));
      if (!isNaN(sodiumValue)) values.sodium = sodiumValue;
    }

    return values;
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
   * Extract meal type from text
   */
  private extractMealType(
    responseText: string,
    originalMessage?: string
  ): 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined {
    const combinedText = `${responseText} ${originalMessage || ''}`.toLowerCase();
    
    if (combinedText.includes('breakfast')) return 'breakfast';
    if (combinedText.includes('lunch')) return 'lunch';
    if (combinedText.includes('dinner')) return 'dinner';
    if (combinedText.includes('snack')) return 'snack';
    
    return undefined;
  }

  /**
   * Extract food items mentioned in the text
   */
  private extractFoodItems(
    responseText: string,
    originalMessage?: string
  ): string[] {
    const commonFoods = [
      'burger', 'pizza', 'salad', 'chicken', 'rice', 'pasta', 'bread', 'apple', 'banana',
      'sandwich', 'soup', 'eggs', 'cheese', 'yogurt', 'oatmeal', 'cereal', 'toast',
      'potato', 'tomato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'cucumber',
      'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'ham',
      'milk', 'coffee', 'tea', 'juice', 'water', 'soda', 'beer', 'wine',
      'cookie', 'cake', 'ice cream', 'chocolate', 'candy', 'nuts', 'almonds'
    ];
    
    const combinedText = `${responseText} ${originalMessage || ''}`.toLowerCase();
    const foundFoods = commonFoods.filter(food => combinedText.includes(food));
    
    return foundFoods;
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
   * Format nutrition data for storage
   */
  public formatForStorage(data: NutritionData): {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    metadata: {
      confidence: string;
      source: string;
      mealType?: string;
      foodItems?: string[];
      originalText?: string;
      timestamp: string;
      dateContext?: {
        confidence: string;
        source: string;
        originalText?: string;
      };
    };
  } {
    return {
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber,
      sugar: data.sugar,
      sodium: data.sodium,
      metadata: {
        confidence: data.confidence,
        source: data.source,
        mealType: data.mealType,
        foodItems: data.foodItems,
        originalText: data.originalText,
        timestamp: data.timestamp.toISOString(),
        dateContext: data.dateContext,
      },
    };
  }
}

// Export singleton instance
export const nutritionInferenceService = new NutritionInferenceService();