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

// Utility function to calculate metrics
const calculateMetrics = (data: HealthMetric[]) => {
  const metrics = {
    steps: 0,
    calories: 0,
    distance: 0,
    heartRate: 0,
    sleep: 0,
    weight: 0,
    activeMinutes: 0,
    hydration: 0,
  };

  data.forEach(item => {
    const value = parseFloat(item.value) || 0;
    switch (item.dataType) {
      case 'steps':
      case 'step_count':
        metrics.steps += value;
        break;
      case 'calories':
      case 'calories_burned':
        metrics.calories += value;
        break;
      case 'distance':
      case 'distance_walking':
        metrics.distance += value;
        break;
      case 'heart_rate':
        metrics.heartRate = Math.max(metrics.heartRate, value);
        break;
      case 'sleep':
      case 'sleep_duration':
        metrics.sleep += value;
        break;
      case 'weight':
      case 'body_weight':
        metrics.weight = value;
        break;
      case 'active_minutes':
      case 'physical_effort':
        metrics.activeMinutes += value;
        break;
      case 'water_intake':
      case 'hydration':
        metrics.hydration += value;
        break;
    }
  });

  return metrics;
};

// Component for time range toggle
const TimeRangeToggle = ({ timeRange, setTimeRange }: { timeRange: string; setTimeRange: (range: string) => void }) => (
  <div className="flex bg-gray-100 rounded-lg p-1 space-x-1">
    {['7days', '30days'].map(range => (
      <button
        key={range}
        onClick={() => setTimeRange(range)}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          timeRange === range
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {range === '7days' ? '7 days' : '30 days'}
      </button>
    ))}
  </div>
);

// Component for metric card
const MetricCard = ({ title, value, unit, trend }: { title: string; value: number; unit: string; trend?: 'up' | 'down' }) => (
  <Card className="bg-white border-gray-200">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">
            {value.toLocaleString()} <span className="text-sm font-normal text-gray-500">{unit}</span>
          </p>
        </div>
        {trend && (
          <div className={`p-2 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// Component for AI analysis
const AIAnalysis = () => (
  <Card className="bg-white border-gray-200">
    <CardContent className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <CheckCircle className="text-blue-600" size={16} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">AI Health Analysis</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-medium text-gray-900">Great activity levels</p>
            <p className="text-sm text-gray-600">Your daily step count is above average</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <CheckCircle className="text-green-500 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-medium text-gray-900">Good sleep pattern</p>
            <p className="text-sm text-gray-600">Consistent sleep duration detected</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <AlertCircle className="text-orange-500 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-medium text-gray-900">Hydration reminder</p>
            <p className="text-sm text-gray-600">Consider increasing water intake</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Component for action buttons
const ActionButtons = ({ onLoadSample, onDownloadReport, onShare, isLoading }: {
  onLoadSample: () => void;
  onDownloadReport: () => void;
  onShare: () => void;
  isLoading: boolean;
}) => (
  <div className="flex flex-wrap gap-3">
    <Button
      onClick={onLoadSample}
      disabled={isLoading}
      variant="outline"
      className="flex-1 min-w-0"
    >
      <Database className="mr-2" size={16} />
      Load Sample Data
    </Button>
    <Button
      onClick={onDownloadReport}
      disabled={isLoading}
      variant="outline"
      className="flex-1 min-w-0"
    >
      <Download className="mr-2" size={16} />
      Download PDF
    </Button>
    <Button
      onClick={onShare}
      disabled={isLoading}
      variant="outline"
      className="flex-1 min-w-0"
    >
      <Share2 className="mr-2" size={16} />
      Share Report
    </Button>
  </div>
);

const SimpleHealthDashboard: React.FC = () => {
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

  // Load sample data mutation
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

  // Download report mutation
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

  // Share report function
  const shareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Health Report',
          text: `My health report for the last ${timeRange}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Report link copied to clipboard" });
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => calculateMetrics(healthData), [healthData]);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Health Report</h1>
            <p className="text-blue-100 mt-1">Track your wellness journey</p>
          </div>
          <TimeRangeToggle timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Steps" value={metrics.steps} unit="steps" trend="up" />
        <MetricCard title="Calories" value={metrics.calories} unit="kcal" trend="up" />
        <MetricCard title="Distance" value={metrics.distance} unit="km" />
        <MetricCard title="Heart Rate" value={metrics.heartRate} unit="bpm" />
        <MetricCard title="Sleep" value={metrics.sleep} unit="hours" />
        <MetricCard title="Weight" value={metrics.weight} unit="kg" />
        <MetricCard title="Active Minutes" value={metrics.activeMinutes} unit="min" />
        <MetricCard title="Hydration" value={metrics.hydration} unit="L" />
      </div>

      {/* AI Analysis */}
      <AIAnalysis />

      {/* Action Buttons */}
      <ActionButtons
        onLoadSample={() => loadSampleMutation.mutate()}
        onDownloadReport={() => downloadReportMutation.mutate()}
        onShare={shareReport}
        isLoading={loadSampleMutation.isPending || downloadReportMutation.isPending}
      />

      {/* Achievement Banner */}
      <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Trophy size={24} />
            <div>
              <h3 className="text-lg font-semibold">Great Progress!</h3>
              <p className="text-yellow-100">You've been consistent with your health tracking</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleHealthDashboard;