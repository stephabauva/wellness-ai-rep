import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HealthMetricsCard from '@/components/HealthMetricsCard'; // Assuming this path is correct
import { HealthMetric } from '@/hooks/useHealthDataApi';
import { HeartRateChart } from '@/components/health/HeartRateChart';

interface HealthCategoryViewProps {
  title: string;
  description: string;
  categoryKey: keyof import('@/hooks/useHealthDataApi').CategorizedHealthData; // e.g., 'body_composition'
  metrics: HealthMetric[] | undefined; // Array of metrics for this category
  icon: React.ReactNode; // Icon for the category title
  isRemovalMode?: boolean;
  selectedMetricsForRemoval?: string[];
  onMetricSelectionChange?: (selectedMetrics: string[]) => void;
  visibilitySettings?: {
    dashboard_preferences: {
      visible_metrics: string[];
      hidden_metrics: string[];
    };
  };
}

export const HealthCategoryView: React.FC<HealthCategoryViewProps> = ({
  title,
  description,
  categoryKey,
  metrics,
  icon,
  isRemovalMode = false,
  selectedMetricsForRemoval = [],
  onMetricSelectionChange = () => {},
  visibilitySettings
}) => {
  // Filter heart rate data for cardiovascular category
  const heartRateData = categoryKey === 'cardiovascular' 
    ? (metrics || []).filter(metric => metric.dataType === 'heart_rate')
    : [];

  return (
    <div className="space-y-6">
      <HealthMetricsCard
        title={title}
        category={categoryKey as string}
        metrics={metrics || []}
        icon={icon}
        isRemovalMode={isRemovalMode}
        selectedMetricsForRemoval={selectedMetricsForRemoval}
        onMetricSelectionChange={onMetricSelectionChange}
        visibilitySettings={visibilitySettings}
      />
      
      {/* Add heart rate chart for cardiovascular category */}
      {categoryKey === 'cardiovascular' && (
        <HeartRateChart data={heartRateData} />
      )}
    </div>
  );
};
