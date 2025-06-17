import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, TrendingDown, Activity, Heart, Brain, Droplets, Thermometer } from "lucide-react";

interface HealthMetric {
  id: number;
  dataType: string;
  value: string;
  unit: string | null;
  timestamp: string;
  source: string | null;
  category: string | null;
}

interface HealthMetricsCardProps {
  title: string;
  category: string;
  metrics: HealthMetric[];
  icon?: React.ReactNode;
  color?: string;
  isRemovalMode?: boolean;
  selectedMetricsForRemoval?: string[];
  onMetricSelectionChange?: (selectedMetrics: string[]) => void;
}

const getMetricIcon = (dataType: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    heart_rate: <Heart className="h-4 w-4" />,
    blood_pressure_systolic: <Heart className="h-4 w-4" />,
    blood_pressure_diastolic: <Heart className="h-4 w-4" />,
    steps: <Activity className="h-4 w-4" />,
    sleep_duration: <Brain className="h-4 w-4" />,
    hydration: <Droplets className="h-4 w-4" />,
    body_temperature: <Thermometer className="h-4 w-4" />,
  };
  return iconMap[dataType] || <Activity className="h-4 w-4" />;
};

const getStatusColor = (dataType: string, value: string): string => {
  const numValue = parseFloat(value);
  
  // Define normal ranges for common metrics
  const ranges: Record<string, { min: number; max: number; optimal?: { min: number; max: number } }> = {
    blood_pressure_systolic: { min: 90, max: 140, optimal: { min: 100, max: 120 } },
    blood_pressure_diastolic: { min: 60, max: 90, optimal: { min: 60, max: 80 } },
    heart_rate: { min: 60, max: 100, optimal: { min: 60, max: 80 } },
    blood_glucose_fasting: { min: 70, max: 100, optimal: { min: 80, max: 95 } },
    bmi: { min: 18.5, max: 25, optimal: { min: 18.5, max: 24.9 } },
    body_fat_percentage: { min: 10, max: 25, optimal: { min: 12, max: 20 } },
  };

  const range = ranges[dataType];
  if (!range) return "text-foreground";

  if (range.optimal) {
    if (numValue >= range.optimal.min && numValue <= range.optimal.max) return "text-green-600";
    if (numValue >= range.min && numValue <= range.max) return "text-yellow-600";
    return "text-red-600";
  }

  if (numValue >= range.min && numValue <= range.max) return "text-green-600";
  return "text-red-600";
};

const formatMetricName = (dataType: string): string => {
  return dataType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const HealthMetricsCard: React.FC<HealthMetricsCardProps> = ({ 
  title, 
  category, 
  metrics, 
  icon,
  color = "primary"
}) => {
  if (!metrics.length) return null;

  // Get the most recent value for each metric type
  const latestMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.dataType] || new Date(metric.timestamp) > new Date(acc[metric.dataType].timestamp)) {
      acc[metric.dataType] = metric;
    }
    return acc;
  }, {} as Record<string, HealthMetric>);

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {Object.keys(latestMetrics).length} metrics
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {Object.values(latestMetrics).map((metric) => (
            <div key={metric.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                {getMetricIcon(metric.dataType)}
                <div>
                  <p className="text-sm font-medium">{formatMetricName(metric.dataType)}</p>
                  <p className="text-xs text-muted-foreground">{metric.source}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-semibold ${getStatusColor(metric.dataType, metric.value)}`}>
                  {metric.value}
                  {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(metric.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthMetricsCard;