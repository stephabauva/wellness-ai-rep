import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@shared/components/ui/use-toast";

import MobileHeader from "./MobileHeader";
import HeroSection from "./HeroSection";
import MetricsGrid from "./MetricsGrid";
import ActivityScroll from "./ActivityScroll";
import ActionButtons from "./ActionButtons";
import FloatingActionButton from "./FloatingActionButton";
import AnimatedSection from "@shared/components/ui/AnimatedSection";

interface HealthMetric {
  id: number;
  dataType: string;
  value: string;
  unit: string | null;
  timestamp: string;
  category: string | null;
}

interface HealthDashboardProps {}

const HealthDashboard: React.FC<HealthDashboardProps> = () => {
  const [timeRange, setTimeRange] = useState("7days");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch health data
  const { data: healthData = [], isLoading } = useQuery<HealthMetric[]>({
    queryKey: ['health-data', timeRange],
    queryFn: async () => {
      console.log(`[SimpleHealthDashboard] Fetching health data for range: ${timeRange}`);
      const response = await fetch(`/api/health-data?range=${timeRange}&t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch health data');
      const data = await response.json();
      console.log(`[SimpleHealthDashboard] Received ${data.length} health records for ${timeRange}`);
      return data;
    },
    staleTime: 0, // Consider data stale immediately
    gcTime: 1000 * 30, // Keep in cache for 30 seconds only
  });



  // Download report
  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/health-data/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: timeRange }),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-report-${timeRange}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Health report downloaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to download report", variant: "destructive" });
    },
  });

  // Share report
  const shareReportMutation = useMutation({
    mutationFn: async () => {
      if (navigator.share) {
        await navigator.share({
          title: 'Health Report',
          text: `My health summary for the last ${timeRange}`,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: "Report link copied to clipboard" });
      }
    },
    onError: () => {
      toast({ title: "Failed to share report", variant: "destructive" });
    },
  });

  // Reset health data
  const resetDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/health-data/reset', {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to reset health data');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      toast({ title: "Health data reset successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reset health data", variant: "destructive" });
    },
  });

  // Smart sync: sample data in dev, real health data in iOS production
  const smartSyncMutation = useMutation({
    mutationFn: async () => {
      // Check if we're in development mode or iOS production
      const isProduction = window.location.protocol === 'https:' && 
                          (window.location.hostname.includes('.replit.app') || 
                           window.location.hostname.includes('localhost:3000') === false);
      
      if (isProduction && (window as any).Capacitor?.getPlatform() === 'ios') {
        // iOS production: use real health data
        const response = await fetch('/api/health-data/native-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syncAll: true }),
        });
        if (!response.ok) throw new Error('Failed to sync health data');
        return response.json();
      } else {
        // Development mode: load sample data
        const response = await fetch('/api/health-data/load-sample', {
          method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to load sample data');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      toast({ title: "Health data synced successfully" });
    },
    onError: () => {
      toast({ title: "Failed to sync health data", variant: "destructive" });
    },
  });

  // Native sync (placeholder for now)
  const nativeSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/health-data/native-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to sync with native health app');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      toast({ title: "Health data synced successfully" });
    },
    onError: () => {
      toast({ title: "Failed to sync health data", variant: "destructive" });
    },
  });

  // Process health data for display with proper aggregation
  const healthSummary = useMemo(() => {
    if (!healthData || healthData.length === 0) {
      console.log(`[SimpleHealthDashboard] No health data available for ${timeRange}`);
      return null;
    }

    console.log(`[SimpleHealthDashboard] Processing ${healthData.length} health records for ${timeRange}`);
    
    // Group data by type and calculate averages/totals
    const weightData = healthData.filter(d => d.dataType === 'weight').map(d => parseFloat(d.value));
    const bmiData = healthData.filter(d => d.dataType === 'bmi').map(d => parseFloat(d.value));
    const bodyFatData = healthData.filter(d => d.dataType === 'body_fat_percentage').map(d => parseFloat(d.value));
    const stepsData = healthData.filter(d => d.dataType === 'steps').map(d => parseFloat(d.value));
    const caloriesConsumedData = healthData.filter(d => d.dataType === 'calories_consumed').map(d => parseFloat(d.value));
    const caloriesBurnedData = healthData.filter(d => d.dataType === 'calories_burned').map(d => parseFloat(d.value));
    
    // Calculate averages for each metric
    const average = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
    const total = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0).toFixed(0) : null;
    
    const summary = {
      weight: average(weightData),
      bmi: average(bmiData),
      bodyFat: average(bodyFatData),
      sleep: healthData.find(d => d.dataType === 'sleep')?.value || null,
      steps: timeRange === "7days" ? average(stepsData) : total(stepsData), // Daily avg for 7d, total for 30d
      caloriesConsumed: average(caloriesConsumedData),
      caloriesBurned: average(caloriesBurnedData),
      wellnessScore: healthData.find(d => d.dataType === 'wellness_score')?.value || null,
      totalRecords: healthData.length,
      // Add data type counts for debugging
      weightCount: weightData.length,
      stepsCount: stepsData.length,
      caloriesCount: caloriesBurnedData.length,
    };

    console.log(`[SimpleHealthDashboard] Health summary for ${timeRange}:`, summary);
    return summary;
  }, [healthData, timeRange]);


  const handleTimeRangeChange = (range: string) => {
    console.log(`[HealthDashboard] Switching to ${range} from ${timeRange}`);
    queryClient.invalidateQueries({ queryKey: ['health-data'] });
    setTimeRange(range);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <MobileHeader timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange} />
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <MobileHeader timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange} />
      
      <AnimatedSection animation="fadeUp" delay={100}>
        <HeroSection 
          wellnessScore={healthSummary?.wellnessScore || "8.1"} 
          timeRange={timeRange}
          totalRecords={healthSummary?.totalRecords || 0}
        />
      </AnimatedSection>

      <AnimatedSection animation="fadeUp" delay={200}>
        <MetricsGrid healthSummary={healthSummary} />
      </AnimatedSection>

      <AnimatedSection animation="slideLeft" delay={300}>
        <ActivityScroll />
      </AnimatedSection>

      <AnimatedSection animation="fadeUp" delay={400}>
        <ActionButtons 
          onDownloadReport={() => downloadReportMutation.mutate()}
          onShareReport={() => shareReportMutation.mutate()}
          onSyncData={() => smartSyncMutation.mutate()}
          onResetData={() => resetDataMutation.mutate()}
          isLoading={{
            download: downloadReportMutation.isPending,
            share: shareReportMutation.isPending,
            sync: smartSyncMutation.isPending,
            reset: resetDataMutation.isPending,
          }}
        />
      </AnimatedSection>
      
      {/* No data fallback handled in MetricsGrid */}
      {!healthSummary && (
        <AnimatedSection animation="fadeIn" delay={200}>
          <div className="px-4 text-center py-8">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              No health data available for the selected time range
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Achievement Banner */}
      <AnimatedSection animation="scale" delay={500}>
        <div className="px-4 mb-6">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 transition-all duration-300 ease-out hover:scale-105">
            <div className="flex items-center justify-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-lg transition-transform duration-300 ease-out hover:rotate-12">
                <div className="text-2xl">🎉</div>
              </div>
              <div className="text-center">
                <div className="font-bold">Great Job!</div>
                <div className="text-sm">3 days of consecutive caloric deficit</div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Floating Action Button for quick actions */}
      <FloatingActionButton 
        onQuickAction={(action) => {
          // Handle quick actions - could integrate with existing mutations
          console.log('Quick action:', action);
          toast({ title: `Quick ${action} logging coming soon!` });
        }}
      />
    </div>
  );
};

export default HealthDashboard;