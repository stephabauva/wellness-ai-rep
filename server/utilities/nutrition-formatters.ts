import { type NutritionData } from '../types/nutrition-types.js';

/**
 * Format nutrition data for storage
 */
export function formatForStorage(data: NutritionData): {
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