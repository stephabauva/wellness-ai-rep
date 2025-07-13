import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Shield, Eye, EyeOff, Clock, Download, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@shared';
import { useToast } from '@/hooks/use-toast';
// Define local types to avoid import issues during Phase 1 implementation
interface HealthConsentSettings {
  data_visibility: {
    visible_categories: string[];
    hidden_categories: string[];
    dashboard_preferences: Record<string, any>;
  };
  ai_access_consent: {
    lifestyle: boolean;
    cardiovascular: boolean;
    body_composition: boolean;
    medical: boolean;
    advanced: boolean;
  };
  retention_policies: {
    lifestyle_days: number;
    cardiovascular_days: number;
    body_composition_days: number;
    medical_days: number;
    advanced_days: number;
  };
  export_controls: {
    auto_export_enabled: boolean;
    export_format: 'pdf' | 'json' | 'csv';
    include_ai_interactions: boolean;
  };
}

interface UserSettingsFormValues {
  username: string;
  email: string;
  name?: string;
  preferences?: any;
  transcriptionProvider: string;
  preferredLanguage: string;
  automaticModelSelection: boolean;
  aiProvider: string;
  aiModel: string;
  memoryDetectionProvider: string;
  memoryDetectionModel: string;
  health_consent?: HealthConsentSettings;
}

interface HealthDataConsentSettingsProps {
  settings?: UserSettingsFormValues;
  onSettingsUpdate: (newSettings: Partial<UserSettingsFormValues>) => void;
  isLoading?: boolean;
}

