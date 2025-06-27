import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define a type for the chart data
interface SleepDataPoint {
  day: string;
  deep?: number;
  light?: number;
  rem?: number;
  total?: number; // Optional: if you want to show total sleep as well
}

interface SleepQualityChartProps {
  data: SleepDataPoint[]; // Expects pre-processed data for the chart
}

export const SleepQualityChart: React.FC<SleepQualityChartProps> = ({ data }) => {
  const defaultData: SleepDataPoint[] = [
    { day: 'Mon', deep: 0, light: 0, rem: 0 },
    { day: 'Tue', deep: 0, light: 0, rem: 0 },
    { day: 'Wed', deep: 0, light: 0, rem: 0 },
    { day: 'Thu', deep: 0, light: 0, rem: 0 },
    { day: 'Fri', deep: 0, light: 0, rem: 0 },
    { day: 'Sat', deep: 0, light: 0, rem: 0 },
    { day: 'Sun', deep: 0, light: 0, rem: 0 },
  ];

  const chartData = data && data.length > 0 ? data : defaultData;

  // Colors from the original implementation (approximated)
  const deepSleepColor = "hsl(var(--secondary))"; // e.g. a purple or dark blue
  const lightSleepColor = "hsl(var(--secondary) / 0.6)"; // lighter shade of secondary
  const remSleepColor = "hsl(271 81% 56%)"; // A distinct color, e.g. a vibrant purple

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sleep Quality</CardTitle>
        <CardDescription>Deep, light, and REM sleep patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: '400px', minWidth: '300px', minHeight: '300px' }}>
          <ResponsiveContainer width={300} height={400} minWidth={300} minHeight={400}>
            <BarChart
              width={300}
              height={400}
              data={chartData}
              margin={{ top: 5, right: 20, left: -20, bottom: 5 }} // Adjusted margins
              stackOffset="expand" // This creates a 100% stacked bar chart effect
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={12}
                tickFormatter={(value) => `${Math.round(value * 100)}%`} // Format ticks as percentages
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                }}
                formatter={(value: number, name: string) => [`${(value * 100).toFixed(0)}%`, name]} // Format tooltip values
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
              <Bar dataKey="deep" name="Deep Sleep" stackId="a" fill={deepSleepColor} barSize={15} />
              <Bar dataKey="light" name="Light Sleep" stackId="a" fill={lightSleepColor} barSize={15} />
              <Bar dataKey="rem" name="REM Sleep" stackId="a" fill={remSleepColor} barSize={15} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
