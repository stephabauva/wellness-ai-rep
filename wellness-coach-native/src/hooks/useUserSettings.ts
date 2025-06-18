import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// TODO: RN-Adapt - `apiRequest` needs to be replaced with an RN-compatible API calling utility
// import { apiRequest } from '@/lib/queryClient'; // This was a PWA specific utility
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi, patchToApi } from '../services/apiClient'; // Import apiClient functions

import { useToast } from './use-toast'; // Adjusted path
import { z } from "zod"; // Assuming Zod is available in RN project, or use basic types

// Define the Zod schema for settings form values if not already centralized
// This should match or be compatible with the schema in SettingsSection.tsx
// TODO: RN-Adapt - Ensure Zod is part of RN project dependencies if used for validation.
// Otherwise, these can be plain TypeScript interfaces.
const settingsFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  primaryGoal: z.string(),
  coachStyle: z.string(),
  reminderFrequency: z.string(),
  focusAreas: z.array(z.string()).min(1, { message: "Select at least one area of focus." }),
  darkMode: z.boolean(),
  pushNotifications: z.boolean(),
  emailSummaries: z.boolean(),
  dataSharing: z.boolean(),
  aiProvider: z.enum(["openai", "google"]), // TODO: RN-Adapt - Ensure enum values match available providers
  aiModel: z.string(),
  transcriptionProvider: z.enum(["webspeech", "openai", "google"]), // "webspeech" is browser specific
  preferredLanguage: z.string(),
  automaticModelSelection: z.boolean(),
  memoryDetectionProvider: z.enum(["google", "openai", "none"]),
  memoryDetectionModel: z.string(),
  highValueRetentionDays: z.number().optional(),
  mediumValueRetentionDays: z.number().optional(),
  lowValueRetentionDays: z.number().optional(),
});

export type UserSettingsFormValues = z.infer<typeof settingsFormSchema>;

export interface UserSettingsData extends UserSettingsFormValues {
  // id: string; // Example: if API returns ID
  // lastUpdated: string; // Example: if API returns last updated timestamp
}


export function useUserSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery<UserSettingsData>({
    queryKey: ['userSettings', '/api/settings'],
    queryFn: () => getFromApi<UserSettingsData>('settings'),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<UserSettingsFormValues>) =>
      patchToApi<UserSettingsData>('settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', '/api/settings'] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error: Error) => { // Explicitly type error
      toast({
        title: "Error updating settings",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    userSettings,
    isLoadingSettings,
    settingsError: settingsError as Error | null, // Cast error
    updateUserSettings: updateSettingsMutation.mutate,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}
