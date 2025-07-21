import type { HealthData } from '@shared/schema';

export interface NutritionMealSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  entryCount: number;
}

/**
 * Extract meal type from health data entry metadata
 */
export function extractMealType(entry: HealthData): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  if (entry.metadata && typeof entry.metadata === 'object' && 'mealType' in entry.metadata) {
    const mealType = entry.metadata.mealType;
    if (typeof mealType === 'string' && ['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      return mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack';
    }
  }
  
  // Default to snack if no meal type specified
  return 'snack';
}

/**
 * Create empty meal summary
 */
export function createEmptyMealSummary(): NutritionMealSummary {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    entryCount: 0
  };
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}