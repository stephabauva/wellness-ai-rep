import { nutritionAggregationService } from "../../server/services/nutrition-aggregation-service.js";
import { type DailyNutritionSummary, type NutritionUpdateRequest } from "../../server/services/nutrition-types.js";
import { type NutritionMealSummary } from "../../server/services/nutrition-utils.js";

/**
 * Shared nutrition aggregation methods that delegate to nutritionAggregationService
 * Used by both MemStorage and DatabaseStorage to avoid code duplication
 */
export class NutritionDelegationMixin {
  async getDailyNutritionSummary(userId: number, date: Date): Promise<DailyNutritionSummary> {
    return await nutritionAggregationService.getDailyNutritionSummary(userId, date);
  }

  async getNutritionSummariesByRange(userId: number, startDate: Date, endDate: Date): Promise<DailyNutritionSummary[]> {
    return await nutritionAggregationService.getNutritionSummariesByRange(userId, startDate, endDate);
  }

  async updateNutritionEntry(request: NutritionUpdateRequest): Promise<void> {
    await nutritionAggregationService.updateNutritionEntry(request);
  }

  async getMealNutritionBreakdown(userId: number, date: Date): Promise<{ [mealType: string]: NutritionMealSummary }> {
    return await nutritionAggregationService.getMealNutritionBreakdown(userId, date);
  }

  async getWeeklyNutritionAverages(userId: number, startDate: Date): Promise<{
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
    averageFiber: number;
    averageSugar: number;
    averageSodium: number;
    daysWithData: number;
  }> {
    return await nutritionAggregationService.getWeeklyNutritionAverages(userId, startDate);
  }
}