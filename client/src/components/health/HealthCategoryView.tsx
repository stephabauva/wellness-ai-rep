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
  // You could add props for trend charts or other visualizations specific to this category view later
}

export const HealthCategoryView: React.FC<HealthCategoryViewProps> = ({
  title,
  description,
  categoryKey,
  metrics,
  icon,
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
      />
      
      {/* Add heart rate chart for cardiovascular category */}
      {categoryKey === 'cardiovascular' && (
        <HeartRateChart data={heartRateData} />
      )}
    </div>
  );
};
