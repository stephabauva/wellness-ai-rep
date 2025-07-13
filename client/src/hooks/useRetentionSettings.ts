import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/shared';
import { useToast } from '@/hooks/use-toast';
import { z } from "zod";

// Schema for retention settings form values
const retentionSettingsFormSchema = z.object({
  highValueRetentionDays: z.number(),
  mediumValueRetentionDays: z.number(),
  lowValueRetentionDays: z.number(),
});

export type RetentionSettingsFormValues = z.infer<typeof retentionSettingsFormSchema>;

// Type for data returned by /api/retention-settings
export interface RetentionSettingsData extends RetentionSettingsFormValues {
  // Add any additional fields if the API returns more
}

export function useRetentionSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: retentionSettings, isLoading: isLoadingRetentionSettings, error: retentionSettingsError } = useQuery<RetentionSettingsData>({
    queryKey: ['retentionSettings', '/api/retention-settings'],
    queryFn: async () => {
      const response = await fetch('/api/retention-settings');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch retention settings' }));
        throw new Error(errorData.message || 'Failed to fetch retention settings');
      }
      return await response.json();
    },
  });

  const updateRetentionSettingsMutation = useMutation({
    mutationFn: async (data: Partial<RetentionSettingsFormValues>) => {
      // Assuming there's an endpoint to update these, e.g., PATCH /api/retention-settings
      return apiRequest('PATCH', '/api/retention-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retentionSettings', '/api/retention-settings'] });
      // Also invalidate general user settings if retention is part of it or displayed together
      queryClient.invalidateQueries({ queryKey: ['userSettings', '/api/settings'] });
      toast({
        title: "Retention settings updated",
        description: "File retention periods have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating retention settings",
        description: error.message || "Failed to update retention settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    retentionSettings,
    isLoadingRetentionSettings,
    retentionSettingsError,
    updateRetentionSettings: updateRetentionSettingsMutation.mutate,
    isUpdatingRetentionSettings: updateRetentionSettingsMutation.isPending,
  };
}
