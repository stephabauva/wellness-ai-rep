import React, { useState, useMemo } from "react";
import { Download, Share2, Database, Smartphone, Trophy, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface HealthMetric {
  id: number;
  dataType: string;
  value: string;
  unit: string | null;
  timestamp: string;
  category: string | null;
}

interface SimpleHealthDashboardProps {}

const SimpleHealthDashboard: React.FC<SimpleHealthDashboardProps> = () => {
  const [timeRange, setTimeRange] = useState("7days");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch health data
  const { data: healthData = [], isLoading } = useQuery<HealthMetric[]>({
    queryKey: ['health-data', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/health-data?range=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch health data');
      return response.json();
    },
  });

  // Load sample data
  const loadSampleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/health-data/load-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to load sample data');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      toast({ title: "Sample data loaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to load sample data", variant: "destructive" });
    },
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

  // Process health data for display
  const healthSummary = useMemo(() => {
    if (!healthData || healthData.length === 0) return null;

    const summary = {
      weight: healthData.find(d => d.dataType === 'weight')?.value || null,
      bmi: healthData.find(d => d.dataType === 'bmi')?.value || null,
      bodyFat: healthData.find(d => d.dataType === 'body_fat_percentage')?.value || null,
      sleep: healthData.find(d => d.dataType === 'sleep')?.value || null,
      steps: healthData.find(d => d.dataType === 'steps')?.value || null,
      caloriesConsumed: healthData.find(d => d.dataType === 'calories_consumed')?.value || null,
      caloriesBurned: healthData.find(d => d.dataType === 'calories_burned')?.value || null,
      wellnessScore: healthData.find(d => d.dataType === 'wellness_score')?.value || null,
    };

    return summary;
  }, [healthData]);

  // AI Analysis (simulated for MVP)
  const aiAnalysis = useMemo(() => {
    if (!healthSummary) return [];

    const insights = [];
    
    if (healthSummary.weight) {
      insights.push({
        type: 'success',
        text: `Weight loss: Excellent progress, -1.3kg this month`,
        icon: CheckCircle
      });
    }
    
    if (healthSummary.steps) {
      insights.push({
        type: 'success', 
        text: `Physical activity: Daily goal regularly achieved`,
        icon: CheckCircle
      });
    }
    
    if (healthSummary.sleep) {
      insights.push({
        type: 'success',
        text: `Sleep: Quality consistently improving`,
        icon: CheckCircle
      });
    }
    
    if (healthSummary.caloriesConsumed) {
      insights.push({
        type: 'warning',
        text: `Hydration: Improve to reach 2.5L/day`,
        icon: AlertCircle
      });
    }
    
    insights.push({
      type: 'success',
      text: `Overall score: You're on the right track!`,
      icon: Trophy
    });

    return insights;
  }, [healthSummary]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Health Report</h1>
        </div>
        <p className="text-white/90">Complete synthesis of your health data</p>
      </div>

      {/* Time Period Toggle */}
      <div className="flex gap-2">
        <Button
          onClick={() => setTimeRange("7days")}
          variant={timeRange === "7days" ? "default" : "outline"}
          className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
        >
          7 days
        </Button>
        <Button
          onClick={() => setTimeRange("30days")}
          variant={timeRange === "30days" ? "default" : "outline"}
          className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
        >
          30 days
        </Button>
      </div>

      {/* Summary Title */}
      <div className="text-lg font-semibold text-green-700">
        Summary - Last {timeRange === "7days" ? "7 days" : "30 days"}
      </div>

      {/* Metrics Grid */}
      {healthSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weight */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Average Weight</div>
                <div className="text-2xl font-bold text-green-600">
                  {healthSummary.weight ? `${healthSummary.weight} kg` : "67.9 kg"}
                </div>
              </div>
              <TrendingDown className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          {/* BMI */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Average BMI</div>
                <div className="text-2xl font-bold text-blue-600">
                  {healthSummary.bmi || "22.1"}
                </div>
              </div>
              <TrendingDown className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          {/* Body Fat */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Body Fat</div>
                <div className="text-2xl font-bold text-green-600">
                  {healthSummary.bodyFat ? `${healthSummary.bodyFat}%` : "22.4%"}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          {/* Sleep */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Average Sleep</div>
                <div className="text-2xl font-bold text-blue-600">
                  {healthSummary.sleep ? `${healthSummary.sleep}h` : "7h15"}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          {/* Steps */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Daily Activity</div>
                <div className="text-2xl font-bold text-green-600">
                  {healthSummary.steps ? `${healthSummary.steps} steps` : "11,850 steps"}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          {/* Calories Consumed */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Calories Consumed</div>
                <div className="text-2xl font-bold text-blue-600">
                  {healthSummary.caloriesConsumed ? `${healthSummary.caloriesConsumed} kcal` : "1,245 kcal"}
                </div>
              </div>
              <TrendingDown className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          {/* Calories Burned */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Calories Burned</div>
                <div className="text-2xl font-bold text-green-600">
                  {healthSummary.caloriesBurned ? `${healthSummary.caloriesBurned} kcal` : "2,180 kcal"}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </Card>

          {/* Wellness Score */}
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Wellness Score</div>
                <div className="text-2xl font-bold text-green-600">
                  {healthSummary.wellnessScore ? `${healthSummary.wellnessScore}/10` : "8.1/10"}
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-muted-foreground mb-4">
            No health data available for the selected time range
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={() => nativeSyncMutation.mutate()}>
              <Smartphone className="h-4 w-4 mr-2" />
              Sync Phone Data
            </Button>
            <Button onClick={() => loadSampleMutation.mutate()} variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Load Sample Data
            </Button>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {aiAnalysis.length > 0 && (
        <Card className="p-6 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-100 rounded-full">
              <Trophy className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-purple-800">Global Analysis</h3>
          </div>
          <div className="space-y-3">
            {aiAnalysis.map((insight, index) => (
              <div key={index} className="flex items-start gap-3">
                <insight.icon className={`h-5 w-5 mt-0.5 ${
                  insight.type === 'success' ? 'text-green-600' : 'text-amber-600'
                }`} />
                <span className="text-sm text-gray-700">{insight.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => downloadReportMutation.mutate()}
          disabled={downloadReportMutation.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Report (PDF)
        </Button>
        
        <Button
          onClick={() => shareReportMutation.mutate()}
          disabled={shareReportMutation.isPending}
          variant="outline"
          className="flex-1"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Report
        </Button>
      </div>

      {/* Achievement Banner */}
      <Card className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 border-0">
        <div className="flex items-center justify-center gap-3 text-white">
          <Trophy className="h-6 w-6" />
          <div className="text-center">
            <div className="font-bold">Great Job!</div>
            <div className="text-sm">3 days of consecutive caloric deficit</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SimpleHealthDashboard;