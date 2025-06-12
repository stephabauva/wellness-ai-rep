import React, { useState, useMemo } from "react";
import { Download, Activity, Heart, Brain, Stethoscope, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import HealthMetricsCard from "@/components/HealthMetricsCard"; // This is an existing component

// Import hooks
import { useHealthDataApi, CategorizedHealthData, HealthMetric } from "@/hooks/useHealthDataApi";
import { useHealthReport } from "@/hooks/useHealthReport";

// Import sub-components
import { KeyMetricsOverview } from "./health/KeyMetricsOverview";
import { HealthCategoryView } from "./health/HealthCategoryView";
import { ActivityTrendChart } from "./health/ActivityTrendChart";
import { SleepQualityChart } from "./health/SleepQualityChart";
import { NutritionSummary } from "./health/NutritionSummary";
import { HydrationCard } from "./health/HydrationCard";
import { CoachingInsights } from "./health/CoachingInsights";
import { HealthDataImport } from "./health/HealthDataImport";

// Define types for chart data (can be moved to a types file if they grow)
interface ActivityDataPoint { day: string; steps?: number; active?: number; calories?: number; }
interface SleepDataPoint { day: string; deep?: number; light?: number; rem?: number; total?: number; }
interface NutritionItemData { name: string; value: number; goal: number; unit?: string; percent?: number; color?: string; }
interface HydrationChartData { consumed: number; goal: number; unit?: string; }


const HealthDataSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState("7days");
  const [activeCategory, setActiveCategory] = useState("overview");
  
  const { categorizedData, allHealthData, isLoading, refetchHealthData } = useHealthDataApi(timeRange);
  const { downloadHealthReport, isDownloadingReport } = useHealthReport();

  // Memoize processed data for charts to prevent re-computation on every render
  // These are examples; actual data processing would depend on the structure of HealthMetric[]
  const activityChartData: ActivityDataPoint[] = useMemo(() => {
    // TODO: Process 'allHealthData' or 'categorizedData.lifestyle' to fit ActivityDataPoint[] structure
    // For now, using the mock data structure from the original component
    return [
      { day: 'Mon', steps: 5240, active: 45 }, { day: 'Tue', steps: 7800, active: 60 },
      { day: 'Wed', steps: 5900, active: 50 }, { day: 'Thu', steps: 9500, active: 85 },
      { day: 'Fri', steps: 8200, active: 70 }, { day: 'Sat', steps: 6300, active: 55 },
      { day: 'Sun', steps: 8700, active: 75 },
    ];
  }, [allHealthData, categorizedData]); // Add dependencies if data comes from these

  const sleepChartData: SleepDataPoint[] = useMemo(() => {
    // TODO: Process 'allHealthData' or 'categorizedData.lifestyle' for sleep
    return [
      { day: 'Mon', deep: 1.8, light: 4.5, rem: 1.2 }, { day: 'Tue', deep: 2.0, light: 4.0, rem: 1.5 },
      { day: 'Wed', deep: 1.5, light: 5.0, rem: 1.0 }, { day: 'Thu', deep: 2.2, light: 3.5, rem: 1.8 },
      { day: 'Fri', deep: 1.9, light: 4.2, rem: 1.3 }, { day: 'Sat', deep: 2.5, light: 4.5, rem: 1.5 },
      { day: 'Sun', deep: 2.1, light: 4.0, rem: 1.4 },
    ];
  }, [allHealthData, categorizedData]);

  const nutritionSummaryData: NutritionItemData[] = useMemo(() => {
     // TODO: Process 'allHealthData' or relevant category for nutrition
    return [
      { name: 'Protein', value: 76, goal: 110, unit: 'g' }, { name: 'Carbs', value: 215, goal: 250, unit: 'g' },
      { name: 'Fat', value: 62, goal: 73, unit: 'g' }, { name: 'Fiber', value: 18, goal: 30, unit: 'g' },
      { name: 'Calories', value: 1842, goal: 2200, unit: 'kcal'}, { name: 'Sugar', value: 42, goal: 50, unit: 'g', color: 'hsl(var(--destructive))' },
    ];
  }, [allHealthData, categorizedData]);

  const hydrationChartData: HydrationChartData = useMemo(() => {
    // TODO: Process 'allHealthData' for hydration
    return { consumed: 1.3, goal: 2, unit: 'L' };
  }, [allHealthData]);

  // Define categories for tabs - this could also come from a config or be derived
  const healthCategories = [
    { id: "body_composition", name: "Body", icon: <Activity className="h-5 w-5" />, description: "Weight, BMI, body fat" },
    { id: "cardiovascular", name: "Heart", icon: <Heart className="h-5 w-5" />, description: "Blood pressure, heart rate" },
    { id: "lifestyle", name: "Lifestyle", icon: <Brain className="h-5 w-5" />, description: "Activity, sleep, stress" },
    { id: "medical", name: "Medical", icon: <Stethoscope className="h-5 w-5" />, description: "Lab results, conditions" },
    { id: "advanced", name: "Advanced", icon: <Zap className="h-5 w-5" />, description: "VO2 max, performance metrics" },
  ];


  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 pb-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-1/2 mb-6" /> {/* Title and controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[150px] w-full" />)}
          </div>
          <Skeleton className="h-10 w-full mb-4" /> {/* TabsList */}
          <Skeleton className="h-[200px] w-full mb-8" /> {/* TabContent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-4 md:p-6 pb-8 min-h-full">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-2xl font-semibold text-foreground">Health Dashboard</h1>
            <div className="mt-4 md:mt-0 flex space-x-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  {/* <SelectItem value="custom">Custom range</SelectItem> */}
                </SelectContent>
              </Select>
              <HealthDataImport />
              <Button 
                onClick={() => downloadHealthReport()}
                disabled={isDownloadingReport}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloadingReport ? "Downloading..." : "Download PDF"}
              </Button>
            </div>
          </div>

          <KeyMetricsOverview healthData={allHealthData} />

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto gap-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              {healthCategories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">{cat.name}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {healthCategories.map(cat => (
                  categorizedData?.[cat.id as keyof CategorizedHealthData] && (
                    <HealthMetricsCard
                      key={cat.id}
                      title={cat.name}
                      category={cat.id}
                      metrics={categorizedData[cat.id as keyof CategorizedHealthData] as HealthMetric[]}
                      icon={React.cloneElement(cat.icon as React.ReactElement, {className: "h-5 w-5"})}
                    />
                  )
                ))}
              </div>
            </TabsContent>

            {healthCategories.map(cat => (
              <TabsContent key={`${cat.id}-content`} value={cat.id} className="space-y-6 mt-6">
                <HealthCategoryView
                  title={cat.name}
                  description={cat.description}
                  categoryKey={cat.id as keyof CategorizedHealthData}
                  metrics={categorizedData?.[cat.id as keyof CategorizedHealthData]}
                  icon={React.cloneElement(cat.icon as React.ReactElement, {className: "h-5 w-5"})}
                />
              </TabsContent>
            ))}
          </Tabs>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ActivityTrendChart data={activityChartData} />
            <SleepQualityChart data={sleepChartData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <NutritionSummary data={nutritionSummaryData} />
            <HydrationCard data={hydrationChartData} />
          </div>
          
          <CoachingInsights />
        </div>
      </div>
    </div>
  );
};

export default HealthDataSection;
