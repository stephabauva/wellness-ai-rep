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

  const {
    data: categorizedData,
    isLoading: isLoadingCategorized,
    error: errorCategorized,
    refetch: refetchCategorized,
  } = useQuery<CategorizedHealthData>({
    queryKey: ['healthDataCategories', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/health-data/categories?range=${timeRange}`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to fetch categorized health data' }));
        throw new Error(errorBody.message || 'Failed to fetch categorized health data');
      }
      return response.json();
    },
  });

  const {
    data: allHealthData,
    isLoading: isLoadingAll,
    error: errorAll,
    refetch: refetchAll,
  } = useQuery<HealthMetric[]>({
    queryKey: ['allHealthData', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/health-data?range=${timeRange}`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to fetch all health data' }));
        throw new Error(errorBody.message || 'Failed to fetch all health data');
      }
      return response.json();
    },
  });

  const isLoading = isLoadingCategorized || isLoadingAll;
  const error = errorCategorized || errorAll;

  const refetchAllData = () => {
    refetchCategorized();
    refetchAll();
  }

  return {
    categorizedData,
    allHealthData,
    isLoading,
    error,
    refetchHealthData: refetchAllData,
  };
}
