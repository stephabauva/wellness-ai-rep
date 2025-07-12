import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Minus, Heart, Activity, Zap, Stethoscope, Brain, Shield, Droplets, Moon, Users, Utensils, Eye } from 'lucide-react';
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

export const RemoveMetricsModal: React.FC = () => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Comprehensive health metrics list
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
    { id: 'weight', name: 'Weight', category: 'Body Composition', description: 'Body weight measurement' },
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
  const { data: visibilitySettings } = useQuery({
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
        title: "Metrics Removed",
        description: `${selectedMetrics.length} metric(s) have been removed from your dashboard.`,
      });
      setSelectedMetrics([]);
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to Remove Metrics",
        description: "Unable to remove metrics from dashboard. Please try again.",
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

  // Get currently visible metrics
  const visibleMetrics = allHealthMetrics.filter(metric => 
    currentSettings.dashboard_preferences.visible_metrics.includes(metric.id)
  );

  // Remove selected metrics from dashboard
  const removeSelectedMetrics = () => {
    if (selectedMetrics.length === 0) return;

    const newSettings = { ...currentSettings };
    
    // Remove selected metrics from visible list and add to hidden list
    newSettings.dashboard_preferences.visible_metrics = 
      newSettings.dashboard_preferences.visible_metrics.filter(id => !selectedMetrics.includes(id));
    
    selectedMetrics.forEach(metricId => {
      if (!newSettings.dashboard_preferences.hidden_metrics.includes(metricId)) {
        newSettings.dashboard_preferences.hidden_metrics.push(metricId);
      }
    });

    updateVisibilityMutation.mutate(newSettings);
  };

  // Toggle metric selection
  const toggleMetricSelection = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Activity': return <Activity className="h-4 w-4" />;
      case 'Cardiovascular': return <Heart className="h-4 w-4" />;
      case 'Sleep': return <Moon className="h-4 w-4" />;
      case 'Mental Health': return <Brain className="h-4 w-4" />;
      case 'Medical': return <Stethoscope className="h-4 w-4" />;
      case 'Reproductive Health': return <Users className="h-4 w-4" />;
      case 'Fitness': return <Zap className="h-4 w-4" />;
      case 'Environmental': return <Shield className="h-4 w-4" />;
      case 'Nutrition': return <Utensils className="h-4 w-4" />;
      case 'Body Composition': return <Activity className="h-4 w-4" />;
      case 'Safety': return <Shield className="h-4 w-4" />;
      case 'Integration': return <Eye className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Minus className="h-4 w-4 mr-2" />
          Remove Metrics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5" />
            Remove Health Metrics from Dashboard
          </DialogTitle>
          <DialogDescription>
            Select the metrics you want to remove from your dashboard. You can add them back later using the "Add Metrics" button.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {visibleMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No metrics are currently visible on your dashboard.</p>
              <p className="text-sm mt-2">Use the "Add Metrics" button to add some metrics first.</p>
            </div>
          ) : (
            <>
              {/* Selected count */}
              <div className="text-sm text-muted-foreground">
                {selectedMetrics.length > 0 && (
                  <p>{selectedMetrics.length} metric(s) selected for removal</p>
                )}
              </div>

              {/* Metrics list */}
              <ScrollArea className="h-[40vh]">
                <div className="space-y-2 pr-4">
                  {visibleMetrics.map(metric => (
                    <div
                      key={metric.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={metric.id}
                        checked={selectedMetrics.includes(metric.id)}
                        onCheckedChange={() => toggleMetricSelection(metric.id)}
                      />
                      
                      <div className="flex items-center gap-2 flex-1">
                        {getCategoryIcon(metric.category)}
                        <div className="flex-1">
                          <label 
                            htmlFor={metric.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {metric.name}
                          </label>
                          {metric.description && (
                            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {metric.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedMetrics([])}
                  disabled={selectedMetrics.length === 0}
                >
                  Clear Selection
                </Button>
                
                <Button
                  onClick={removeSelectedMetrics}
                  disabled={selectedMetrics.length === 0 || updateVisibilityMutation.isPending}
                  variant="destructive"
                >
                  {updateVisibilityMutation.isPending ? "Removing..." : `Remove ${selectedMetrics.length} Metric(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};