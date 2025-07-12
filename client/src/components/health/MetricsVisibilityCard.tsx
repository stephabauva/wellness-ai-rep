import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Search, Heart, Activity, Zap, Stethoscope, Brain } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface HealthMetric {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface MetricsVisibilitySettings {
  visible_categories: string[];
  hidden_categories: string[];
  dashboard_preferences: {
    visible_metrics: string[];
    hidden_metrics: string[];
    metric_order: string[];
  };
}

export const MetricsVisibilityCard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Comprehensive health metrics list covering smartphone health tracking capabilities
  const allHealthMetrics: HealthMetric[] = [
    // Lifestyle & Activity
    { id: 'steps', name: 'Steps', category: 'Activity', description: 'Daily step count from accelerometer' },
    { id: 'distance_walked', name: 'Distance Walked/Run', category: 'Activity', description: 'GPS-tracked walking and running distance' },
    { id: 'flights_climbed', name: 'Flights Climbed', category: 'Activity', description: 'Stairs climbed using barometer' },
    { id: 'active_energy', name: 'Active Energy/Calories', category: 'Activity', description: 'Calories burned during activity' },
    { id: 'resting_energy', name: 'Resting Energy', category: 'Activity', description: 'Basal metabolic rate calories' },
    { id: 'exercise_minutes', name: 'Exercise Minutes', category: 'Activity', description: 'Minutes of elevated heart rate activity' },
    { id: 'stand_hours', name: 'Stand Hours', category: 'Activity', description: 'Hours with at least 1 minute of standing' },
    { id: 'workouts', name: 'Workouts', category: 'Activity', description: 'Structured exercise sessions' },
    
    // Cardiovascular
    { id: 'heart_rate', name: 'Heart Rate', category: 'Cardiovascular', description: 'Real-time heart rate from optical sensor' },
    { id: 'resting_heart_rate', name: 'Resting Heart Rate', category: 'Cardiovascular', description: 'Lowest heart rate during rest periods' },
    { id: 'walking_heart_rate', name: 'Walking Heart Rate Average', category: 'Cardiovascular', description: 'Average heart rate during walking' },
    { id: 'hrv', name: 'Heart Rate Variability (HRV)', category: 'Cardiovascular', description: 'Variation in time between heartbeats' },
    { id: 'high_low_hr_notifications', name: 'High and Low Heart Rate Notifications', category: 'Cardiovascular', description: 'Alerts for abnormal heart rate' },
    { id: 'irregular_rhythm', name: 'Irregular Rhythm Notifications', category: 'Cardiovascular', description: 'AFib detection alerts' },
    { id: 'ecg', name: 'ECG (Electrocardiogram)', category: 'Cardiovascular', description: 'Electrical heart activity readings' },
    { id: 'afib_history', name: 'AFib History', category: 'Cardiovascular', description: 'Atrial fibrillation detection history' },
    { id: 'blood_oxygen', name: 'Blood Oxygen (SpO2)', category: 'Cardiovascular', description: 'Oxygen saturation percentage' },
    { id: 'respiratory_rate', name: 'Respiratory Rate', category: 'Cardiovascular', description: 'Breaths per minute' },
    { id: 'blood_pressure', name: 'Blood Pressure', category: 'Cardiovascular', description: 'Systolic/diastolic pressure from connected cuffs' },
    
    // Sleep & Recovery
    { id: 'sleep_duration', name: 'Sleep Duration', category: 'Sleep', description: 'Total sleep time per night' },
    { id: 'sleep_stages', name: 'Sleep Stages', category: 'Sleep', description: 'Awake, Light, Deep, REM sleep phases' },
    { id: 'time_in_bed', name: 'Time in Bed', category: 'Sleep', description: 'Total time spent in bed' },
    { id: 'sleep_consistency', name: 'Sleep Consistency', category: 'Sleep', description: 'Regularity of sleep schedule' },
    { id: 'wrist_temperature', name: 'Wrist Temperature', category: 'Sleep', description: 'Skin temperature during sleep' },
    
    // Body Composition
    { id: 'body_weight', name: 'Body Weight', category: 'Body Composition', description: 'Weight from connected smart scales' },
    { id: 'body_fat_percentage', name: 'Body Fat Percentage', category: 'Body Composition', description: 'Body fat percentage from bioimpedance' },
    { id: 'bmi', name: 'Body Mass Index (BMI)', category: 'Body Composition', description: 'Calculated BMI from height/weight' },
    { id: 'lean_body_mass', name: 'Lean Body Mass', category: 'Body Composition', description: 'Muscle and bone mass' },
    
    // Fitness & Performance
    { id: 'cardio_fitness', name: 'Cardio Fitness (VO2 Max)', category: 'Fitness', description: 'Maximum oxygen uptake capacity' },
    { id: 'heart_rate_recovery', name: 'Heart Rate Recovery', category: 'Fitness', description: 'Heart rate decrease after exercise' },
    { id: 'readiness_score', name: 'Readiness Score/Body Battery', category: 'Fitness', description: 'Overall recovery and energy level' },
    { id: 'walking_steadiness', name: 'Walking Steadiness', category: 'Fitness', description: 'Gait stability and balance' },
    { id: 'walking_speed', name: 'Walking Speed', category: 'Fitness', description: 'Average walking pace' },
    { id: 'step_length', name: 'Step Length', category: 'Fitness', description: 'Average distance per step' },
    { id: 'walking_asymmetry', name: 'Walking Asymmetry', category: 'Fitness', description: 'Imbalance in left/right steps' },
    { id: 'double_support_time', name: 'Double Support Time', category: 'Fitness', description: 'Time both feet are on ground while walking' },
    
    // Environmental & Exposure
    { id: 'headphone_audio_levels', name: 'Headphone Audio Levels', category: 'Environmental', description: 'Hearing protection monitoring' },
    { id: 'environmental_audio', name: 'Environmental Audio Exposure', category: 'Environmental', description: 'Ambient noise level exposure' },
    { id: 'uv_exposure', name: 'UV Exposure', category: 'Environmental', description: 'Sun exposure tracking' },
    
    // Nutrition & Hydration
    { id: 'water_intake', name: 'Water Intake', category: 'Nutrition', description: 'Daily hydration tracking' },
    { id: 'caffeine_intake', name: 'Caffeine Intake', category: 'Nutrition', description: 'Coffee and caffeine consumption' },
    { id: 'nutrition_logging', name: 'Nutrition Logging', category: 'Nutrition', description: 'Food intake and macronutrients' },
    
    // Mental Health & Wellness
    { id: 'mindfulness_minutes', name: 'Mindfulness Minutes', category: 'Mental Health', description: 'Meditation and breathing exercises' },
    { id: 'stress_levels', name: 'Stress Levels', category: 'Mental Health', description: 'HRV-based stress detection' },
    { id: 'mood_tracking', name: 'Mood Tracking', category: 'Mental Health', description: 'Daily mood and emotion logging' },
    
    // Women's Health
    { id: 'menstrual_cycle', name: 'Menstrual Cycle Tracking', category: 'Reproductive Health', description: 'Period and fertility tracking' },
    { id: 'ovulation_tracking', name: 'Ovulation Tracking', category: 'Reproductive Health', description: 'Fertility window prediction' },
    { id: 'pregnancy_tracking', name: 'Pregnancy Tracking', category: 'Reproductive Health', description: 'Prenatal health monitoring' },
    
    // Medical Data
    { id: 'blood_glucose', name: 'Blood Glucose', category: 'Medical', description: 'Blood sugar levels from glucometers' },
    { id: 'medication_reminders', name: 'Medication Reminders', category: 'Medical', description: 'Prescription adherence tracking' },
    { id: 'symptoms_tracking', name: 'Symptoms Tracking', category: 'Medical', description: 'Health symptom logging' },
    { id: 'medical_appointments', name: 'Medical Appointments', category: 'Medical', description: 'Healthcare visit scheduling' },
    
    // Fall Detection & Safety
    { id: 'fall_detection', name: 'Fall Detection', category: 'Safety', description: 'Automatic fall detection and alerts' },
    { id: 'emergency_sos', name: 'Emergency SOS', category: 'Safety', description: 'Emergency contact alerts' },
    
    // Third-party Integration
    { id: 'third_party_apps', name: 'Third-party Health Apps', category: 'Integration', description: 'Data from connected health apps' },
    { id: 'clinical_records', name: 'Clinical Records', category: 'Integration', description: 'EHR and medical records integration' }
  ];

  // Get current visibility settings
  const { data: visibilitySettings, isLoading } = useQuery({
    queryKey: ['/api/health-consent/visibility'],
    queryFn: async (): Promise<MetricsVisibilitySettings> => {
      const response = await fetch('/api/health-consent/visibility');
      if (!response.ok) throw new Error('Failed to fetch visibility settings');
      return response.json();
    },
  });

  // Update visibility settings mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async (settings: MetricsVisibilitySettings) => {
      const response = await fetch('/api/health-consent/visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update visibility settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health-consent/visibility'] });
      toast({
        title: "Visibility Updated",
        description: "Dashboard metrics visibility has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update visibility settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Default settings for new users
  const defaultSettings: MetricsVisibilitySettings = {
    visible_categories: ['Activity', 'Cardiovascular', 'Sleep'],
    hidden_categories: ['Medical', 'Reproductive Health', 'Integration'],
    dashboard_preferences: {
      visible_metrics: ['steps', 'heart_rate', 'sleep_duration', 'active_energy'],
      hidden_metrics: [],
      metric_order: ['steps', 'heart_rate', 'sleep_duration', 'active_energy']
    }
  };

  const currentSettings = visibilitySettings || defaultSettings;

  // Filter metrics based on search term
  const filteredMetrics = useMemo(() => {
    if (!searchTerm) return allHealthMetrics;
    return allHealthMetrics.filter(metric => 
      metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metric.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      metric.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Group metrics by category
  const groupedMetrics = useMemo(() => {
    const groups: Record<string, HealthMetric[]> = {};
    filteredMetrics.forEach(metric => {
      if (!groups[metric.category]) {
        groups[metric.category] = [];
      }
      groups[metric.category].push(metric);
    });
    return groups;
  }, [filteredMetrics]);

  // Category visibility handlers
  const handleCategoryVisibilityToggle = (category: string, visible: boolean) => {
    const newSettings = { ...currentSettings };
    
    if (visible) {
      newSettings.visible_categories = [...newSettings.visible_categories.filter(c => c !== category), category];
      newSettings.hidden_categories = newSettings.hidden_categories.filter(c => c !== category);
    } else {
      newSettings.hidden_categories = [...newSettings.hidden_categories.filter(c => c !== category), category];
      newSettings.visible_categories = newSettings.visible_categories.filter(c => c !== category);
    }
    
    updateVisibilityMutation.mutate(newSettings);
  };

  // Individual metric visibility handlers
  const handleMetricVisibilityToggle = (metricId: string, visible: boolean) => {
    const newSettings = { ...currentSettings };
    
    if (visible) {
      newSettings.dashboard_preferences.visible_metrics = [
        ...newSettings.dashboard_preferences.visible_metrics.filter(m => m !== metricId), 
        metricId
      ];
      newSettings.dashboard_preferences.hidden_metrics = 
        newSettings.dashboard_preferences.hidden_metrics.filter(m => m !== metricId);
    } else {
      newSettings.dashboard_preferences.hidden_metrics = [
        ...newSettings.dashboard_preferences.hidden_metrics.filter(m => m !== metricId), 
        metricId
      ];
      newSettings.dashboard_preferences.visible_metrics = 
        newSettings.dashboard_preferences.visible_metrics.filter(m => m !== metricId);
    }
    
    updateVisibilityMutation.mutate(newSettings);
  };

  // Reset to defaults
  const handleResetToDefaults = () => {
    updateVisibilityMutation.mutate(defaultSettings);
  };

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Activity': return <Activity className="h-4 w-4" />;
      case 'Cardiovascular': return <Heart className="h-4 w-4" />;
      case 'Sleep': case 'Mental Health': return <Brain className="h-4 w-4" />;
      case 'Medical': case 'Reproductive Health': return <Stethoscope className="h-4 w-4" />;
      case 'Fitness': return <Zap className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Metrics Visibility</CardTitle>
          <CardDescription>Loading visibility settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Dashboard Metrics Visibility
        </CardTitle>
        <CardDescription>
          Control which health metrics are displayed on your dashboard. You can show or hide categories and individual metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search metrics or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={handleResetToDefaults}
            disabled={updateVisibilityMutation.isPending}
          >
            Reset to Defaults
          </Button>
        </div>

        {/* Categories and Metrics */}
        <div className="space-y-4">
          {Object.entries(groupedMetrics).map(([category, metrics]) => {
            const isCategoryVisible = currentSettings.visible_categories.includes(category);
            
            return (
              <div key={category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <Label className="text-base font-medium">{category}</Label>
                    <Badge variant={isCategoryVisible ? "default" : "secondary"}>
                      {metrics.length} metrics
                    </Badge>
                  </div>
                  <Switch
                    checked={isCategoryVisible}
                    onCheckedChange={(checked) => handleCategoryVisibilityToggle(category, checked)}
                    disabled={updateVisibilityMutation.isPending}
                  />
                </div>
                
                {isCategoryVisible && (
                  <>
                    <Separator className="mb-3" />
                    <div className="grid grid-cols-1 gap-2">
                      {metrics.map(metric => {
                        const isMetricVisible = currentSettings.dashboard_preferences.visible_metrics.includes(metric.id);
                        
                        return (
                          <div key={metric.id} className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm">{metric.name}</Label>
                                {isMetricVisible ? (
                                  <Eye className="h-3 w-3 text-green-600" />
                                ) : (
                                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              {metric.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {metric.description}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={isMetricVisible}
                              onCheckedChange={(checked) => handleMetricVisibilityToggle(metric.id, checked)}
                              disabled={updateVisibilityMutation.isPending}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Visible Categories:</strong> {currentSettings.visible_categories.length} of {Object.keys(groupedMetrics).length}
            </p>
            <p>
              <strong>Visible Metrics:</strong> {currentSettings.dashboard_preferences.visible_metrics.length} of {allHealthMetrics.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};