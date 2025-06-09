import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HealthMetricsCard from '@/components/HealthMetricsCard'; // Assuming this path is correct
import { HealthMetric } from '@/hooks/useHealthDataApi';

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
  // The HealthMetricsCard is expected to handle an array of metrics and display them.
  // If metrics is undefined or empty, HealthMetricsCard should ideally handle this gracefully (e.g., show "No data").

  return (
    <div className="space-y-6"> {/* Matches spacing from original HealthDataSection */}
      <HealthMetricsCard
        title={title} // Pass title to HealthMetricsCard, or it generates its own
        category={categoryKey as string} // Pass category key
        metrics={metrics || []} // Pass the filtered metrics
        icon={icon} // Pass icon
      />
      {/*
        Placeholder for future trend chart specific to this category.
        This could be another component that takes 'metrics' as a prop.
      */}
      {/*
      <Card>
        <CardHeader>
          <CardTitle>{title} Trends</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Trend analysis for {title.toLowerCase()} coming soon...</p>
          // Here you could insert a specific chart component for this category
          // e.g., <BodyCompositionChart data={metrics} />
        </CardContent>
      </Card>
      */}
    </div>
  );
};
