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
  // TODO: Replace hardcoded change, goalValue, progress, status, startValue with dynamic data if available
  // These might come from calculations based on healthData history or user goals.

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Daily Steps"
        value={getLatestMetricValue(healthData, 'steps', "N/A")}
        unit={getLatestMetricUnit(healthData, 'steps', "steps")}
        change={12} // Placeholder
        goalValue={10000} // Placeholder
        progress={parseFloat(getLatestMetricValue(healthData, 'steps', "0")) / 10000 * 100} // Example progress
        icon={<Activity className="h-4 w-4" />}
      />

      <StatCard
        title="Sleep Duration"
        value={getLatestMetricValue(healthData, 'sleep_duration', "N/A")}
        unit={getLatestMetricUnit(healthData, 'sleep_duration', "hours")}
        change={-5} // Placeholder
        goalValue={8} // Placeholder
        progress={parseFloat(getLatestMetricValue(healthData, 'sleep_duration', "0")) / 8 * 100} // Example progress
        icon={<Brain className="h-4 w-4" />}
      />

      <StatCard
        title="Heart Rate"
        value={getLatestMetricValue(healthData, 'heart_rate', "N/A")}
        unit={getLatestMetricUnit(healthData, 'heart_rate', "bpm")}
        status="Normal" // Placeholder - this might need logic based on value ranges
        statusColor="green" // Placeholder
        icon={<Heart className="h-4 w-4" />}
      />

      <StatCard
        title="Current Weight"
        value={getLatestMetricValue(healthData, 'weight', "N/A")}
        unit={getLatestMetricUnit(healthData, 'weight', "lbs")}
        change={-2.5} // Placeholder
        startValue="167.5 lbs" // Placeholder
        goalValue={150} // Placeholder
        icon={<CalendarIcon className="h-4 w-4" />}
      />
    </div>
  );
};
