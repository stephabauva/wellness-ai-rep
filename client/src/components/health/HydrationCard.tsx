import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HydrationData {
  consumed: number; // e.g., in Liters or ml
  goal: number; // Target hydration in the same unit as consumed
  unit?: string; // e.g., "L" or "ml"
}

interface HydrationTimelineSegment {
  time: string; // e.g., "Morning", "Afternoon", "Evening"
  status: 'filled' | 'partial' | 'empty'; // To represent consumption level
}

interface HydrationCardProps {
  data: HydrationData;
  timeline?: HydrationTimelineSegment[]; // Optional: for the visual timeline bar
}

const defaultHydrationData: HydrationData = {
  consumed: 0,
  goal: 2,
  unit: 'L',
};

// Example default timeline data, can be adjusted or made dynamic
const defaultTimeline: HydrationTimelineSegment[] = [
  { time: 'Morning', status: 'partial' },
  { time: 'Afternoon', status: 'empty' },
  { time: 'Evening', status: 'empty' },
];


export const HydrationCard: React.FC<HydrationCardProps> = ({ data, timeline }) => {
  const { consumed, goal, unit } = data || defaultHydrationData;
  const displayTimeline = timeline || defaultTimeline;

  const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0; // Cap at 100%
  const remaining = Math.max(goal - consumed, 0);

  const pieData = [
    { name: 'Consumed', value: consumed },
    { name: 'Remaining', value: remaining },
  ];

  const consumedColor = 'hsl(var(--primary))'; // Using primary color for consumed
  const remainingColor = 'hsl(var(--muted))';

  // Map status to colors for the timeline bar
  const getTimelineSegmentColor = (status: HydrationTimelineSegment['status']) => {
    switch (status) {
      case 'filled': return 'hsl(var(--primary))'; // Consumed
      case 'partial': return 'hsl(var(--primary) / 0.6)'; // Partially consumed
      case 'empty': return 'hsl(var(--muted))'; // Not consumed / remaining
      default: return 'hsl(var(--muted))';
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Hydration</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-40 h-40 mb-4"> {/* Ensure consistent sizing */}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55} // Adjusted for a thicker ring
                outerRadius={70}
                paddingAngle={consumed > 0 && remaining > 0 ? 2 : 0} // No padding if full or empty
                dataKey="value"
                stroke="none" // No stroke between pie segments
              >
                <Cell fill={consumedColor} />
                <Cell fill={remainingColor} />
              </Pie>
              {/* <Tooltip /> // Tooltip can be verbose for this simple chart */}
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
            <span className="text-sm text-muted-foreground">
              {consumed.toLocaleString()}/{goal.toLocaleString()}{unit || 'L'}
            </span>
          </div>
        </div>

        {displayTimeline && displayTimeline.length > 0 && (
          <div className="mt-4 w-full px-4"> {/* Added padding for timeline */}
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              {displayTimeline.map(segment => <span key={segment.time}>{segment.time}</span>)}
            </div>
            <div className="flex space-x-1 h-3 rounded-full overflow-hidden bg-muted"> {/* Container for segments */}
              {displayTimeline.map((segment, index) => (
                <div
                  key={index}
                  className="h-full"
                  style={{
                    width: `${100 / displayTimeline.length}%`,
                    backgroundColor: getTimelineSegmentColor(segment.status)
                  }}
                  title={`${segment.time}: ${segment.status}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Remember to drink water consistently throughout the day.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
