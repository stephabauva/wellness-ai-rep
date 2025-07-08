import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NutritionAggregationService } from './nutrition-aggregation-service.js';

// Mock the dependencies
vi.mock('./cache-service.js', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delPattern: vi.fn()
  }
}));

vi.mock('../db.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn()
        })
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn()
      })
    })
  }
}));

describe('NutritionAggregationService', () => {
  let service: NutritionAggregationService;
  let mockCacheService: any;
  let mockDb: any;

  beforeEach(async () => {
    service = new NutritionAggregationService();
    mockCacheService = (await import('./cache-service.js')).cacheService;
    mockDb = (await import('../db.js')).db;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('getDailyNutritionSummary', () => {
    it('should return cached data when available', async () => {
      const userId = 1;
      const date = new Date('2024-01-15');
      const cachedSummary = {
        date: '2024-01-15',
        totalCalories: 2000,
        totalProtein: 100,
        totalCarbs: 250,
        totalFat: 67,
        totalFiber: 25,
        totalSugar: 50,
        totalSodium: 2300,
        mealBreakdown: {
          breakfast: { calories: 500, protein: 25, carbs: 60, fat: 15, fiber: 8, sugar: 12, sodium: 400, entryCount: 3 },
          lunch: { calories: 700, protein: 35, carbs: 80, fat: 25, fiber: 10, sugar: 15, sodium: 800, entryCount: 4 },
          dinner: { calories: 600, protein: 30, carbs: 70, fat: 20, fiber: 5, sugar: 10, sodium: 900, entryCount: 3 },
          snack: { calories: 200, protein: 10, carbs: 40, fat: 7, fiber: 2, sugar: 13, sodium: 200, entryCount: 2 }
        },
        entryCount: 12,
        lastUpdated: new Date()
      };

      mockCacheService.get.mockResolvedValue(cachedSummary);

      const result = await service.getDailyNutritionSummary(userId, date);

      expect(result).toEqual(cachedSummary);
      expect(mockCacheService.get).toHaveBeenCalledWith('nutrition-aggregation:daily:1:2024-01-15');
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should fetch and aggregate data when not cached', async () => {
      const userId = 1;
      const date = new Date('2024-01-15');
      const mockNutritionEntries = [
        {
          id: 1,
          userId: 1,
          dataType: 'calories',
          value: '500',
          unit: 'kcal',
          timestamp: new Date('2024-01-15T08:00:00Z'),
          source: 'chat_inference',
          category: 'nutrition',
          metadata: { mealType: 'breakfast' }
        },
        {
          id: 2,
          userId: 1,
          dataType: 'protein',
          value: '25',
          unit: 'g',
          timestamp: new Date('2024-01-15T08:00:00Z'),
          source: 'chat_inference',
          category: 'nutrition',
          metadata: { mealType: 'breakfast' }
        },
        {
          id: 3,
          userId: 1,
          dataType: 'calories',
          value: '700',
          unit: 'kcal',
          timestamp: new Date('2024-01-15T12:00:00Z'),
          source: 'chat_inference',
          category: 'nutrition',
          metadata: { mealType: 'lunch' }
        }
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockNutritionEntries)
          })
        })
      });

      const result = await service.getDailyNutritionSummary(userId, date);

      expect(result.date).toBe('2024-01-15');
      expect(result.totalCalories).toBe(1200);
      expect(result.totalProtein).toBe(25);
      expect(result.mealBreakdown.breakfast.calories).toBe(500);
      expect(result.mealBreakdown.lunch.calories).toBe(700);
      expect(result.entryCount).toBe(3);
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should handle entries without meal type metadata', async () => {
      const userId = 1;
      const date = new Date('2024-01-15');
      const mockNutritionEntries = [
        {
          id: 1,
          userId: 1,
          dataType: 'calories',
          value: '300',
          unit: 'kcal',
          timestamp: new Date('2024-01-15T15:00:00Z'),
          source: 'chat_inference',
          category: 'nutrition',
          metadata: {} // No meal type
        }
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockNutritionEntries)
          })
        })
      });

      const result = await service.getDailyNutritionSummary(userId, date);

      expect(result.mealBreakdown.snack.calories).toBe(300); // Should default to snack
      expect(result.totalCalories).toBe(300);
    });
  });

  describe('getNutritionSummariesByRange', () => {
    it('should return summaries for date range', async () => {
      const userId = 1;
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-16');

      // Mock getDailyNutritionSummary to return different summaries for each day
      const mockSummary1 = {
        date: '2024-01-15',
        totalCalories: 2000,
        totalProtein: 100,
        totalCarbs: 250,
        totalFat: 67,
        totalFiber: 25,
        totalSugar: 50,
        totalSodium: 2300,
        mealBreakdown: {
          breakfast: { calories: 500, protein: 25, carbs: 60, fat: 15, fiber: 8, sugar: 12, sodium: 400, entryCount: 3 },
          lunch: { calories: 700, protein: 35, carbs: 80, fat: 25, fiber: 10, sugar: 15, sodium: 800, entryCount: 4 },
          dinner: { calories: 600, protein: 30, carbs: 70, fat: 20, fiber: 5, sugar: 10, sodium: 900, entryCount: 3 },
          snack: { calories: 200, protein: 10, carbs: 40, fat: 7, fiber: 2, sugar: 13, sodium: 200, entryCount: 2 }
        },
        entryCount: 12,
        lastUpdated: new Date()
      };

      const mockSummary2 = {
        date: '2024-01-16',
        totalCalories: 1800,
        totalProtein: 90,
        totalCarbs: 220,
        totalFat: 60,
        totalFiber: 20,
        totalSugar: 45,
        totalSodium: 2100,
        mealBreakdown: {
          breakfast: { calories: 400, protein: 20, carbs: 50, fat: 12, fiber: 6, sugar: 10, sodium: 300, entryCount: 2 },
          lunch: { calories: 650, protein: 32, carbs: 75, fat: 22, fiber: 8, sugar: 12, sodium: 700, entryCount: 3 },
          dinner: { calories: 550, protein: 28, carbs: 65, fat: 18, fiber: 4, sugar: 8, sodium: 800, entryCount: 3 },
          snack: { calories: 200, protein: 10, carbs: 30, fat: 8, fiber: 2, sugar: 15, sodium: 300, entryCount: 2 }
        },
        entryCount: 10,
        lastUpdated: new Date()
      };

      // Mock cache to return different summaries
      mockCacheService.get
        .mockResolvedValueOnce(mockSummary1)
        .mockResolvedValueOnce(mockSummary2);

      const result = await service.getNutritionSummariesByRange(userId, startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[1].date).toBe('2024-01-16');
      expect(result[0].totalCalories).toBe(2000);
      expect(result[1].totalCalories).toBe(1800);
    });
  });

  describe('updateNutritionEntry', () => {
    it('should update existing nutrition entries', async () => {
      const request = {
        userId: 1,
        date: new Date('2024-01-15'),
        mealType: 'breakfast' as const,
        calories: 600,
        protein: 30
      };

      const mockExistingEntries = [
        {
          id: 1,
          userId: 1,
          dataType: 'calories',
          value: '500',
          unit: 'kcal',
          timestamp: new Date('2024-01-15T08:00:00Z'),
          source: 'chat_inference',
          category: 'nutrition',
          metadata: { mealType: 'breakfast' }
        },
        {
          id: 2,
          userId: 1,
          dataType: 'protein',
          value: '25',
          unit: 'g',
          timestamp: new Date('2024-01-15T08:00:00Z'),
          source: 'chat_inference',
          category: 'nutrition',
          metadata: { mealType: 'breakfast' }
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockExistingEntries)
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      });

      await service.updateNutritionEntry(request);

      expect(mockDb.update).toHaveBeenCalledTimes(2); // Once for calories, once for protein
      expect(mockCacheService.del).toHaveBeenCalledWith('nutrition-aggregation:daily:1:2024-01-15');
    });

    it('should handle entries without meal type filter', async () => {
      const request = {
        userId: 1,
        date: new Date('2024-01-15'),
        // No mealType specified
        calories: 600
      };

      const mockExistingEntries = [
        {
          id: 1,
          userId: 1,
          dataType: 'calories',
          value: '500',
          unit: 'kcal',
          timestamp: new Date('2024-01-15T08:00:00Z'),
          source: 'chat_inference',
          category: 'nutrition',
          metadata: { mealType: 'breakfast' }
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockExistingEntries)
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      });

      await service.updateNutritionEntry(request);

      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('getWeeklyNutritionAverages', () => {
    it('should calculate weekly averages correctly', async () => {
      const userId = 1;
      const startDate = new Date('2024-01-15');
      
      // Mock daily summaries for a week
      const mockSummaries = [
        { date: '2024-01-15', totalCalories: 2000, totalProtein: 100, totalCarbs: 250, totalFat: 67, totalFiber: 25, totalSugar: 50, totalSodium: 2300, entryCount: 12 },
        { date: '2024-01-16', totalCalories: 1800, totalProtein: 90, totalCarbs: 220, totalFat: 60, totalFiber: 20, totalSugar: 45, totalSodium: 2100, entryCount: 10 },
        { date: '2024-01-17', totalCalories: 2200, totalProtein: 110, totalCarbs: 270, totalFat: 73, totalFiber: 30, totalSugar: 55, totalSodium: 2400, entryCount: 14 },
        { date: '2024-01-18', totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, totalSugar: 0, totalSodium: 0, entryCount: 0 }, // No data day
        { date: '2024-01-19', totalCalories: 1900, totalProtein: 95, totalCarbs: 230, totalFat: 63, totalFiber: 22, totalSugar: 48, totalSodium: 2200, entryCount: 11 },
        { date: '2024-01-20', totalCalories: 2100, totalProtein: 105, totalCarbs: 260, totalFat: 70, totalFiber: 28, totalSugar: 52, totalSodium: 2350, entryCount: 13 },
        { date: '2024-01-21', totalCalories: 1950, totalProtein: 98, totalCarbs: 240, totalFat: 65, totalFiber: 24, totalSugar: 49, totalSodium: 2250, entryCount: 12 }
      ];

      // Mock cache to return the summaries
      mockCacheService.get
        .mockResolvedValueOnce(mockSummaries[0])
        .mockResolvedValueOnce(mockSummaries[1])
        .mockResolvedValueOnce(mockSummaries[2])
        .mockResolvedValueOnce(mockSummaries[3])
        .mockResolvedValueOnce(mockSummaries[4])
        .mockResolvedValueOnce(mockSummaries[5])
        .mockResolvedValueOnce(mockSummaries[6]);

      const result = await service.getWeeklyNutritionAverages(userId, startDate);

      // Should exclude the day with no data (2024-01-18)
      expect(result.daysWithData).toBe(6);
      expect(result.averageCalories).toBe(Math.round((2000 + 1800 + 2200 + 1900 + 2100 + 1950) / 6));
      expect(result.averageProtein).toBe(Math.round((100 + 90 + 110 + 95 + 105 + 98) / 6));
      expect(result.averageCarbs).toBe(Math.round((250 + 220 + 270 + 230 + 260 + 240) / 6));
    });

    it('should handle week with no data', async () => {
      const userId = 1;
      const startDate = new Date('2024-01-15');
      
      // Mock empty summaries for a week
      const mockSummaries = Array(7).fill({
        date: '2024-01-15',
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSugar: 0,
        totalSodium: 0,
        entryCount: 0
      });

      mockCacheService.get
        .mockResolvedValueOnce(mockSummaries[0])
        .mockResolvedValueOnce(mockSummaries[1])
        .mockResolvedValueOnce(mockSummaries[2])
        .mockResolvedValueOnce(mockSummaries[3])
        .mockResolvedValueOnce(mockSummaries[4])
        .mockResolvedValueOnce(mockSummaries[5])
        .mockResolvedValueOnce(mockSummaries[6]);

      const result = await service.getWeeklyNutritionAverages(userId, startDate);

      expect(result.daysWithData).toBe(0);
      expect(result.averageCalories).toBe(0);
      expect(result.averageProtein).toBe(0);
      expect(result.averageCarbs).toBe(0);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache for specific user and date', async () => {
      const userId = 1;
      const date = new Date('2024-01-15');

      await service.invalidateCache(userId, date);

      expect(mockCacheService.del).toHaveBeenCalledWith('nutrition-aggregation:daily:1:2024-01-15');
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all cache for a user', async () => {
      const userId = 1;

      await service.invalidateUserCache(userId);

      expect(mockCacheService.delPattern).toHaveBeenCalledWith('nutrition-aggregation:daily:1:*');
    });
  });
});