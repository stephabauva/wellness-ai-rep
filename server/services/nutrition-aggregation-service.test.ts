import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the dependencies first
vi.mock('../../shared/services/cache-service.js', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delPattern: vi.fn()
  }
}));

vi.mock('../../shared/database/db.js', () => ({
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

// Import the modules after mocking
import { NutritionAggregationService } from './nutrition-aggregation-service.js';
import { 
  createBreakfastEntry,
  createLunchEntry,
  createProteinEntry,
  createDailySummaryMock,
  createWeeklySummaryMocks
} from './nutrition-aggregation-test-utils.js';

describe('NutritionAggregationService', () => {
  let service: NutritionAggregationService;
  let mockCacheService: any;
  let mockDb: any;

  beforeEach(async () => {
    service = new NutritionAggregationService();
    mockCacheService = (await import('../../shared/services/cache-service.js')).cacheService;
    mockDb = (await import('../../shared/database/db.js')).db;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('getDailyNutritionSummary', () => {
    it('should return cached data when available', async () => {
      const userId = 1;
      const date = new Date('2024-01-15');
      const cachedSummary = createDailySummaryMock();

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
        createBreakfastEntry(),
        createProteinEntry(),
        createLunchEntry()
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
      const mockSummary1 = createDailySummaryMock('2024-01-15');
      const mockSummary2 = createDailySummaryMock('2024-01-16', {
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
        entryCount: 10
      });

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
        createBreakfastEntry(),
        createProteinEntry()
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
        createBreakfastEntry()
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
      const mockSummaries = createWeeklySummaryMocks();

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