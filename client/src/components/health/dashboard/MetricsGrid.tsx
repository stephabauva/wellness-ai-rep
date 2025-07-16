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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 
                    min-h-[120px] touch-none select-none transition-all duration-300 ease-out
                    hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.03] hover:-translate-y-1
                    active:scale-[0.97] active:translate-y-0 active:shadow-md
                    cursor-pointer min-w-0 flex flex-col justify-between
                    transform-gpu will-change-transform group">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${color} flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-110`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <TrendIcon className={`h-4 w-4 flex-shrink-0 transition-all duration-300 ease-out ${
          trend === "up" ? "text-green-500 group-hover:animate-bounce" : 
          trend === "down" ? "text-red-500 group-hover:animate-pulse" : 
          "text-gray-400 group-hover:animate-pulse"
        }`} />
      </div>
      
      <div className="space-y-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{title}</p>
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</span>
          {unit && <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

const MetricsGrid: React.FC<MetricsGridProps> = ({ healthSummary }) => {
  if (!healthSummary) {
    return (
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-32 h-6 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-20 h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 animate-pulse min-h-[120px]">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-gray-300 dark:bg-gray-700 rounded-lg" />
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
      
      {/* Mobile-first 2x2 grid with responsive breakpoints */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 max-w-full">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
};

export default MetricsGrid;