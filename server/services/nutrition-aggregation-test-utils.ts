/**
 * Test utilities and mock configurations for nutrition aggregation service tests
 * Pure mock setup with no side effects
 */
import { vi } from 'vitest';

/**
 * Mock cache service configuration
 */
export const createMockCacheService = () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  delPattern: vi.fn()
});

/**
 * Mock database configuration  
 */
export const createMockDb = () => ({
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
});

/**
 * Sample nutrition entry for breakfast  
 */
export const createBreakfastEntry = (overrides = {}) => ({
  id: 1,
  userId: 1,
  dataType: 'calories',
  value: '500',
  unit: 'kcal',
  timestamp: new Date('2024-01-15T08:00:00Z'),
  source: 'chat_inference',
  category: 'nutrition',
  metadata: { mealType: 'breakfast' },
  ...overrides
});

/**
 * Sample nutrition entry for lunch
 */
export const createLunchEntry = (overrides = {}) => ({
  id: 3,
  userId: 1,
  dataType: 'calories',
  value: '700',
  unit: 'kcal',
  timestamp: new Date('2024-01-15T12:00:00Z'),
  source: 'chat_inference',
  category: 'nutrition',
  metadata: { mealType: 'lunch' },
  ...overrides
});

/**
 * Sample protein entry for breakfast
 */
export const createProteinEntry = (overrides = {}) => ({
  id: 2,
  userId: 1,
  dataType: 'protein',
  value: '25',
  unit: 'g',
  timestamp: new Date('2024-01-15T08:00:00Z'),
  source: 'chat_inference',
  category: 'nutrition',
  metadata: { mealType: 'breakfast' },
  ...overrides
});

/**
 * Complete daily nutrition summary mock data
 */
export const createDailySummaryMock = (date = '2024-01-15', overrides = {}) => ({
  date,
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
  lastUpdated: new Date(),
  ...overrides
});

/**
 * Weekly summary mock data for testing averages
 */
export const createWeeklySummaryMocks = () => [
  { date: '2024-01-15', totalCalories: 2000, totalProtein: 100, totalCarbs: 250, totalFat: 67, totalFiber: 25, totalSugar: 50, totalSodium: 2300, entryCount: 12 },
  { date: '2024-01-16', totalCalories: 1800, totalProtein: 90, totalCarbs: 220, totalFat: 60, totalFiber: 20, totalSugar: 45, totalSodium: 2100, entryCount: 10 },
  { date: '2024-01-17', totalCalories: 2200, totalProtein: 110, totalCarbs: 270, totalFat: 73, totalFiber: 30, totalSugar: 55, totalSodium: 2400, entryCount: 14 },
  { date: '2024-01-18', totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, totalFiber: 0, totalSugar: 0, totalSodium: 0, entryCount: 0 }, // No data day
  { date: '2024-01-19', totalCalories: 1900, totalProtein: 95, totalCarbs: 230, totalFat: 63, totalFiber: 22, totalSugar: 48, totalSodium: 2200, entryCount: 11 },
  { date: '2024-01-20', totalCalories: 2100, totalProtein: 105, totalCarbs: 260, totalFat: 70, totalFiber: 28, totalSugar: 52, totalSodium: 2350, entryCount: 13 },
  { date: '2024-01-21', totalCalories: 1950, totalProtein: 98, totalCarbs: 240, totalFat: 65, totalFiber: 24, totalSugar: 49, totalSodium: 2250, entryCount: 12 }
];