/**
 * Memory utilities and helper functions
 * @used-by memory/MemorySection
 */

export interface SmartDefault {
  content: string;
  category: string;
  importance: string;
  timestamp: string;
  frequency: number;
}

export interface PresetButton {
  id: string;
  label: string;
  content: string;
  category: string;
  importance: string;
  icon: string;
  timeContext?: string[];
}

export const healthPresets: PresetButton[] = [
  {
    id: 'morning-routine',
    label: 'Morning Routine',
    content: 'I prefer to exercise in the morning',
    category: 'preferences',
    importance: 'medium',
    icon: '🌅',
    timeContext: ['morning']
  },
  {
    id: 'dietary-restriction',
    label: 'Dietary Restriction',
    content: 'I am allergic to',
    category: 'food_diet',
    importance: 'high',
    icon: '🚫',
  },
  {
    id: 'fitness-goal',
    label: 'Fitness Goal',
    content: 'My goal is to',
    category: 'goals',
    importance: 'high',
    icon: '🎯',
  },
  {
    id: 'injury-limitation',
    label: 'Injury/Limitation',
    content: 'I have a injury/limitation with my',
    category: 'personal_context',
    importance: 'high',
    icon: '⚕️',
  },
  {
    id: 'food-preference',
    label: 'Food Preference',
    content: 'I really enjoy eating',
    category: 'food_diet',
    importance: 'medium',
    icon: '😋',
  },
  {
    id: 'workout-preference',
    label: 'Workout Preference',
    content: 'I prefer',
    category: 'preferences',
    importance: 'medium',
    icon: '💪',
  },
  {
    id: 'health-condition',
    label: 'Health Condition',
    content: 'I have been diagnosed with',
    category: 'personal_context',
    importance: 'high',
    icon: '🏥',
  }
];

export function getTimeContext(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function getSmartDefaults(): SmartDefault[] {
  const stored = localStorage.getItem('memorySmartDefaults');
  return stored ? JSON.parse(stored) : [];
}

export function saveSmartDefault(memory: Omit<SmartDefault, 'timestamp' | 'frequency'>) {
  const defaults = getSmartDefaults();
  const existing = defaults.find(d => 
    d.content === memory.content && 
    d.category === memory.category
  );
  
  if (existing) {
    existing.frequency += 1;
    existing.timestamp = new Date().toISOString();
  } else {
    defaults.unshift({
      ...memory,
      timestamp: new Date().toISOString(),
      frequency: 1
    });
  }
  
  // Keep only top 20 most frequent
  defaults.sort((a, b) => b.frequency - a.frequency);
  defaults.splice(20);
  
  localStorage.setItem('memorySmartDefaults', JSON.stringify(defaults));
}

export function getRecentValues(field: 'content' | 'category' | 'importance', limit = 5): string[] {
  const defaults = getSmartDefaults();
  return [...new Set(defaults.map(d => d[field]).filter(Boolean))].slice(0, limit);
}

export function getContextualPresets(): PresetButton[] {
  const timeContext = getTimeContext();
  return healthPresets.filter(preset => 
    !preset.timeContext || preset.timeContext.includes(timeContext)
  );
}