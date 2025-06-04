import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Download, Activity, Heart, Brain, Stethoscope, Zap } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { generatePDF } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import HealthMetricsCard from "@/components/HealthMetricsCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface HealthMetric {
  id: number;
  userId: number;
  dataType: string;
  value: string;
  unit: string | null;
  timestamp: string;
  source: string | null;
  category: string | null;
  metadata: any;
}

interface CategorizedHealthData {
  body_composition: HealthMetric[];
  cardiovascular: HealthMetric[];
  lifestyle: HealthMetric[];
  medical: HealthMetric[];
  advanced: HealthMetric[];
}

const HealthDataSection: React.FC = () => {
  const [timeRange, setTimeRange] = useState("7days");
  const [activeCategory, setActiveCategory] = useState("overview");
  const { toast } = useToast();
  
  // Fetch categorized health data
  const { data: categorizedData, isLoading } = useQuery({
    queryKey: ['/api/health-data/categories', timeRange],
    queryFn: async ({ queryKey }) => {
      const [_, range] = queryKey;
      const response = await fetch(`/api/health-data/categories?range=${range}`);
      if (!response.ok) throw new Error('Failed to fetch health data');
      return await response.json() as CategorizedHealthData;
    }
  });

  // Fetch all health data for overview
  const { data: allHealthData } = useQuery({
    queryKey: ['/api/health-data', timeRange],
    queryFn: async ({ queryKey }) => {
      const [_, range] = queryKey;
      const response = await fetch(`/api/health-data?range=${range}`);
      if (!response.ok) throw new Error('Failed to fetch health data');
      return await response.json() as HealthMetric[];
    }
  });
  
  // Download PDF report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/reports/health-pdf', {});
      return response.json();
    },
    onSuccess: (data) => {
      generatePDF(data);
      toast({
        title: "Report downloaded",
        description: "Your health report has been downloaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download the health report. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Mock data for charts until real data is available
  const activityData = [
    { day: 'Mon', steps: 5240, active: 45, calories: 320 },
    { day: 'Tue', steps: 7800, active: 60, calories: 450 },
    { day: 'Wed', steps: 5900, active: 50, calories: 380 },
    { day: 'Thu', steps: 9500, active: 85, calories: 620 },
    { day: 'Fri', steps: 8200, active: 70, calories: 530 },
    { day: 'Sat', steps: 6300, active: 55, calories: 410 },
    { day: 'Sun', steps: 8700, active: 75, calories: 560 },
  ];
  
  const sleepData = [
    { day: 'Mon', deep: 1.8, light: 4.5, rem: 1.2 },
    { day: 'Tue', deep: 2.0, light: 4.0, rem: 1.5 },
    { day: 'Wed', deep: 1.5, light: 5.0, rem: 1.0 },
    { day: 'Thu', deep: 2.2, light: 3.5, rem: 1.8 },
    { day: 'Fri', deep: 1.9, light: 4.2, rem: 1.3 },
    { day: 'Sat', deep: 2.5, light: 4.5, rem: 1.5 },
    { day: 'Sun', deep: 2.1, light: 4.0, rem: 1.4 },
  ];
  
  const nutritionData = [
    { name: 'Protein', value: 76, goal: 110, percent: 69 },
    { name: 'Carbs', value: 215, goal: 250, percent: 86 },
    { name: 'Fat', value: 62, goal: 73, percent: 85 },
    { name: 'Fiber', value: 18, goal: 30, percent: 60 },
  ];
  
  const COLORS = ['#8B5CF6', '#60A5FA', '#10B981', '#F59E0B', '#EF4444'];
  
  // Helper function to get the latest value for a metric type
  const getLatestMetric = (metrics: HealthMetric[], dataType: string) => {
    return metrics
      .filter(m => m.dataType === dataType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6">
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
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => downloadReportMutation.mutate()}
                disabled={downloadReportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
            </div>
          ) : allHealthData && (
            <>
              {/* Key Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                  title="Daily Steps"
                  value={getLatestMetric(allHealthData, 'steps')?.value || "0"}
                  unit="steps"
                  change={12}
                  goalValue={10000}
                  progress={72}
                  icon={<Activity className="h-4 w-4" />}
                />
                
                <StatCard 
                  title="Sleep Duration"
                  value={getLatestMetric(allHealthData, 'sleep_duration')?.value || "0"}
                  unit="hours"
                  change={-5}
                  goalValue={"8"}
                  progress={85}
                  icon={<Brain className="h-4 w-4" />}
                />
                
                <StatCard 
                  title="Heart Rate"
                  value={getLatestMetric(allHealthData, 'heart_rate')?.value || "0"}
                  unit="bpm"
                  status="Normal"
                  statusColor="green"
                  icon={<Heart className="h-4 w-4" />}
                />
                
                <StatCard 
                  title="Current Weight"
                  value={getLatestMetric(allHealthData, 'weight')?.value || "0"}
                  unit={getLatestMetric(allHealthData, 'weight')?.unit || "lbs"}
                  change={-2.5}
                  startValue="167.5 lbs"
                  goalValue="150 lbs"
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>

              {/* Comprehensive Health Categories */}
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="body_composition">Body</TabsTrigger>
                  <TabsTrigger value="cardiovascular">Heart</TabsTrigger>
                  <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {categorizedData?.body_composition && (
                      <HealthMetricsCard
                        title="Body Composition"
                        category="body_composition"
                        metrics={categorizedData.body_composition}
                        icon={<Activity className="h-5 w-5" />}
                      />
                    )}
                    {categorizedData?.cardiovascular && (
                      <HealthMetricsCard
                        title="Cardiovascular Health"
                        category="cardiovascular"
                        metrics={categorizedData.cardiovascular}
                        icon={<Heart className="h-5 w-5" />}
                      />
                    )}
                    {categorizedData?.lifestyle && (
                      <HealthMetricsCard
                        title="Lifestyle & Wellness"
                        category="lifestyle"
                        metrics={categorizedData.lifestyle}
                        icon={<Brain className="h-5 w-5" />}
                      />
                    )}
                    {categorizedData?.medical && (
                      <HealthMetricsCard
                        title="Medical Metrics"
                        category="medical"
                        metrics={categorizedData.medical}
                        icon={<Stethoscope className="h-5 w-5" />}
                      />
                    )}
                    {categorizedData?.advanced && (
                      <HealthMetricsCard
                        title="Advanced Analytics"
                        category="advanced"
                        metrics={categorizedData.advanced}
                        icon={<Zap className="h-5 w-5" />}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="body_composition" className="space-y-6 mt-6">
                  {categorizedData?.body_composition && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <HealthMetricsCard
                        title="Body Composition Analysis"
                        category="body_composition"
                        metrics={categorizedData.body_composition}
                        icon={<Activity className="h-5 w-5" />}
                      />
                      <Card>
                        <CardHeader>
                          <CardTitle>Body Composition Trends</CardTitle>
                          <CardDescription>Track changes in weight, BMI, and body fat percentage</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Trend analysis coming soon...</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cardiovascular" className="space-y-6 mt-6">
                  {categorizedData?.cardiovascular && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <HealthMetricsCard
                        title="Cardiovascular Metrics"
                        category="cardiovascular"
                        metrics={categorizedData.cardiovascular}
                        icon={<Heart className="h-5 w-5" />}
                      />
                      <Card>
                        <CardHeader>
                          <CardTitle>Heart Health Trends</CardTitle>
                          <CardDescription>Monitor blood pressure, heart rate, and cholesterol levels</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Cardiovascular trend analysis coming soon...</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="lifestyle" className="space-y-6 mt-6">
                  {categorizedData?.lifestyle && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <HealthMetricsCard
                        title="Lifestyle Metrics"
                        category="lifestyle"
                        metrics={categorizedData.lifestyle}
                        icon={<Brain className="h-5 w-5" />}
                      />
                      <Card>
                        <CardHeader>
                          <CardTitle>Activity & Sleep Patterns</CardTitle>
                          <CardDescription>Daily activity, sleep quality, and wellness indicators</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Lifestyle trend analysis coming soon...</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="medical" className="space-y-6 mt-6">
                  {categorizedData?.medical && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <HealthMetricsCard
                        title="Medical Indicators"
                        category="medical"
                        metrics={categorizedData.medical}
                        icon={<Stethoscope className="h-5 w-5" />}
                      />
                      <Card>
                        <CardHeader>
                          <CardTitle>Medical Monitoring</CardTitle>
                          <CardDescription>Blood glucose, lab results, and health indicators</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Medical trend analysis coming soon...</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6 mt-6">
                  {categorizedData?.advanced && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <HealthMetricsCard
                        title="Advanced Analytics"
                        category="advanced"
                        metrics={categorizedData.advanced}
                        icon={<Zap className="h-5 w-5" />}
                      />
                      <Card>
                        <CardHeader>
                          <CardTitle>Performance Metrics</CardTitle>
                          <CardDescription>VO2 max, lactate threshold, and advanced fitness indicators</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">Advanced analytics coming soon...</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Activity Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity Trend</CardTitle>
                <CardDescription>Steps, active minutes, and calories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activityData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="steps" name="Steps (x100)" fill="hsl(var(--primary))" />
                      <Bar yAxisId="right" dataKey="active" name="Active Minutes" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sleep Quality Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sleep Quality</CardTitle>
                <CardDescription>Deep, light, and REM sleep patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sleepData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      stackOffset="expand"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="deep" name="Deep Sleep" stackId="a" fill="hsl(var(--secondary))" />
                      <Bar dataKey="light" name="Light Sleep" stackId="a" fill="hsl(var(--secondary) / 0.6)" />
                      <Bar dataKey="rem" name="REM Sleep" stackId="a" fill="hsl(271 81% 56%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nutrition & Hydration */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Nutrition */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Nutrition Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {nutritionData.map((item) => (
                    <div key={item.name} className="border border-border rounded-lg p-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">{item.name}</h4>
                      <div className="flex justify-between items-center">
                        <p className="text-lg font-semibold">{item.value}g</p>
                        <p className="text-sm text-muted-foreground">/ {item.goal}g</p>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${item.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Calories */}
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Calories</h4>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-semibold">1,842</p>
                      <p className="text-sm text-muted-foreground">/ 2,200</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                  
                  {/* Sugar */}
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Sugar</h4>
                    <div className="flex justify-between items-center">
                      <p className="text-lg font-semibold">42g</p>
                      <p className="text-sm text-muted-foreground">/ 50g</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hydration */}
            <Card>
              <CardHeader>
                <CardTitle>Hydration</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Consumed', value: 1.3 },
                          { name: 'Remaining', value: 0.7 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--secondary))" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">65%</span>
                    <span className="text-sm text-muted-foreground">1.3/2L</span>
                  </div>
                </div>
                
                <div className="mt-6 w-full">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Morning</span>
                    <span>Afternoon</span>
                    <span>Evening</span>
                  </div>
                  <div className="flex space-x-1 mt-2">
                    <div className="w-1/6 bg-secondary h-4 rounded-l"></div>
                    <div className="w-1/6 bg-secondary h-4"></div>
                    <div className="w-1/6 bg-secondary/60 h-4"></div>
                    <div className="w-1/6 bg-secondary h-4"></div>
                    <div className="w-1/6 bg-secondary/60 h-4"></div>
                    <div className="w-1/6 bg-muted h-4 rounded-r"></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Remember to drink water consistently throughout the day.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Coaching Insights */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Coaching Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium">Activity Assessment</h4>
                    <p className="mt-1 text-muted-foreground">
                      You're making good progress with your daily activity. Your step count has increased by 12% this week. 
                      Continue aiming for 10,000 steps and try to include at least 30 minutes of moderate exercise.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium">Sleep Quality</h4>
                    <p className="mt-1 text-muted-foreground">
                      Your sleep quality has slightly decreased. You're getting enough total sleep but could improve your deep sleep phase. 
                      Try to establish a consistent bedtime routine and limit screen time before bed.
                    </p>
                  </div>
                </div>
                
                <div className="flex">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium">Heart Health</h4>
                    <p className="mt-1 text-muted-foreground">
                      Your resting heart rate remains in a healthy range. Your recovery rate after workouts has improved by 8%, 
                      indicating better cardiovascular fitness.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HealthDataSection;
