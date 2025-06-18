import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast'; // Adjusted path
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi } from '../services/apiClient'; // Import apiClient function

// Define types based on HealthDataSection.tsx
// These could be moved to a central types/health.ts file later
// TODO: RN-Adapt - Consider moving these types to a shared location if also used elsewhere in RN app
export interface HealthMetric {
  id: number;
  userId: number;
  dataType: string;
  value: string;
  unit: string | null;
  timestamp: string; // ISO Date string
  source: string | null;
  category: string | null;
  metadata: any; // Keep as any for now, can be refined
}

export interface CategorizedHealthData {
  body_composition?: HealthMetric[];
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
    queryFn: () => getFromApi<CategorizedHealthData>(`health-data/categories?range=${timeRange}`),
  });

  const {
    data: allHealthData,
    isLoading: isLoadingAll,
    error: errorAll,
    refetch: refetchAll,
  } = useQuery<HealthMetric[]>({
    queryKey: ['allHealthData', timeRange],
    queryFn: () => getFromApi<HealthMetric[]>(`health-data?range=${timeRange}`),
  });

  const isLoading = isLoadingCategorized || isLoadingAll;
  // TODO: RN-Adapt - error object might need specific typing if error structure is known
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
