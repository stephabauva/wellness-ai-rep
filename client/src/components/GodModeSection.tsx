import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { ShieldAlert, Database, Activity, TrendingUp, Users, AlertTriangle } from "lucide-react";

interface MemoryQualityMetrics {
  totalMemories: number;
  duplicateRate: number;
  averageImportanceScore: number;
  averageFreshness: number;
  categoryDistribution: Record<string, number>;
  qualityScore: number;
  potentialDuplicates: number;
  memoryAgeDistribution: {
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    older: number;
  };
}

interface MemoryOverview {
  total: number;
  categories: Record<string, number>;
  qualityMetrics: MemoryQualityMetrics;
}

export default function GodModeSection() {
  // Memory quality metrics query
  const { data: memoryQualityMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["memory-quality-metrics"],
    queryFn: async () => {
      const response = await fetch(`/api/memories/quality-metrics`);
      if (!response.ok) throw new Error("Failed to fetch memory quality metrics");
      return response.json() as MemoryQualityMetrics;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  // Memory overview for categories
  const { data: memoryOverview, isLoading: overviewLoading } = useQuery({
    queryKey: ["memory-overview"],
    queryFn: async () => {
      const response = await fetch(`/api/memories/overview`);
      if (!response.ok) throw new Error("Failed to fetch memory overview");
      return response.json() as MemoryOverview;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = metricsLoading || overviewLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <ShieldAlert className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold">Developer Monitoring</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold">Developer Monitoring</h2>
            <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-700">
              GOD MODE
            </Badge>
          </div>

          {/* Memory Quality Metrics */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Database className="h-5 w-5" />
                Memory System Quality
              </CardTitle>
              <CardDescription className="text-purple-700">
                Real-time monitoring of memory system health and quality metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memoryQualityMetrics && (
                <div className="space-y-6">
                  {/* Overall Quality Score */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        memoryQualityMetrics.qualityScore >= 0.8 ? 'text-green-600' :
                        memoryQualityMetrics.qualityScore >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(memoryQualityMetrics.qualityScore * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Overall Quality Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {memoryQualityMetrics.totalMemories}
                      </div>
                      <div className="text-sm text-gray-600">Total Memories</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        memoryQualityMetrics.duplicateRate <= 0.1 ? 'text-green-600' :
                        memoryQualityMetrics.duplicateRate <= 0.2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(memoryQualityMetrics.duplicateRate * 100)}%
                      </div>
                      <div className="text-sm text-gray-600">Duplicate Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {Math.round(memoryQualityMetrics.averageImportanceScore * 10) / 10}
                      </div>
                      <div className="text-sm text-gray-600">Avg. Importance</div>
                    </div>
                  </div>

                  {/* Detailed Metrics */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Detailed Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Quality Issues */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          Quality Issues
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Potential Duplicates:</span>
                            <span className={`font-medium ${
                              memoryQualityMetrics.potentialDuplicates > 5 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {memoryQualityMetrics.potentialDuplicates}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Average Freshness:</span>
                            <span className={`font-medium ${
                              memoryQualityMetrics.averageFreshness >= 0.7 ? 'text-green-600' :
                              memoryQualityMetrics.averageFreshness >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {Math.round(memoryQualityMetrics.averageFreshness * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Memory Age Distribution */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          Age Distribution
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Last Week:</span>
                            <span className="font-medium text-green-600">
                              {memoryQualityMetrics.memoryAgeDistribution.lastWeek}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Last Month:</span>
                            <span className="font-medium text-blue-600">
                              {memoryQualityMetrics.memoryAgeDistribution.lastMonth}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Last Year:</span>
                            <span className="font-medium text-orange-600">
                              {memoryQualityMetrics.memoryAgeDistribution.lastYear}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Older:</span>
                            <span className="font-medium text-gray-600">
                              {memoryQualityMetrics.memoryAgeDistribution.older}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Distribution */}
                  {memoryOverview && (
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Category Distribution
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-600">
                            {memoryOverview.categories.preferences || 0}
                          </div>
                          <div className="text-xs text-gray-600">Preferences</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {memoryOverview.categories.personal_context || 0}
                          </div>
                          <div className="text-xs text-gray-600">Personal Context</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-600">
                            {memoryOverview.categories.instructions || 0}
                          </div>
                          <div className="text-xs text-gray-600">Instructions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-orange-600">
                            {memoryOverview.categories.food_diet || 0}
                          </div>
                          <div className="text-xs text-gray-600">Food & Diet</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-teal-600">
                            {memoryOverview.categories.goals || 0}
                          </div>
                          <div className="text-xs text-gray-600">Goals</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Diagnostics Placeholder */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Activity className="h-5 w-5" />
                System Diagnostics
              </CardTitle>
              <CardDescription>
                Additional monitoring features can be added here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>Future system diagnostics will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}