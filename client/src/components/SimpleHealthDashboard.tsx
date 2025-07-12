import React, { useState } from "react";
import { Download, Plus, Minus, Database, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [isManagingMetrics, setIsManagingMetrics] = useState(false);
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

  // Remove selected metrics
  const removeMetricsMutation = useMutation({
    mutationFn: async (metricsToRemove: string[]) => {
      const response = await fetch('/api/health-data/remove-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataTypes: metricsToRemove }),
      });
      if (!response.ok) throw new Error('Failed to remove metrics');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      setSelectedMetrics([]);
      setIsManagingMetrics(false);
      toast({ title: "Metrics removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove metrics", variant: "destructive" });
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

  // Group metrics by type for display
  const groupedMetrics = healthData.reduce((acc, metric) => {
    if (!acc[metric.dataType]) acc[metric.dataType] = [];
    acc[metric.dataType].push(metric);
    return acc;
  }, {} as Record<string, HealthMetric[]>);

  const handleMetricSelection = (dataType: string) => {
    setSelectedMetrics(prev => 
      prev.includes(dataType) 
        ? prev.filter(m => m !== dataType)
        : [...prev, dataType]
    );
  };

  const handleRemoveSelectedMetrics = () => {
    if (selectedMetrics.length > 0) {
      removeMetricsMutation.mutate(selectedMetrics);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Health Dashboard</h1>
          <p className="text-muted-foreground">Manage your health data and metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">1 Day</SelectItem>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => nativeSyncMutation.mutate()}
          disabled={nativeSyncMutation.isPending}
          className="flex items-center gap-2"
        >
          <Smartphone className="h-4 w-4" />
          Sync Phone Data
        </Button>
        
        <Button
          onClick={() => loadSampleMutation.mutate()}
          disabled={loadSampleMutation.isPending}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" />
          Load Sample Data
        </Button>
        
        <Button
          onClick={() => downloadReportMutation.mutate()}
          disabled={downloadReportMutation.isPending}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
        
        <Button
          onClick={() => setIsManagingMetrics(!isManagingMetrics)}
          variant={isManagingMetrics ? "destructive" : "outline"}
          className="flex items-center gap-2"
        >
          {isManagingMetrics ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isManagingMetrics ? "Done Managing" : "Manage Metrics"}
        </Button>
        
        {isManagingMetrics && selectedMetrics.length > 0 && (
          <Button
            onClick={handleRemoveSelectedMetrics}
            disabled={removeMetricsMutation.isPending}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Minus className="h-4 w-4" />
            Remove Selected ({selectedMetrics.length})
          </Button>
        )}
      </div>

      {/* Metrics Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedMetrics).map(([dataType, metrics]) => (
          <Card key={dataType} className="relative">
            {isManagingMetrics && (
              <div className="absolute top-2 right-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(dataType)}
                  onChange={() => handleMetricSelection(dataType)}
                  className="h-4 w-4"
                />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-sm font-medium capitalize">
                {dataType.replace('_', ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.slice(0, 3).map((metric) => (
                  <div key={metric.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(metric.timestamp).toLocaleDateString()}
                    </span>
                    <span className="font-medium">
                      {metric.value} {metric.unit}
                    </span>
                  </div>
                ))}
                {metrics.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{metrics.length - 3} more entries
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {Object.keys(groupedMetrics).length === 0 && (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              No health data available for the selected time range
            </div>
            <div className="space-x-2">
              <Button onClick={() => nativeSyncMutation.mutate()}>
                Sync Phone Data
              </Button>
              <Button onClick={() => loadSampleMutation.mutate()} variant="outline">
                Load Sample Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleHealthDashboard;