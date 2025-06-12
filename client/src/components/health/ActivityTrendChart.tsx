import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define a type for the chart data
interface ActivityDataPoint {
  day: string;
  steps?: number; // Optional: data might not always be available
  active?: number; // Active minutes
  calories?: number;
}

interface ActivityTrendChartProps {
  data: ActivityDataPoint[]; // Expects pre-processed data for the chart
}

export const ActivityTrendChart: React.FC<ActivityTrendChartProps> = ({ data }) => {
  // Default data if none is provided, to prevent chart errors and show structure
  const defaultData: ActivityDataPoint[] = [
    { day: 'Mon', steps: 0, active: 0 },
    { day: 'Tue', steps: 0, active: 0 },
    { day: 'Wed', steps: 0, active: 0 },
    { day: 'Thu', steps: 0, active: 0 },
    { day: 'Fri', steps: 0, active: 0 },
    { day: 'Sat', steps: 0, active: 0 },
    { day: 'Sun', steps: 0, active: 0 },
  ];

  const chartData = data && data.length > 0 ? data : defaultData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Activity Trend</CardTitle>
        <CardDescription>Steps and active minutes comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="chart-responsive"> {/* Use standardized chart sizing */}
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }} // Adjusted margins
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--secondary-foreground))" axisLine={false} tickLine={false} fontSize={12} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="steps" name="Steps" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={10}/>
              <Bar yAxisId="right" dataKey="active" name="Active Minutes" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 0, 0]} barSize={10} />
              {/* Removed 'calories' Bar for simplicity to match original two Y-axes, can be added back if needed */}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