export const HealthDataConsentSettings: React.FC<HealthDataConsentSettingsProps> = ({
  settings,
  onSettingsUpdate,
  isLoading = false
}) => {
  const { toast } = useToast();

  // Default health consent settings for new users
  const defaultHealthConsent: HealthConsentSettings = {
    data_visibility: {
      visible_categories: ['lifestyle', 'cardiovascular', 'body_composition'],
      hidden_categories: ['medical', 'advanced'],
      dashboard_preferences: {}
    },
    ai_access_consent: {
      lifestyle: true,
      cardiovascular: true,
      body_composition: true,
      medical: false,
      advanced: false
    },
    retention_policies: {
      lifestyle_days: 365,
      cardiovascular_days: 365,
      body_composition_days: 365,
      medical_days: 90,
      advanced_days: 180
    },
    export_controls: {
      auto_export_enabled: false,
      export_format: 'pdf' as const,
      include_ai_interactions: false
    }
  };

  const currentHealthConsent = settings?.health_consent || defaultHealthConsent;

  const handleConsentUpdate = (category: string, enabled: boolean) => {
    const updatedConsent: HealthConsentSettings = {
      ...currentHealthConsent,
      ai_access_consent: {
        ...currentHealthConsent.ai_access_consent,
        [category]: enabled
      },
      data_visibility: {
        ...currentHealthConsent.data_visibility,
        visible_categories: enabled 
          ? [...currentHealthConsent.data_visibility.visible_categories.filter((c: string) => c !== category), category]
          : currentHealthConsent.data_visibility.visible_categories.filter((c: string) => c !== category),
        hidden_categories: enabled
          ? currentHealthConsent.data_visibility.hidden_categories.filter((c: string) => c !== category)
          : [...currentHealthConsent.data_visibility.hidden_categories.filter((c: string) => c !== category), category]
      }
    };

    onSettingsUpdate({
      health_consent: updatedConsent
    });

    toast({
      title: enabled ? "Access granted" : "Access restricted",
      description: `AI ${enabled ? 'can now access' : 'can no longer access'} your ${category.replace('_', ' ')} data.`
    });
  };

  const handleRetentionUpdate = (category: string, days: number) => {
    const updatedConsent: HealthConsentSettings = {
      ...currentHealthConsent,
      retention_policies: {
        ...currentHealthConsent.retention_policies,
        [`${category}_days` as keyof typeof currentHealthConsent.retention_policies]: days
      }
    };

    onSettingsUpdate({
      health_consent: updatedConsent
    });

    const daysText = days === -1 ? 'forever' : `${days} days`;
    toast({
      title: "Retention policy updated",
      description: `${category.replace('_', ' ')} data will be kept for ${daysText}.`
    });
  };

  const handleExportSettingUpdate = (key: keyof HealthConsentSettings['export_controls'], value: any) => {
    const updatedConsent: HealthConsentSettings = {
      ...currentHealthConsent,
      export_controls: {
        ...currentHealthConsent.export_controls,
        [key]: value
      }
    };

    onSettingsUpdate({
      health_consent: updatedConsent
    });
  };

  const toggleCategoryVisibility = (category: string, makeVisible: boolean) => {
    handleConsentUpdate(category, makeVisible);
  };

  const getCategoryDescription = (category: string): string => {
    const descriptions = {
      lifestyle: 'Steps, calories, activity levels, sleep patterns',
      cardiovascular: 'Heart rate, blood pressure, oxygen saturation',
      body_composition: 'Weight, BMI, body fat percentage, muscle mass',
      medical: 'Blood glucose, temperature, medication tracking',
      advanced: 'VO2 max, HRV, lactate threshold, performance metrics'
    };
    return descriptions[category as keyof typeof descriptions] || '';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lifestyle': return '🚶';
      case 'cardiovascular': return '❤️';
      case 'body_composition': return '⚖️';
      case 'medical': return '🏥';
      case 'advanced': return '📊';
      default: return '📋';
    }
  };

  const getRetentionText = (days: number): string => {
    if (days === -1) return 'Forever';
    if (days === 30) return '30 days';
    if (days === 90) return '90 days';
    if (days === 180) return '6 months';
    if (days === 365) return '1 year';
    return `${days} days`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold">Health Data & Privacy</h2>
          <p className="text-muted-foreground">
            Control how your health data is accessed, stored, and used by AI features
          </p>
        </div>
      </div>

      {/* GDPR Notice */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            GDPR Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <p>
            You have full control over your health data. You can modify these settings at any time, 
            export your data, or request complete deletion. All access is logged for transparency.
          </p>
        </CardContent>
      </Card>

      {/* AI Access Consent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            AI Access Consent
          </CardTitle>
          <CardDescription>
            Control which health data categories your AI coach can access for personalized insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(currentHealthConsent.ai_access_consent).map(([category, enabled]) => (
            <div key={category} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center space-y-0.5 gap-3">
                <span className="text-2xl">{getCategoryIcon(category)}</span>
                <div>
                  <Label className="text-base capitalize font-medium">
                    {category.replace('_', ' ')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {getCategoryDescription(category)}
                  </p>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => handleConsentUpdate(category, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Retention Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Data Retention Policies
          </CardTitle>
          <CardDescription>
            Set how long different types of health data are stored in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(currentHealthConsent.retention_policies).map(([key, days]) => {
            const category = key.replace('_days', '');
            return (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getCategoryIcon(category)}</span>
                  <Label className="capitalize font-medium">
                    {category.replace('_', ' ')}
                  </Label>
                </div>
                <Select
                  value={days.toString()}
                  onValueChange={(value) => handleRetentionUpdate(category, parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="-1">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Dashboard Visibility moved to Health Dashboard for better UX */}
      {/* Users can now directly customize metrics from the health dashboard interface */}

      {/* Data Export & Portability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export & Portability
          </CardTitle>
          <CardDescription>
            GDPR-compliant data export and portability options for your health data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <Label htmlFor="auto-export">Auto-export enabled</Label>
            <Switch
              id="auto-export"
              checked={currentHealthConsent.export_controls.auto_export_enabled}
              onCheckedChange={(checked: boolean) => handleExportSettingUpdate('auto_export_enabled', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <Label>Export format</Label>
            <Select
              value={currentHealthConsent.export_controls.export_format}
              onValueChange={(value: string) => handleExportSettingUpdate('export_format', value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <Label htmlFor="include-ai">Include AI interactions</Label>
            <Switch
              id="include-ai"
              checked={currentHealthConsent.export_controls.include_ai_interactions}
              onCheckedChange={(checked: boolean) => handleExportSettingUpdate('include_ai_interactions', checked)}
            />
          </div>

          <Separator />
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export My Data
            </Button>
            <Button variant="outline" size="sm">
              View Access Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warning Notice */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Important Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 dark:text-amber-200">
          <p>
            Restricting AI access to certain health categories may limit the quality of personalized recommendations. 
            You can always adjust these settings later as your comfort level changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};