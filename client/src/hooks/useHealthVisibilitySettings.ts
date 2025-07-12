import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
    queryFn: async () => {
      const response = await fetch('/api/health-consent/visibility');
      if (!response.ok) {
        throw new Error('Failed to fetch visibility settings');
      }
      return response.json();
    }
  });

  const updateVisibilityMutation = useMutation({
    mutationFn: async (newSettings: MetricsVisibilitySettings) => {
      const response = await fetch('/api/health-consent/visibility', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update visibility settings');
      }
      
      return response.json();
    },
    onSuccess: (updatedSettings) => {
      // Update the cache with the new settings
      queryClient.setQueryData(['healthVisibilitySettings', '/api/health-consent/visibility'], updatedSettings);
      
      toast({
        title: "Settings Updated",
        description: "Health dashboard visibility settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update visibility settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateVisibilityMutation.mutate,
    isUpdating: updateVisibilityMutation.isPending
  };
}