import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// TODO: RN-Adapt - `apiRequest` needs to be replaced with an RN-compatible API calling utility
// import { apiRequest } from '@/lib/queryClient'; // This was a PWA specific utility
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi, patchToApi } from '../services/apiClient';

import { useToast } from './use-toast';
import { z } from "zod";

/**
 * @file useUserSettings.ts
 * @description Custom hook for managing user settings.
 * It handles fetching user settings from the backend and provides a function to update them.
 * It uses Zod for schema validation of setting values if Zod is integrated into the project.
 */

// Define the Zod schema for settings form values if not already centralized
// This should match or be compatible with the schema in SettingsSection.tsx
// TODO: RN-Adapt - Ensure Zod is part of RN project dependencies if used for validation.
// Otherwise, these can be plain TypeScript interfaces.
/** @private Zod schema defining the structure and validation rules for user settings. */
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

/** Type representing the form values for user settings, inferred from Zod schema. */
export type UserSettingsFormValues = z.infer<typeof settingsFormSchema>;

/**
 * @interface UserSettingsData
 * @description Represents the complete user settings data structure, typically matching the backend model.
 * @extends UserSettingsFormValues
 * @property {string} [id] - Optional: User ID if returned by backend.
 * @property {string} [lastUpdated] - Optional: ISO timestamp of last update if returned by backend.
 */
export interface UserSettingsData extends UserSettingsFormValues {
  // id?: string;
  // lastUpdated?: string;
}

/**
 * Custom hook `useUserSettings` for fetching and updating user settings.
 *
 * @returns {object} An object containing:
 *  - `userSettings: UserSettingsData | undefined` - The current user settings. Undefined if not yet fetched.
 *  - `isLoadingSettings: boolean` - Loading state for fetching settings.
 *  - `settingsError: Error | null` - Error object if fetching settings fails.
 *  - `updateUserSettings: (data: Partial<UserSettingsFormValues>) => void` - Function to update user settings.
 *    Takes a partial settings object and patches it to the backend.
 *  - `isUpdatingSettings: boolean` - Loading state for settings update.
 */
export function useUserSettings() {
  const { toast } = useToast(); // Uses the 'toast' function from useToast's return
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
