import React from 'react';
import { StatCard } from '@/components/ui/stat-card'; // Assuming StatCard is a shared UI component
import { HealthMetric } from '@/hooks/useHealthDataApi'; // Import the HealthMetric type
import { Activity, Brain, Heart, Calendar as CalendarIcon, Zap, Moon, Stethoscope, Droplets, Users, Shield, Eye } from 'lucide-react'; // Renamed Calendar to CalendarIcon
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';

interface KeyMetricsOverviewProps {
  healthData: HealthMetric[] | undefined | null; // Can be undefined while loading or null if no data
  isRemovalMode?: boolean;
  selectedMetricsForRemoval?: string[];
  onMetricSelectionChange?: (selectedMetrics: string[]) => void;
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

// Helper function to get aggregated value for a specific metric type based on its nature
const getAggregatedMetricValue = (
  metrics: HealthMetric[] | undefined | null,
  dataType: string,
  defaultValue: string = "0"
): string => {
  if (!metrics || metrics.length === 0) {
    console.log(`[Aggregation] No metrics data available for ${dataType}`);
    return defaultValue;
  }
  
  const filteredMetrics = metrics.filter(m => m.dataType === dataType);
  if (filteredMetrics.length === 0) {
    console.log(`[Aggregation] No ${dataType} metrics found in ${metrics.length} total records`);
    return defaultValue;
  }
  
  // Extra debug for steps
  if (dataType === 'steps') {
    console.log(`[Aggregation Debug] Steps data (${filteredMetrics.length} records):`, filteredMetrics.slice(0, 3).map(m => ({
      value: m.value,
      timestamp: new Date(m.timestamp).toLocaleDateString()
    })));
  }
  
  // Determine aggregation method based on data type
  const shouldAverage = [
    'weight', 'body_weight', 'bmi', 'body_fat_percentage', 'heart_rate', 'resting_heart_rate',
    'blood_pressure_systolic', 'blood_pressure_diastolic', 'hrv', 'blood_glucose_fasting',
    'blood_glucose_postprandial', 'body_temperature', 'vo2_max', 'stress_level', 'mood'
  ].includes(dataType);
  
  const shouldSum = [
    'steps', 'calories_burned', 'calories_intake', 'hydration', 'water_intake',
    'exercise_duration', 'sleep_duration', 'active_minutes', 'calories', 'distance'
  ].includes(dataType);
  
  const shouldUseLatest = [
    'blood_oxygen', 'oxygen_saturation', 'ecg', 'ketone_levels', 'hba1c',
    'cholesterol_total', 'cholesterol_ldl', 'cholesterol_hdl', 'cholesterol_triglycerides'
  ].includes(dataType);
  
  if (shouldSum) {
    // Sum values for cumulative metrics
    const total = filteredMetrics.reduce((sum, metric) => {
      const val = parseFloat(metric.value);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    console.log(`[Aggregation] Summing ${dataType}: ${filteredMetrics.length} records = ${total}`);
    return total.toFixed(0); // No decimals for steps
  } else if (shouldAverage) {
    // Average values for continuous metrics
    const total = filteredMetrics.reduce((sum, metric) => {
      const val = parseFloat(metric.value);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const average = filteredMetrics.length > 0 ? total / filteredMetrics.length : 0;
    console.log(`[Aggregation] Averaging ${dataType}: ${filteredMetrics.length} records = ${average}`);
    return average.toFixed(1);
  } else if (shouldUseLatest) {
    // Use latest value for occasional measurements
    const sorted = [...filteredMetrics].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const latest = sorted[0];
    console.log(`[Aggregation] Latest ${dataType}: ${latest.value} from ${filteredMetrics.length} records`);
    return latest.value;
  } else {
    // Default to average for unknown metrics
    const total = filteredMetrics.reduce((sum, metric) => {
      const val = parseFloat(metric.value);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const average = filteredMetrics.length > 0 ? total / filteredMetrics.length : 0;
    console.log(`[Aggregation] Default avg ${dataType}: ${filteredMetrics.length} records = ${average}`);
    return average.toFixed(1);
  }
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

export const KeyMetricsOverview: React.FC<KeyMetricsOverviewProps> = React.memo(({ 
  healthData, 
  isRemovalMode = false,
  selectedMetricsForRemoval = [],
  onMetricSelectionChange = () => {}
}) => {
  // Debug: Log when healthData changes
  React.useEffect(() => {
    if (healthData) {
      console.log(`[KeyMetricsOverview] Health data updated - records: ${healthData.length}`);
      // Log sample of steps data to see what we're aggregating
      const stepsData = healthData.filter(m => m.dataType === 'steps');
      console.log(`[KeyMetricsOverview] Steps data: ${stepsData.length} records`, stepsData.slice(0, 3));
    }
  }, [healthData]);
  // Handle metric selection for removal
  const handleMetricSelection = (metricId: string, isSelected: boolean) => {
    if (isSelected) {
      onMetricSelectionChange([...selectedMetricsForRemoval, metricId]);
    } else {
      onMetricSelectionChange(selectedMetricsForRemoval.filter(id => id !== metricId));
    }
  };

  // Get current visibility settings
  const { data: visibilitySettings } = useQuery({
    queryKey: ['/api/health-consent/visibility'],
    queryFn: async (): Promise<MetricsVisibilitySettings> => {
      const response = await fetch('/api/health-consent/visibility');
      if (!response.ok) throw new Error('Failed to fetch visibility settings');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Keep visibility settings cached for 5 minutes
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
    const value = parseFloat(getAggregatedMetricValue(healthData, dataType, "0"));
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
      hasGoal: true,
      hasStatus: false
    },
    distance_walked: {
      title: "Distance Walked",
      unit: "miles",
      icon: <Activity className="h-4 w-4" />,
      goalValue: 5,
      hasGoal: true,
      hasStatus: false
    },
    active_energy: {
      title: "Active Calories",
      unit: "cal",
      icon: <Zap className="h-4 w-4" />,
      goalValue: 500,
      hasGoal: true,
      hasStatus: false
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
      hasGoal: false,
      hasStatus: false
    },
    sleep_duration: {
      title: "Sleep Duration",
      unit: "hours",
      icon: <Moon className="h-4 w-4" />,
      goalValue: 8,
      hasGoal: true,
      hasStatus: false
    },
    weight: {
      title: "Weight",
      unit: "lbs",
      icon: <CalendarIcon className="h-4 w-4" />,
      goalValue: undefined,
      hasGoal: false,
      hasStatus: false
    },
    body_weight: {
      title: "Body Weight",
      unit: "lbs",
      icon: <CalendarIcon className="h-4 w-4" />,
      goalValue: undefined,
      hasGoal: false,
      hasStatus: false
    },
    blood_oxygen: {
      title: "Blood Oxygen",
      unit: "%",
      icon: <Droplets className="h-4 w-4" />,
      goalValue: 95,
      hasGoal: true,
      hasStatus: false
    },
    ecg: {
      title: "ECG",
      unit: "reading",
      icon: <Stethoscope className="h-4 w-4" />,
      goalValue: "Normal",
      hasGoal: false,
      hasStatus: false
    },
    hrv: {
      title: "Heart Rate Variability",
      unit: "ms",
      icon: <Heart className="h-4 w-4" />,
      goalValue: undefined,
      hasGoal: false,
      hasStatus: false
    },
    blood_pressure: {
      title: "Blood Pressure",
      unit: "mmHg",
      icon: <Heart className="h-4 w-4" />,
      goalValue: "Normal",
      hasGoal: false,
      hasStatus: false
    },
    water_intake: {
      title: "Water Intake",
      unit: "oz",
      icon: <Droplets className="h-4 w-4" />,
      goalValue: 64,
      hasGoal: true,
      hasStatus: false
    }
  };

  // Get visible metrics from settings
  const visibleMetrics = currentSettings.dashboard_preferences.visible_metrics || [];
  
  // Memoize the metric values to ensure they update when health data changes
  const metricValues = React.useMemo(() => {
    const values: Record<string, string> = {};
    visibleMetrics.forEach(metricId => {
      values[metricId] = getAggregatedMetricValue(healthData, metricId, "N/A");
    });
    console.log(`[KeyMetricsOverview] Recalculated metric values:`, values);
    return values;
  }, [healthData, visibleMetrics]);

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
            <div key={metricId} className="relative">
              {isRemovalMode && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedMetricsForRemoval.includes(metricId)}
                    onCheckedChange={(checked) => handleMetricSelection(metricId, !!checked)}
                    className="bg-background border-2"
                  />
                </div>
              )}
              <StatCard
                title={metricId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={metricValues[metricId] || "N/A"}
                unit={getLatestMetricUnit(healthData, metricId, "")}
                change={calculateChange(metricId)}
                icon={<Eye className="h-4 w-4" />}
              />
            </div>
          );
        }

        const value = metricValues[metricId] || "N/A";
        const unit = getLatestMetricUnit(healthData, metricId, config.unit);
        const change = calculateChange(metricId);
        
        // Debug log for specific metrics
        if (metricId === 'steps' && value !== "N/A") {
          console.log(`[KeyMetricsOverview] Steps aggregated value: ${value} from ${healthData?.filter(m => m.dataType === 'steps').length || 0} records`);
        }
        
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
          <div key={metricId} className="relative">
            {isRemovalMode && (
              <div className="absolute top-2 left-2 z-10">
                <Checkbox
                  checked={selectedMetricsForRemoval.includes(metricId)}
                  onCheckedChange={(checked) => handleMetricSelection(metricId, !!checked)}
                  className="bg-background border-2"
                />
              </div>
            )}
            <StatCard
              title={config.title}
              value={value}
              unit={unit}
              change={change}
              icon={config.icon}
              {...additionalProps}
            />
          </div>
        );
      })}
    </div>
  );
});
