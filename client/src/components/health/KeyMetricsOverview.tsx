import React from 'react';
import { StatCard } from '@/components/ui/stat-card'; // Assuming StatCard is a shared UI component
import { HealthMetric } from '@/hooks/useHealthDataApi'; // Import the HealthMetric type
import { Activity, Brain, Heart, Calendar as CalendarIcon } from 'lucide-react'; // Renamed Calendar to CalendarIcon

interface KeyMetricsOverviewProps {
  healthData: HealthMetric[] | undefined | null; // Can be undefined while loading or null if no data
}

// Helper function to get the latest value for a specific metric type
const getLatestMetricValue = (
  metrics: HealthMetric[] | undefined | null,
  dataType: string,
  defaultValue: string = "0"
): string => {
  if (!metrics) return defaultValue;
  const metric = metrics
    .filter(m => m.dataType === dataType)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  return metric?.value || defaultValue;
};

const getLatestMetricUnit = (
  metrics: HealthMetric[] | undefined | null,
  dataType: string,
  defaultUnit: string = ""
): string => {
  if (!metrics) return defaultUnit;
   const metric = metrics
    .filter(m => m.dataType === dataType)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  return metric?.unit || defaultUnit;
}

export const KeyMetricsOverview: React.FC<KeyMetricsOverviewProps> = ({ healthData }) => {
  // Helper function to calculate percentage change between recent values
  const calculateChange = (dataType: string): number | undefined => {
    if (!healthData) return undefined;
    const metrics = healthData
      .filter(m => m.dataType === dataType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (metrics.length < 2) return undefined;
    
    const current = parseFloat(metrics[0].value);
    const previous = parseFloat(metrics[1].value);
    
    if (previous === 0) return undefined;
    return ((current - previous) / previous) * 100;
  };

  // Helper function to calculate progress towards goal
  const calculateProgress = (dataType: string, goal: number): number | undefined => {
    if (!healthData) return undefined;
    const value = parseFloat(getLatestMetricValue(healthData, dataType, "0"));
    if (value === 0) return undefined;
    return Math.min((value / goal) * 100, 100);
  };

  // Helper function to determine heart rate status
  const getHeartRateStatus = (value: string): { status?: string; statusColor?: 'green' | 'yellow' | 'red' } => {
    if (value === "N/A") return {};
    const hr = parseFloat(value);
    if (hr < 60) return { status: "Low", statusColor: "yellow" };
    if (hr > 100) return { status: "High", statusColor: "red" };
    return { status: "Normal", statusColor: "green" };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Daily Steps"
        value={getLatestMetricValue(healthData, 'steps', "N/A")}
        unit={getLatestMetricUnit(healthData, 'steps', "steps")}
        change={calculateChange('steps')}
        goalValue={healthData && getLatestMetricValue(healthData, 'steps') !== "N/A" ? 10000 : undefined}
        progress={calculateProgress('steps', 10000)}
        icon={<Activity className="h-4 w-4" />}
      />

      <StatCard
        title="Sleep Duration"
        value={getLatestMetricValue(healthData, 'sleep_duration', "N/A")}
        unit={getLatestMetricUnit(healthData, 'sleep_duration', "hours")}
        change={calculateChange('sleep_duration')}
        goalValue={healthData && getLatestMetricValue(healthData, 'sleep_duration') !== "N/A" ? 8 : undefined}
        progress={calculateProgress('sleep_duration', 8)}
        icon={<Brain className="h-4 w-4" />}
      />

      <StatCard
        title="Heart Rate"
        value={getLatestMetricValue(healthData, 'heart_rate', "N/A")}
        unit={getLatestMetricUnit(healthData, 'heart_rate', "bpm")}
        {...getHeartRateStatus(getLatestMetricValue(healthData, 'heart_rate', "N/A"))}
        icon={<Heart className="h-4 w-4" />}
      />

      <StatCard
        title="Current Weight"
        value={getLatestMetricValue(healthData, 'weight', "N/A")}
        unit={getLatestMetricUnit(healthData, 'weight', "lbs")}
        change={calculateChange('weight')}
        icon={<CalendarIcon className="h-4 w-4" />}
      />
    </div>
  );
};
