import React from "react";
import { TrendingUp, TrendingDown, Activity, Heart, Scale, Moon } from "lucide-react";

interface HealthSummary {
  weight?: string | null;
  bmi?: string | null;
  bodyFat?: string | null;
  sleep?: string | null;
  steps?: string | null;
  caloriesConsumed?: string | null;
  caloriesBurned?: string | null;
  wellnessScore?: string | null;
  totalRecords: number;
}

interface MetricsGridProps {
  healthSummary: HealthSummary | null;
}

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend = "neutral", 
  color 
}) => {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <TrendIcon className={`h-4 w-4 ${
          trend === "up" ? "text-green-500" : 
          trend === "down" ? "text-red-500" : 
          "text-gray-400"
        }`} />
      </div>
      
      <div className="space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-gray-900 dark:text-white">{value}</span>
          {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

const MetricsGrid: React.FC<MetricsGridProps> = ({ healthSummary }) => {
  if (!healthSummary) {
    return (
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-lg" />
                <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
              <div className="space-y-2">
                <div className="w-16 h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Weight",
      value: healthSummary.weight || "67.9",
      unit: "kg",
      icon: Scale,
      trend: "down" as const,
      color: "bg-green-500"
    },
    {
      title: "BMI",
      value: healthSummary.bmi || "22.1",
      unit: "",
      icon: Activity,
      trend: "neutral" as const,
      color: "bg-blue-500"
    },
    {
      title: "Body Fat",
      value: healthSummary.bodyFat || "22.4",
      unit: "%",
      icon: Heart,
      trend: "down" as const,
      color: "bg-purple-500"
    },
    {
      title: "Sleep",
      value: healthSummary.sleep || "7h15",
      unit: "",
      icon: Moon,
      trend: "up" as const,
      color: "bg-indigo-500"
    },
    {
      title: "Steps",
      value: healthSummary.steps || "11,850",
      unit: "",
      icon: Activity,
      trend: "up" as const,
      color: "bg-green-500"
    },
    {
      title: "Calories",
      value: healthSummary.caloriesBurned || "2,180",
      unit: "kcal",
      icon: Heart,
      trend: "up" as const,
      color: "bg-red-500"
    }
  ];

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Metrics</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {healthSummary.totalRecords} records
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
};

export default MetricsGrid;