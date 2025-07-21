import { type NutritionData } from '../types/nutrition-types.js';

/**
 * Parse nutrition values from text using regex patterns
 */
export function parseNutritionValues(text: string): Partial<NutritionData> {
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