import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Define types based on HealthDataSection.tsx
// These could be moved to a central types/health.ts file later
export interface HealthMetric {
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

export interface CategorizedHealthData {
  body_composition?: HealthMetric[]; // Made optional as API might not always return all
  cardiovascular?: HealthMetric[];
  lifestyle?: HealthMetric[];
  medical?: HealthMetric[];
  advanced?: HealthMetric[];
  // Add other categories as they become available
}

export function useHealthDataApi(timeRange: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug log when time range changes and invalidate previous queries
  React.useEffect(() => {
    console.log(`[useHealthDataApi] Time range changed to: ${timeRange}`);
    // Invalidate all health data queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['allHealthData'] });
  }, [timeRange, queryClient]);

  // Fetch all health data and categorize it on the client side
  const {
    data: allHealthData,
    isLoading,
    error,
    refetch,
  } = useQuery<HealthMetric[]>({
    queryKey: ['allHealthData', timeRange],
    queryFn: async () => {
      console.log(`[useHealthDataApi] Fetching all health data for range: ${timeRange}`);
      // Add timestamp to force cache bypass when time range changes
      const timestamp = Date.now();
      const response = await fetch(`/api/health-data?range=${timeRange}&t=${timestamp}`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to fetch all health data' }));
        throw new Error(errorBody.message || 'Failed to fetch all health data');
      }
      const data = await response.json();
      console.log(`[useHealthDataApi] Received ${data.length} health data items`);
      return data;
    },
    // Force refetch when query key changes
    enabled: true,
    staleTime: 0, // Consider data stale immediately when query key changes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Categorize data on the client side to avoid redundant API call
  const categorizedData = React.useMemo<CategorizedHealthData>(() => {
    if (!allHealthData) return {};
    
    const categorized: CategorizedHealthData = {
      body_composition: [],
      cardiovascular: [],
      lifestyle: [],
      medical: [],
      advanced: [],
    };

    allHealthData.forEach(metric => {
      const category = metric.category as keyof CategorizedHealthData;
      if (category && categorized[category]) {
        categorized[category]!.push(metric);
      }
    });

    console.log(`[useHealthDataApi] Categorized data:`, Object.keys(categorized).map(k => `${k}: ${categorized[k as keyof CategorizedHealthData]?.length || 0} items`));
    return categorized;
  }, [allHealthData]);

  return {
    categorizedData,
    allHealthData,
    isLoading,
    error,
    refetchHealthData: refetch,
  };
}
