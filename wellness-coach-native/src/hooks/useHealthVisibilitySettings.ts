import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast'; // Adjusted path
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi, patchToApi } from '../services/apiClient'; // Import apiClient functions

// TODO: RN-Adapt - Consider moving this type to a shared location if used elsewhere.
interface MetricsVisibilitySettings {
  visible_categories: string[];
  hidden_categories: string[];
  dashboard_preferences: {
    visible_metrics: string[];
    hidden_metrics: string[];
    metric_order: string[];
  };
}

export function useHealthVisibilitySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery<MetricsVisibilitySettings>({
    queryKey: ['healthVisibilitySettings', '/api/health-consent/visibility'],
    queryFn: () => getFromApi<MetricsVisibilitySettings>('health-consent/visibility'),
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: (newSettings: MetricsVisibilitySettings) =>
      patchToApi<MetricsVisibilitySettings>('health-consent/visibility', newSettings),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['healthVisibilitySettings', '/api/health-consent/visibility'], updatedSettings);

      toast({
        title: "Settings Updated",
        description: "Health dashboard visibility settings have been saved.",
      });
    },
    onError: (error: Error) => { // Explicitly type error as Error
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update visibility settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    settings,
    isLoading,
    error: error as Error | null, // Cast error for consumer
    updateSettings: updateVisibilityMutation.mutate,
    isUpdating: updateVisibilityMutation.isPending
  };
}
