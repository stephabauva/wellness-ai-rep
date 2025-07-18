import type { HealthData, InsertHealthData } from "@shared/schema";

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  metadata: any;
}

export const NUTRITION_COMPONENTS = [
  { key: 'calories', unit: 'kcal' },
  { key: 'protein', unit: 'g' },
  { key: 'carbs', unit: 'g' },
  { key: 'fat', unit: 'g' },
  { key: 'fiber', unit: 'g' },
  { key: 'sugar', unit: 'g' },
  { key: 'sodium', unit: 'mg' }
] as const;

export function createNutritionEntries(
  userId: number,
  nutritionData: NutritionData,
  conversationId?: string
): InsertHealthData[] {
  const nutritionEntries: InsertHealthData[] = [];
  const timestamp = new Date(nutritionData.metadata.timestamp);

  for (const component of NUTRITION_COMPONENTS) {
    const value = nutritionData[component.key as keyof typeof nutritionData];
    if (value !== undefined && typeof value === 'number') {
      nutritionEntries.push({
        userId,
        dataType: component.key,
        value: value.toString(),
        unit: component.unit,
        timestamp,
        source: 'chat_inference',
        category: 'nutrition',
        metadata: {
          ...nutritionData.metadata,
          conversationId,
          extractedFrom: 'ai_chat',
          component: component.key
        }
      });
    }
  }

  return nutritionEntries;
}

export function createNutritionHealthData(
  userId: number,
  nutritionData: NutritionData,
  conversationId: string | undefined,
  idGenerator: () => number
): HealthData[] {
  const nutritionEntries: HealthData[] = [];
  const timestamp = new Date(nutritionData.metadata.timestamp);

  for (const component of NUTRITION_COMPONENTS) {
    const value = nutritionData[component.key as keyof typeof nutritionData];
    if (value !== undefined && typeof value === 'number') {
      nutritionEntries.push({
        id: idGenerator(),
        userId,
        dataType: component.key,
        value: value.toString(),
        unit: component.unit,
        timestamp,
        source: 'chat_inference',
        category: 'nutrition',
        metadata: {
          ...nutritionData.metadata,
          conversationId,
          extractedFrom: 'ai_chat',
          component: component.key
        }
      });
    }
  }

  return nutritionEntries;
}