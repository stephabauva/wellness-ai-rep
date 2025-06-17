import React from 'react';
import { StatCard } from '@/components/ui/stat-card'; // Assuming StatCard is a shared UI component
import { HealthMetric } from '@/hooks/useHealthDataApi'; // Import the HealthMetric type
import { Activity, Brain, Heart, Calendar as CalendarIcon, Zap, Moon, Stethoscope, Droplets, Users, Shield, Eye } from 'lucide-react'; // Renamed Calendar to CalendarIcon
import { useQuery } from '@tanstack/react-query';

interface KeyMetricsOverviewProps {
  healthData: HealthMetric[] | undefined | null; // Can be undefined while loading or null if no data
}

interface MetricsVisibilitySettings {
  visible_categories: string[];
  hidden_categories: string[];
  dashboard_preferences: {
    visible_metrics: string[];
    hidden_metrics: string[];
    metric_order: string[];
  };
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
  // Get current visibility settings
  const { data: visibilitySettings } = useQuery({
    queryKey: ['/api/health-consent/visibility'],
    queryFn: async (): Promise<MetricsVisibilitySettings> => {
      const response = await fetch('/api/health-consent/visibility');
      if (!response.ok) throw new Error('Failed to fetch visibility settings');
      return response.json();
    },
  });

  // Default settings for new users
  const defaultSettings: MetricsVisibilitySettings = {
    visible_categories: ['Activity', 'Cardiovascular', 'Sleep'],
    hidden_categories: ['Medical', 'Reproductive Health', 'Integration'],
    dashboard_preferences: {
      visible_metrics: ['steps', 'heart_rate', 'sleep_duration', 'active_energy'],
      hidden_metrics: [],
      metric_order: ['steps', 'heart_rate', 'sleep_duration', 'active_energy']
    }
  };

  const currentSettings = visibilitySettings || defaultSettings;

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

  // Metric configuration mapping
  const metricConfigs = {
    steps: {
      title: "Daily Steps",
      unit: "steps",
      icon: <Activity className="h-4 w-4" />,
      goalValue: 10000,
      hasGoal: true
    },
    distance_walked: {
      title: "Distance Walked",
      unit: "miles",
      icon: <Activity className="h-4 w-4" />,
      goalValue: 5,
      hasGoal: true
    },
    active_energy: {
      title: "Active Calories",
      unit: "cal",
      icon: <Zap className="h-4 w-4" />,
      goalValue: 500,
      hasGoal: true
    },
    heart_rate: {
      title: "Heart Rate",
      unit: "bpm",
      icon: <Heart className="h-4 w-4" />,
      goalValue: "Normal Range",
      hasGoal: false,
      hasStatus: true
    },
    resting_heart_rate: {
      title: "Resting Heart Rate",
      unit: "bpm",
      icon: <Heart className="h-4 w-4" />,
      goalValue: "Normal Range",
      hasGoal: false
    },
    sleep_duration: {
      title: "Sleep Duration",
      unit: "hours",
      icon: <Moon className="h-4 w-4" />,
      goalValue: 8,
      hasGoal: true
    },
    weight: {
      title: "Weight",
      unit: "lbs",
      icon: <CalendarIcon className="h-4 w-4" />,
      goalValue: undefined,
      hasGoal: false
    },
    body_weight: {
      title: "Body Weight",
      unit: "lbs",
      icon: <CalendarIcon className="h-4 w-4" />,
      goalValue: undefined,
      hasGoal: false
    },
    blood_oxygen: {
      title: "Blood Oxygen",
      unit: "%",
      icon: <Droplets className="h-4 w-4" />,
      goalValue: 95,
      hasGoal: true
    },
    ecg: {
      title: "ECG",
      unit: "reading",
      icon: <Stethoscope className="h-4 w-4" />,
      goalValue: "Normal",
      hasGoal: false
    },
    hrv: {
      title: "Heart Rate Variability",
      unit: "ms",
      icon: <Heart className="h-4 w-4" />,
      goalValue: undefined,
      hasGoal: false
    },
    blood_pressure: {
      title: "Blood Pressure",
      unit: "mmHg",
      icon: <Heart className="h-4 w-4" />,
      goalValue: "Normal",
      hasGoal: false
    },
    water_intake: {
      title: "Water Intake",
      unit: "oz",
      icon: <Droplets className="h-4 w-4" />,
      goalValue: 64,
      hasGoal: true
    }
  };

  // Get visible metrics from settings
  const visibleMetrics = currentSettings.dashboard_preferences.visible_metrics || [];

  // If no metrics are visible, show a message
  if (visibleMetrics.length === 0) {
    return (
      <div className="mb-8 p-8 text-center border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No metrics selected for dashboard display.</p>
        <p className="text-sm text-muted-foreground mt-2">Use the "Add Metrics" button above to add health metrics to your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {visibleMetrics.map(metricId => {
        const config = metricConfigs[metricId as keyof typeof metricConfigs];
        
        if (!config) {
          // Fallback for unknown metrics
          return (
            <StatCard
              key={metricId}
              title={metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              value={getLatestMetricValue(healthData, metricId, "N/A")}
              unit={getLatestMetricUnit(healthData, metricId, "")}
              change={calculateChange(metricId)}
              icon={<Eye className="h-4 w-4" />}
            />
          );
        }

        const value = getLatestMetricValue(healthData, metricId, "N/A");
        const unit = getLatestMetricUnit(healthData, metricId, config.unit);
        const change = calculateChange(metricId);
        
        let additionalProps = {};
        
        // Add goal and progress for metrics with goals
        if (config.hasGoal && typeof config.goalValue === 'number') {
          additionalProps = {
            goalValue: healthData && value !== "N/A" ? config.goalValue : undefined,
            progress: calculateProgress(metricId, config.goalValue)
          };
        } else if (config.goalValue && typeof config.goalValue === 'string') {
          additionalProps = {
            goalValue: config.goalValue,
            progress: value !== "N/A" ? 100 : undefined
          };
        }

        // Add status for heart rate metrics
        if (config.hasStatus && metricId === 'heart_rate') {
          additionalProps = {
            ...additionalProps,
            ...getHeartRateStatus(value)
          };
        }

        return (
          <StatCard
            key={metricId}
            title={config.title}
            value={value}
            unit={unit}
            change={change}
            icon={config.icon}
            {...additionalProps}
          />
        );
      })}
    </div>
  );
};
