import React, { useState, useMemo } from "react";
import { Download, Activity, Heart, Brain, Stethoscope, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
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
import { NativeHealthIntegration } from "./health/NativeHealthIntegration";
import { AddMetricsModal } from "./health/AddMetricsModal";
import { Minus } from "lucide-react";
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

// Define types for chart data (can be moved to a types file if they grow)
interface ActivityDataPoint { day: string; steps?: number; active?: number; calories?: number; }
interface SleepDataPoint { day: string; deep?: number; light?: number; rem?: number; total?: number; }
interface NutritionItemData { name: string; value: number; goal: number; unit?: string; percent?: number; color?: string; }
interface HydrationChartData { consumed: number; goal: number; unit?: string; }


const HealthDataSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState("7days");
  const [activeCategory, setActiveCategory] = useState("overview");
  const [isResetting, setIsResetting] = useState(false);
  const [isRemovalMode, setIsRemovalMode] = useState<boolean>(false);
  const [selectedMetricsForRemoval, setSelectedMetricsForRemoval] = useState<string[]>([]);
  
  const { categorizedData, allHealthData, isLoading, refetchHealthData } = useHealthDataApi(timeRange);
  const { downloadHealthReport, isDownloadingReport } = useHealthReport();
  const { toast } = useToast();

  // Mutation for removing metrics
  const removeMetricsMutation = useMutation({
    mutationFn: async (metricsToRemove: string[]) => {
      const response = await fetch('/api/health-consent/visibility');
      if (!response.ok) throw new Error('Failed to fetch current settings');
      
      const currentSettings = await response.json();
      
      const updatedSettings = {
        ...currentSettings,
        dashboard_preferences: {
          ...currentSettings.dashboard_preferences,
          visible_metrics: currentSettings.dashboard_preferences.visible_metrics.filter(
            (id: string) => !metricsToRemove.includes(id)
          ),
          hidden_metrics: [
            ...currentSettings.dashboard_preferences.hidden_metrics,
            ...metricsToRemove.filter((id: string) => 
              !currentSettings.dashboard_preferences.hidden_metrics.includes(id)
            )
          ]
        }
      };

      const updateResponse = await fetch('/api/health-consent/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!updateResponse.ok) throw new Error('Failed to update settings');
      return updateResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health-consent/visibility'] });
      toast({
        title: "Metrics Removed",
        description: `${selectedMetricsForRemoval.length} metric(s) removed from dashboard.`,
      });
      setSelectedMetricsForRemoval([]);
      setIsRemovalMode(false);
    },
    onError: () => {
      toast({
        title: "Failed to Remove Metrics",
        description: "Unable to remove metrics. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveSelectedMetrics = () => {
    if (selectedMetricsForRemoval.length > 0) {
      removeMetricsMutation.mutate(selectedMetricsForRemoval);
    }
  };

  // Memoize processed data for charts to prevent re-computation on every render
  // These are examples; actual data processing would depend on the structure of HealthMetric[]
  const activityChartData: ActivityDataPoint[] = useMemo(() => {
    if (!allHealthData || allHealthData.length === 0) {
      return [];
    }
    
    // Process actual health data for activity metrics
    const activityData = allHealthData.filter(item => 
      item.dataType === 'steps' || 
      item.dataType === 'daily_activity' ||
      item.dataType === 'active_minutes' || 
      item.dataType === 'physical_effort' ||
      item.dataType === 'calories_burned'
    );
    
    if (activityData.length === 0) {
      return [];
    }
    
    // Group by day and aggregate
    const dayMap = new Map<string, { steps?: number; active?: number; calories?: number }>();
    
    activityData.forEach(item => {
      const day = new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      const value = parseFloat(item.value);
      
      if (!dayMap.has(day)) {
        dayMap.set(day, {});
      }
      
      const dayData = dayMap.get(day)!;
      if (item.dataType === 'steps') dayData.steps = value;
      // Don't map daily_activity to steps since they are different metrics
      if (item.dataType === 'active_minutes') dayData.active = value;
      if (item.dataType === 'physical_effort') dayData.active = value; // Map physical_effort to active minutes
      if (item.dataType === 'calories_burned') dayData.calories = value;
    });
    
    return Array.from(dayMap.entries()).map(([day, data]) => ({ day, ...data }));
  }, [allHealthData]);

  const sleepChartData: SleepDataPoint[] = useMemo(() => {
    if (!allHealthData || allHealthData.length === 0) {
      return [];
    }
    
    // Process actual health data for sleep metrics
    const sleepData = allHealthData.filter(item => 
      item.dataType === 'sleep_deep' || 
      item.dataType === 'sleep_light' || 
      item.dataType === 'sleep_rem' ||
      item.dataType === 'sleep_total'
    );
    
    if (sleepData.length === 0) {
      return [];
    }
    
    // Group by day and aggregate
    const dayMap = new Map<string, { deep?: number; light?: number; rem?: number; total?: number }>();
    
    sleepData.forEach(item => {
      const day = new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      const value = parseFloat(item.value);
      
      if (!dayMap.has(day)) {
        dayMap.set(day, {});
      }
      
      const dayData = dayMap.get(day)!;
      if (item.dataType === 'sleep_deep') dayData.deep = value;
      if (item.dataType === 'sleep_light') dayData.light = value;
      if (item.dataType === 'sleep_rem') dayData.rem = value;
      if (item.dataType === 'sleep_total') dayData.total = value;
    });
    
    return Array.from(dayMap.entries()).map(([day, data]) => ({ day, ...data }));
  }, [allHealthData]);

  const nutritionSummaryData: NutritionItemData[] = useMemo(() => {
    if (!allHealthData || allHealthData.length === 0) {
      return [];
    }
    
    // Process actual health data for nutrition metrics
    const nutritionData = allHealthData.filter(item => 
      item.dataType === 'protein' || 
      item.dataType === 'carbs' || 
      item.dataType === 'fat' ||
      item.dataType === 'fiber' ||
      item.dataType === 'calories' ||
      item.dataType === 'calories_burned' ||
      item.dataType === 'calories_intake' ||
      item.dataType === 'sugar' ||
      item.dataType === 'bmr'
    );
    
    if (nutritionData.length === 0) {
      return [];
    }
    
    // Aggregate nutrition data by type (sum for the time period)
    const nutritionMap = new Map<string, { value: number; unit: string }>();
    
    nutritionData.forEach(item => {
      const value = parseFloat(item.value);
      const unit = item.unit || '';
      
      if (nutritionMap.has(item.dataType)) {
        nutritionMap.get(item.dataType)!.value += value;
      } else {
        nutritionMap.set(item.dataType, { value, unit });
      }
    });
    
    // Convert to nutrition items with goals (these would ideally come from user settings)
    const nutritionGoals = {
      protein: 110,
      carbs: 250,
      fat: 73,
      fiber: 30,
      calories: 2200,
      sugar: 50
    };
    
    return Array.from(nutritionMap.entries()).map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(data.value),
      goal: nutritionGoals[type as keyof typeof nutritionGoals] || 100,
      unit: data.unit,
      color: type === 'sugar' ? 'hsl(var(--destructive))' : undefined
    }));
  }, [allHealthData]);

  const hydrationChartData: HydrationChartData = useMemo(() => {
    if (!allHealthData || allHealthData.length === 0) {
      return { consumed: 0, goal: 8, unit: 'glasses' };
    }
    
    // Process actual health data for hydration metrics
    const hydrationData = allHealthData.filter(item => 
      item.dataType === 'water_intake' || 
      item.dataType === 'hydration'
    );
    
    if (hydrationData.length === 0) {
      return { consumed: 0, goal: 8, unit: 'glasses' };
    }
    
    // Sum up hydration for the time period
    const totalConsumed = hydrationData.reduce((sum, item) => {
      return sum + parseFloat(item.value);
    }, 0);
    
    const unit = hydrationData[0]?.unit || 'glasses';
    const goal = unit === 'L' ? 2 : 8; // Default goals based on unit
    
    return { 
      consumed: Math.round(totalConsumed * 10) / 10, // Round to 1 decimal
      goal, 
      unit 
    };
  }, [allHealthData]);

  // Reset health data function
  const handleResetHealthData = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/health-data/reset', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reset health data');
      }

      // Refresh the health data after successful reset
      refetchHealthData();
      
      toast({
        title: "Health Data Reset",
        description: "All health data has been successfully cleared. You can now import fresh data.",
      });
    } catch (error) {
      console.error('Error resetting health data:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset health data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

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
              <AddMetricsModal />
              <Button 
                variant="outline" 
                onClick={() => setIsRemovalMode(!isRemovalMode)}
                className={isRemovalMode ? "bg-destructive/10 border-destructive" : ""}
              >
                <Minus className="h-4 w-4 mr-2" />
                {isRemovalMode ? "Cancel" : "Remove Metrics"}
              </Button>
              {isRemovalMode && selectedMetricsForRemoval.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveSelectedMetrics}
                  disabled={removeMetricsMutation.isPending}
                >
                  {removeMetricsMutation.isPending ? "Removing..." : `Remove Selected (${selectedMetricsForRemoval.length})`}
                </Button>
              )}
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    disabled={isResetting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Health Data</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your health data from the system. This action cannot be undone. 
                      You'll be able to import fresh data afterwards.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleResetHealthData}
                      disabled={isResetting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isResetting ? "Resetting..." : "Reset All Data"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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

          {/* Native Health Integration - Phase 1 */}
          <div className="mb-8">
            <NativeHealthIntegration 
              onDataImported={(result) => {
                if (result.success) {
                  refetchHealthData();
                  toast({
                    title: "Native Health Sync",
                    description: `Successfully processed ${result.recordsProcessed} records.`,
                  });
                }
              }}
              onError={(error) => {
                toast({
                  title: "Native Health Error",
                  description: error,
                  variant: "destructive",
                });
              }}
            />
          </div>
          
          <CoachingInsights />
        </div>
      </div>
    </div>
  );
};

export default HealthDataSection;
