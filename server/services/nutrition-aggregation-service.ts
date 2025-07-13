import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '@shared/database/db';
import { healthData, type HealthData } from '@shared/schema';
import { cacheService } from '../../shared/services/cache-service';

// Helper function to log with service context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[NutritionAggregationService] ${message}`, data || '');
};

// Types for aggregated nutrition data
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
    breakfast: NutritionMealSummary;
    lunch: NutritionMealSummary;
    dinner: NutritionMealSummary;
    snack: NutritionMealSummary;
  };
  entryCount: number;
  lastUpdated: Date;
}

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

export class NutritionAggregationService {
  private static readonly CACHE_PREFIX = 'nutrition-aggregation:';
  private static readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    log('info', 'NutritionAggregationService initialized');
  }

  /**
   * Get daily nutrition summary for a user
   */
  public async getDailyNutritionSummary(
    userId: number,
    date: Date
  ): Promise<DailyNutritionSummary> {
    const dateStr = this.formatDate(date);
    const cacheKey = `${NutritionAggregationService.CACHE_PREFIX}daily:${userId}:${dateStr}`;
    
    // Try to get from cache first
    const cached = await cacheService.get<DailyNutritionSummary>(cacheKey);
    if (cached) {
      log('info', 'Returning cached daily nutrition summary', { userId, date: dateStr });
      return cached;
    }

    // Calculate date range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all nutrition entries for the day
    const nutritionEntries = await db
      .select()
      .from(healthData)
      .where(
        and(
          eq(healthData.userId, userId),
          eq(healthData.category, 'nutrition'),
          gte(healthData.timestamp, startOfDay),
          lte(healthData.timestamp, endOfDay)
        )
      )
      .orderBy(desc(healthData.timestamp));

    // Aggregate the data
    const summary = this.aggregateNutritionData(nutritionEntries, dateStr);
    
    // Cache the result
    await cacheService.set(cacheKey, summary, NutritionAggregationService.CACHE_TTL);
    
    log('info', 'Generated daily nutrition summary', { 
      userId, 
      date: dateStr, 
      totalCalories: summary.totalCalories,
      entryCount: summary.entryCount
    });
    
    return summary;
  }

  /**
   * Get nutrition summaries for a date range
   */
  public async getNutritionSummariesByRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<DailyNutritionSummary[]> {
    const summaries: DailyNutritionSummary[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const summary = await this.getDailyNutritionSummary(userId, new Date(currentDate));
      summaries.push(summary);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return summaries;
  }

  /**
   * Update existing nutrition entries for a specific date and meal
   */
  public async updateNutritionEntry(request: NutritionUpdateRequest): Promise<void> {
    const { userId, date, mealType } = request;
    const dateStr = this.formatDate(date);
    
    // Calculate date range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Find existing entries for this date and meal type
    const existingEntries = await db
      .select()
      .from(healthData)
      .where(
        and(
          eq(healthData.userId, userId),
          eq(healthData.category, 'nutrition'),
          gte(healthData.timestamp, startOfDay),
          lte(healthData.timestamp, endOfDay)
        )
      );

    // Filter by meal type if specified
    const filteredEntries = mealType 
      ? existingEntries.filter((entry: any) => 
          entry.metadata && 
          typeof entry.metadata === 'object' && 
          'mealType' in entry.metadata && 
          entry.metadata.mealType === mealType
        )
      : existingEntries;

    // Update each nutrition component
    const updates = [];
    const nutritionComponents = [
      { key: 'calories', value: request.calories },
      { key: 'protein', value: request.protein },
      { key: 'carbs', value: request.carbs },
      { key: 'fat', value: request.fat },
      { key: 'fiber', value: request.fiber },
      { key: 'sugar', value: request.sugar },
      { key: 'sodium', value: request.sodium }
    ];

    for (const component of nutritionComponents) {
      if (component.value !== undefined) {
        const existingEntry = filteredEntries.find((entry: any) => entry.dataType === component.key);
        if (existingEntry) {
          updates.push(
            db.update(healthData)
              .set({ 
                value: component.value.toString(),
                timestamp: new Date() // Update timestamp to show it was modified
              })
              .where(eq(healthData.id, existingEntry.id))
          );
        }
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await Promise.all(updates);
      log('info', 'Updated nutrition entries', { 
        userId, 
        date: dateStr, 
        mealType,
        updatedComponents: updates.length
      });
    }

    // Invalidate cache for this day
    await this.invalidateCache(userId, date);
  }

  /**
   * Get meal-level nutrition breakdown for a specific date
   */
  public async getMealNutritionBreakdown(
    userId: number,
    date: Date
  ): Promise<{ [mealType: string]: NutritionMealSummary }> {
    const summary = await this.getDailyNutritionSummary(userId, date);
    return summary.mealBreakdown;
  }

  /**
   * Get weekly nutrition averages
   */
  public async getWeeklyNutritionAverages(
    userId: number,
    startDate: Date
  ): Promise<{
    averageCalories: number;
    averageProtein: number;
    averageCarbs: number;
    averageFat: number;
    averageFiber: number;
    averageSugar: number;
    averageSodium: number;
    daysWithData: number;
  }> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // 7 days total
    
    const summaries = await this.getNutritionSummariesByRange(userId, startDate, endDate);
    const daysWithData = summaries.filter(s => s.entryCount > 0);
    
    if (daysWithData.length === 0) {
      return {
        averageCalories: 0,
        averageProtein: 0,
        averageCarbs: 0,
        averageFat: 0,
        averageFiber: 0,
        averageSugar: 0,
        averageSodium: 0,
        daysWithData: 0
      };
    }
    
    const totals = daysWithData.reduce((acc, day) => ({
      calories: acc.calories + day.totalCalories,
      protein: acc.protein + day.totalProtein,
      carbs: acc.carbs + day.totalCarbs,
      fat: acc.fat + day.totalFat,
      fiber: acc.fiber + day.totalFiber,
      sugar: acc.sugar + day.totalSugar,
      sodium: acc.sodium + day.totalSodium
    }), {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0
    });
    
    const count = daysWithData.length;
    return {
      averageCalories: Math.round(totals.calories / count),
      averageProtein: Math.round(totals.protein / count),
      averageCarbs: Math.round(totals.carbs / count),
      averageFat: Math.round(totals.fat / count),
      averageFiber: Math.round(totals.fiber / count),
      averageSugar: Math.round(totals.sugar / count),
      averageSodium: Math.round(totals.sodium / count),
      daysWithData: count
    };
  }

  /**
   * Aggregate nutrition data from health data entries
   */
  private aggregateNutritionData(
    entries: HealthData[],
    dateStr: string
  ): DailyNutritionSummary {
    const summary: DailyNutritionSummary = {
      date: dateStr,
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
      mealBreakdown: {
        breakfast: this.createEmptyMealSummary(),
        lunch: this.createEmptyMealSummary(),
        dinner: this.createEmptyMealSummary(),
        snack: this.createEmptyMealSummary()
      },
      entryCount: entries.length,
      lastUpdated: new Date()
    };

    // Process each entry
    for (const entry of entries) {
      const value = parseFloat(entry.value);
      if (isNaN(value)) continue;

      // Determine meal type from metadata
      const mealType = this.extractMealType(entry);
      
      // Add to totals
      switch (entry.dataType) {
        case 'calories':
          summary.totalCalories += value;
          summary.mealBreakdown[mealType].calories += value;
          break;
        case 'protein':
          summary.totalProtein += value;
          summary.mealBreakdown[mealType].protein += value;
          break;
        case 'carbs':
          summary.totalCarbs += value;
          summary.mealBreakdown[mealType].carbs += value;
          break;
        case 'fat':
          summary.totalFat += value;
          summary.mealBreakdown[mealType].fat += value;
          break;
        case 'fiber':
          summary.totalFiber += value;
          summary.mealBreakdown[mealType].fiber += value;
          break;
        case 'sugar':
          summary.totalSugar += value;
          summary.mealBreakdown[mealType].sugar += value;
          break;
        case 'sodium':
          summary.totalSodium += value;
          summary.mealBreakdown[mealType].sodium += value;
          break;
      }
      
      // Increment entry count for the meal
      summary.mealBreakdown[mealType].entryCount++;
    }

    return summary;
  }

  /**
   * Extract meal type from health data entry metadata
   */
  private extractMealType(entry: HealthData): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
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
  private createEmptyMealSummary(): NutritionMealSummary {
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
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Invalidate cache for a specific user and date
   */
  public async invalidateCache(userId: number, date: Date): Promise<void> {
    const dateStr = this.formatDate(date);
    const cacheKey = `${NutritionAggregationService.CACHE_PREFIX}daily:${userId}:${dateStr}`;
    await cacheService.del(cacheKey);
    
    log('info', 'Invalidated nutrition cache', { userId, date: dateStr });
  }

  /**
   * Invalidate all cache for a user
   */
  public async invalidateUserCache(userId: number): Promise<void> {
    const pattern = `${NutritionAggregationService.CACHE_PREFIX}daily:${userId}:*`;
    await cacheService.delPattern(pattern);
    
    log('info', 'Invalidated all nutrition cache for user', { userId });
  }
}

// Export singleton instance
export const nutritionAggregationService = new NutritionAggregationService();