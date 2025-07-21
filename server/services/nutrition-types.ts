export interface DailyNutritionSummary {
  date: string; // YYYY-MM-DD format
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  mealBreakdown: {
    breakfast: import('./nutrition-utils').NutritionMealSummary;
    lunch: import('./nutrition-utils').NutritionMealSummary;
    dinner: import('./nutrition-utils').NutritionMealSummary;
    snack: import('./nutrition-utils').NutritionMealSummary;
  };
  entryCount: number;
  lastUpdated: Date;
}

export interface NutritionUpdateRequest {
  userId: number;
  date: Date;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}