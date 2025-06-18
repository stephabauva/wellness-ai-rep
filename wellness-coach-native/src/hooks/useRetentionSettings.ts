import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// TODO: RN-Adapt - `apiRequest` needs to be replaced with an RN-compatible API calling utility
// import { apiRequest } from '@/lib/queryClient'; // This was a PWA specific utility
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi, patchToApi } from '../services/apiClient'; // Import apiClient functions

import { useToast } from './use-toast'; // Adjusted path
import { z } from "zod"; // Assuming Zod is available in RN project, or use basic types

// Schema for retention settings form values
// TODO: RN-Adapt - Ensure Zod is part of RN project dependencies if used for validation.
// Otherwise, these can be plain TypeScript interfaces.
const retentionSettingsFormSchema = z.object({
  highValueRetentionDays: z.number(),
  mediumValueRetentionDays: z.number(),
  lowValueRetentionDays: z.number(),
});

export type RetentionSettingsFormValues = z.infer<typeof retentionSettingsFormSchema>;

export interface RetentionSettingsData extends RetentionSettingsFormValues {
  // Add any additional fields if the API returns more
}

export function useRetentionSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: retentionSettings, isLoading: isLoadingRetentionSettings, error: retentionSettingsError } = useQuery<RetentionSettingsData>({
    queryKey: ['retentionSettings', '/api/retention-settings'],
    queryFn: () => getFromApi<RetentionSettingsData>('retention-settings'),
  });

  const updateRetentionSettingsMutation = useMutation({
    mutationFn: (data: Partial<RetentionSettingsFormValues>) =>
      patchToApi<RetentionSettingsData>('retention-settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retentionSettings', '/api/retention-settings'] });
      queryClient.invalidateQueries({ queryKey: ['userSettings', '/api/settings'] }); // If related
      toast({
        title: "Retention settings updated",
        description: "File retention periods have been saved.",
      });
    },
    onError: (error: Error) => { // Explicitly type error
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
    retentionSettingsError: retentionSettingsError as Error | null, // Cast error
    updateRetentionSettings: updateRetentionSettingsMutation.mutate,
    isUpdatingRetentionSettings: updateRetentionSettingsMutation.isPending,
  };
}
