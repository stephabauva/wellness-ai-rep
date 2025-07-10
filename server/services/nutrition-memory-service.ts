import { memoryService } from './memory-service.js';
import { type MemoryCategory } from '../../shared/schema.js';
import { type NutritionData } from './nutrition-inference-service.js';

interface FoodMemoryPattern {
  foodItem: string;
  typicalPortion: number;
  nutritionPerPortion: Partial<NutritionData>;
  frequency: number; // how often user eats this
  mealTypes: string[]; // which meals this appears in
  lastSeen: Date;
}

interface DietaryInfo {
  restrictions: string[];
  allergies: string[];
  preferences: string[];
  goals: string[];
}

export class NutritionMemoryService {
  /**
   * Extract and store food-related memories from nutrition data
   */
  async updateFoodMemories(
    userId: number,
    nutritionData: NutritionData,
    conversationId: string
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    // Store meal patterns
    if (nutritionData.mealType && nutritionData.foodItems?.length) {
      promises.push(this.updateMealPatterns(userId, nutritionData, conversationId));
    }

    // Store food preferences based on food items
    if (nutritionData.foodItems?.length) {
      promises.push(this.updateFoodPreferences(userId, nutritionData, conversationId));
    }

    // Store nutrition goals if calories are high confidence
    if (nutritionData.calories && nutritionData.confidence === 'high') {
      promises.push(this.updateNutritionGoals(userId, nutritionData, conversationId));
    }

    await Promise.all(promises);
  }

  /**
   * Update meal pattern memories
   */
  private async updateMealPatterns(
    userId: number,
    nutritionData: NutritionData,
    conversationId: string
  ): Promise<void> {
    const mealPattern = `Typically eats ${nutritionData.foodItems?.join(', ')} for ${nutritionData.mealType}`;
    
    if (nutritionData.calories) {
      const calorieInfo = ` (approximately ${nutritionData.calories} calories)`;
      const fullPattern = mealPattern + calorieInfo;
      
      await memoryService.saveMemoryEntry(userId, fullPattern, {
        category: 'food_diet' as MemoryCategory,
        labels: ['meal-timing', 'pattern'],
        importance_score: 0.7,
        sourceConversationId: conversationId,
        keywords: [...(nutritionData.foodItems || []), nutritionData.mealType || ''].filter(Boolean)
      });
    }
  }

  /**
   * Update food preference memories
   */
  private async updateFoodPreferences(
    userId: number,
    nutritionData: NutritionData,
    conversationId: string
  ): Promise<void> {
    for (const foodItem of nutritionData.foodItems || []) {
      const preference = `Enjoys eating ${foodItem}`;
      
      await memoryService.saveMemoryEntry(userId, preference, {
        category: 'food_diet' as MemoryCategory,
        labels: ['preference'],
        importance_score: 0.6,
        sourceConversationId: conversationId,
        keywords: [foodItem, 'food', 'preference']
      });
    }
  }

  /**
   * Update nutrition goal memories
   */
  private async updateNutritionGoals(
    userId: number,
    nutritionData: NutritionData,
    conversationId: string
  ): Promise<void> {
    const goals: string[] = [];

    if (nutritionData.calories && nutritionData.calories > 2500) {
      goals.push('Appears to have high calorie intake goals');
    } else if (nutritionData.calories && nutritionData.calories < 1500) {
      goals.push('Appears to have weight loss or low calorie goals');
    }

    if (nutritionData.protein && nutritionData.protein > 30) {
      goals.push('Focuses on high protein intake');
    }

    for (const goal of goals) {
      await memoryService.saveMemoryEntry(userId, goal, {
        category: 'goals' as MemoryCategory,
        labels: ['nutrition', 'macro'],
        importance_score: 0.8,
        sourceConversationId: conversationId,
        keywords: ['nutrition', 'goals', 'calories', 'protein']
      });
    }
  }

  /**
   * Store dietary restrictions and allergies
   */
  async updateDietaryRestrictions(
    userId: number,
    restrictions: string[],
    allergies: string[],
    conversationId: string
  ): Promise<void> {
    for (const restriction of restrictions) {
      await memoryService.saveMemoryEntry(userId, `Dietary restriction: ${restriction}`, {
        category: 'food_diet' as MemoryCategory,
        labels: ['restriction'],
        importance_score: 0.9, // High importance for safety
        sourceConversationId: conversationId,
        keywords: ['dietary', 'restriction', restriction.toLowerCase()]
      });
    }

    for (const allergy of allergies) {
      await memoryService.saveMemoryEntry(userId, `Food allergy: ${allergy}`, {
        category: 'food_diet' as MemoryCategory,
        labels: ['allergy', 'restriction'],
        importance_score: 0.95, // Critical importance for safety
        sourceConversationId: conversationId,
        keywords: ['allergy', 'food', allergy.toLowerCase()]
      });
    }
  }

