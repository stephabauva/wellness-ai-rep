import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HealthMetric } from '@/hooks/useHealthDataApi';

interface HeartRateDataPoint {
  day: string;
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  readings: number;
}

interface HeartRateChartProps {
  data: HealthMetric[];
}

export const HeartRateChart: React.FC<HeartRateChartProps> = ({ data }) => {
  // Process heart rate data by day
  const processHeartRateData = (heartRateData: HealthMetric[]): HeartRateDataPoint[] => {
    if (!heartRateData?.length) return [];

    // Group by day
    const groupedByDay = heartRateData.reduce((acc, metric) => {
      const day = new Date(metric.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(parseFloat(metric.value));
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate stats for each day
    return Object.entries(groupedByDay)
      .map(([day, values]) => ({
        day,
        avgHeartRate: Math.round(values.reduce((sum, val) => sum + val, 0) / values.length),
        minHeartRate: Math.min(...values),
        maxHeartRate: Math.max(...values),
        readings: values.length
      }))
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime())
      .slice(-7); // Last 7 days
  };

  const chartData = processHeartRateData(data);

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heart Rate Trends</CardTitle>
          <CardDescription>No heart rate data available for the selected time period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Import health data to see your heart rate trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heart Rate Trends</CardTitle>
        <CardDescription>Daily average, minimum, and maximum heart rate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="chart-responsive">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="day" 
                tickLine={false} 
                axisLine={false} 
                fontSize={12} 
              />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']}
                tickLine={false} 
                axisLine={false} 
                fontSize={12}
                label={{ value: 'BPM', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                labelFormatter={(label) => `Date: ${label}`}
                formatter={(value: number, name: string) => [
                  `${value} BPM`,
                  name === 'avgHeartRate' ? 'Average' :
                  name === 'minHeartRate' ? 'Minimum' : 'Maximum'
                ]}
              />
              
              {/* Reference lines for normal heart rate ranges */}
              <ReferenceLine y={60} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              
              {/* Heart rate lines */}
              <Line 
                type="monotone" 
                dataKey="maxHeartRate" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 3 }}
                name="Maximum"
              />
              <Line 
                type="monotone" 
                dataKey="avgHeartRate" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                name="Average"
              />
              <Line 
                type="monotone" 
                dataKey="minHeartRate" 
                stroke="hsl(var(--secondary-foreground))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--secondary-foreground))', strokeWidth: 2, r: 3 }}
                name="Minimum"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <p className="text-muted-foreground">Total Readings</p>
            <p className="font-semibold">
              {chartData.reduce((sum, day) => sum + day.readings, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Avg Daily</p>
            <p className="font-semibold">
              {Math.round(chartData.reduce((sum, day) => sum + day.avgHeartRate, 0) / chartData.length)} BPM
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Peak</p>
            <p className="font-semibold text-destructive">
              {Math.max(...chartData.map(day => day.maxHeartRate))} BPM
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Lowest</p>
            <p className="font-semibold text-secondary-foreground">
              {Math.min(...chartData.map(day => day.minHeartRate))} BPM
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};