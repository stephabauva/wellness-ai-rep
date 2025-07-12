import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NutritionItem {
  name: string;
  value: number;
  goal: number;
  unit?: string; // e.g., 'g' for grams, 'kcal' for calories
  percent?: number; // Optional, can be calculated if not provided
  color?: string; // Optional, for specific bar color
}

interface NutritionSummaryProps {
  data: NutritionItem[]; // Expects pre-processed data
}

const defaultNutritionData: NutritionItem[] = [
  { name: 'Protein', value: 0, goal: 100, unit: 'g', color: 'hsl(var(--primary))' },
  { name: 'Carbs', value: 0, goal: 250, unit: 'g', color: 'hsl(var(--primary))' },
  { name: 'Fat', value: 0, goal: 70, unit: 'g', color: 'hsl(var(--primary))' },
  { name: 'Fiber', value: 0, goal: 30, unit: 'g', color: 'hsl(var(--primary))' },
  { name: 'Calories', value: 0, goal: 2000, unit: 'kcal', color: 'hsl(var(--primary))'},
  { name: 'Sugar', value: 0, goal: 50, unit: 'g', color: 'hsl(var(--custom-purple-500))' }, // Example custom color
];


export const NutritionSummary: React.FC<NutritionSummaryProps> = ({ data }) => {
  const summaryData = data && data.length > 0 ? data : defaultNutritionData;

  return (
    <Card className="lg:col-span-2"> {/* Assuming it might span 2 columns in a grid */}
      <CardHeader>
        <CardTitle>Nutrition Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summaryData.map((item) => {
            const displayPercent = item.percent !== undefined ? item.percent : (item.value / item.goal) * 100;
            const itemUnit = item.unit || 'g'; // Default to 'g' if unit is not specified

            return (
              <div key={item.name} className="border border-border rounded-lg p-3 sm:p-4"> {/* Adjusted padding */}
                <h4 className="text-sm font-medium text-muted-foreground mb-1 truncate" title={item.name}>{item.name}</h4>
                <div className="flex justify-between items-baseline"> {/* items-baseline for better alignment */}
                  <p className="text-lg font-semibold">
                    {item.value.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-0.5">{itemUnit}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    / {item.goal.toLocaleString()}{itemUnit}
                  </p>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden"> {/* Added overflow-hidden */}
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(displayPercent, 100)}%`, // Cap at 100% for display
                      backgroundColor: item.color || 'hsl(var(--primary))'
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
