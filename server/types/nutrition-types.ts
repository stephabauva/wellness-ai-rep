import { z } from 'zod';

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