/**
 * Extract meal type from text
 */
export function extractMealType(
  responseText: string,
  originalMessage?: string
): 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined {
  const combinedText = `${responseText} ${originalMessage || ''}`.toLowerCase();
  
  if (combinedText.includes('breakfast')) return 'breakfast';
  if (combinedText.includes('lunch')) return 'lunch';
  if (combinedText.includes('dinner')) return 'dinner';
  if (combinedText.includes('snack')) return 'snack';
  
  return undefined;
}

/**
 * Extract food items mentioned in the text
 */
export function extractFoodItems(
  responseText: string,
  originalMessage?: string
): string[] {
  const commonFoods = [
    'burger', 'pizza', 'salad', 'chicken', 'rice', 'pasta', 'bread', 'apple', 'banana',
    'sandwich', 'soup', 'eggs', 'cheese', 'yogurt', 'oatmeal', 'cereal', 'toast',
    'potato', 'tomato', 'carrot', 'broccoli', 'spinach', 'lettuce', 'cucumber',
    'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'ham',
    'milk', 'coffee', 'tea', 'juice', 'water', 'soda', 'beer', 'wine',
    'cookie', 'cake', 'ice cream', 'chocolate', 'candy', 'nuts', 'almonds'
  ];
  
  const combinedText = `${responseText} ${originalMessage || ''}`.toLowerCase();
  const foundFoods = commonFoods.filter(food => combinedText.includes(food));
  
  return foundFoods;
}