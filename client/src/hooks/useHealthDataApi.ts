import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
  const {
    data: categorizedData,
    isLoading: isLoadingCategorized,
    error: errorCategorized,
    refetch: refetchCategorized,
  } = useQuery<CategorizedHealthData>({
    queryKey: ['healthDataCategories', timeRange], // Include timeRange in queryKey
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
    queryKey: ['allHealthData', timeRange], // Include timeRange in queryKey
    queryFn: async () => {
      const response = await fetch(`/api/health-data?range=${timeRange}`);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to fetch all health data' }));
        throw new Error(errorBody.message || 'Failed to fetch all health data');
      }
      return response.json();
    },
  });

  // Combine loading and error states for simplicity, or can be handled separately
  const isLoading = isLoadingCategorized || isLoadingAll;
  const error = errorCategorized || errorAll;

  const refetchAllData = () => {
    refetchCategorized();
    refetchAll();
  }

  // Add optimistic health data creation mutation
  const createHealthDataMutation = useMutation({
    mutationFn: async (newData: any) => {
      return await apiRequest('/api/health-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['healthDataCategories', timeRange] });
      await queryClient.cancelQueries({ queryKey: ['allHealthData', timeRange] });
      
      // Snapshot the previous values
      const previousCategorized = queryClient.getQueryData(['healthDataCategories', timeRange]);
      const previousAll = queryClient.getQueryData(['allHealthData', timeRange]);
      
      // Optimistically update to the new value
      const optimisticData = {
        id: Date.now(),
        ...newData,
        timestamp: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['allHealthData', timeRange], (old: any) => 
        old ? [...old, optimisticData] : [optimisticData]
      );
      
      return { previousCategorized, previousAll };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousCategorized) {
        queryClient.setQueryData(['healthDataCategories', timeRange], context.previousCategorized);
      }
      if (context?.previousAll) {
        queryClient.setQueryData(['allHealthData', timeRange], context.previousAll);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['healthDataCategories', timeRange] });
      queryClient.invalidateQueries({ queryKey: ['allHealthData', timeRange] });
    },
  });

  return {
    categorizedData,
    allHealthData,
    isLoading,
    error,
    refetchHealthData: refetchAllData,
    createHealthData: createHealthDataMutation.mutate,
    isCreating: createHealthDataMutation.isPending,
  };
}