  /**
   * Get user's dietary information from memories
   */
  async getDietaryInfo(userId: number): Promise<DietaryInfo> {
    const foodDietMemories = await memoryService.getUserMemories(userId, 'food_diet' as MemoryCategory);
    const goalMemories = await memoryService.getUserMemories(userId, 'goals' as MemoryCategory);
    
    // Filter by labels
    const dietaryMemories = foodDietMemories.filter(m => m.labels?.includes('restriction') || m.labels?.includes('allergy'));
    const preferenceMemories = foodDietMemories.filter(m => m.labels?.includes('preference'));

    const restrictions: string[] = [];
    const allergies: string[] = [];
    const preferences: string[] = [];
    const goals: string[] = [];

    // Parse dietary restrictions and allergies
    for (const memory of dietaryMemories) {
      if (memory.content.includes('allergy:')) {
        allergies.push(memory.content.replace('Food allergy: ', ''));
      } else if (memory.content.includes('restriction:')) {
        restrictions.push(memory.content.replace('Dietary restriction: ', ''));
      }
    }

    // Parse preferences
    for (const memory of preferenceMemories) {
      if (memory.content.includes('Enjoys eating')) {
        preferences.push(memory.content.replace('Enjoys eating ', ''));
      }
    }

    // Parse goals
    for (const memory of goalMemories) {
      goals.push(memory.content);
    }

    return { restrictions, allergies, preferences, goals };
  }

  /**
   * Get meal patterns for a user
   */
  async getMealPatterns(userId: number): Promise<FoodMemoryPattern[]> {
    const foodDietMemories = await memoryService.getUserMemories(userId, 'food_diet' as MemoryCategory);
    const mealMemories = foodDietMemories.filter(m => m.labels?.includes('meal-timing') || m.labels?.includes('pattern'));
    const patterns: FoodMemoryPattern[] = [];

    for (const memory of mealMemories) {
      // Parse meal pattern from memory content
      const match = memory.content.match(/Typically eats (.+) for (\w+)(?:\s*\(approximately (\d+) calories\))?/);
      if (match) {
        const [, foodItems, mealType, calories] = match;
        patterns.push({
          foodItem: foodItems,
          typicalPortion: 1, // Default portion
          nutritionPerPortion: calories ? { calories: parseInt(calories) } : {},
          frequency: memory.accessCount || 1,
          mealTypes: [mealType],
          lastSeen: new Date(memory.lastAccessed || memory.createdAt || Date.now())
        });
      }
    }

    return patterns;
  }

  /**
   * Enhance nutrition inference with user's memory patterns
   */
  async enhanceNutritionInference(
    userId: number,
    foodItems: string[],
    mealType?: string
  ): Promise<{
    estimatedCalories?: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  }> {
    const patterns = await this.getMealPatterns(userId);
    const dietaryInfo = await getDietaryInfo(userId);

    // Check for matches in meal patterns
    const matchingPatterns = patterns.filter(pattern => 
      foodItems.some(item => pattern.foodItem.toLowerCase().includes(item.toLowerCase())) &&
      (!mealType || pattern.mealTypes.includes(mealType))
    );

    if (matchingPatterns.length > 0) {
      const avgCalories = matchingPatterns.reduce((sum, p) => 
        sum + (p.nutritionPerPortion.calories || 0), 0) / matchingPatterns.length;
      
      return {
        estimatedCalories: avgCalories > 0 ? avgCalories : undefined,
        confidence: 'medium',
        reasoning: `Based on ${matchingPatterns.length} previous meal(s) with similar foods`
      };
    }

    // Check dietary restrictions and preferences
    const hasRestrictions = dietaryInfo.restrictions.some(restriction =>
      foodItems.some(item => item.toLowerCase().includes(restriction.toLowerCase()))
    );

    if (hasRestrictions) {
      return {
        confidence: 'low',
        reasoning: 'Food items may conflict with user dietary restrictions'
      };
    }

    return {
      confidence: 'low',
      reasoning: 'No matching meal patterns found in user history'
    };
  }
}

// Export singleton instance
export const nutritionMemoryService = new NutritionMemoryService();

// Helper function for backward compatibility
export const getDietaryInfo = (userId: number) => nutritionMemoryService.getDietaryInfo(userId);