import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@shared'; // Assuming apiRequest is a utility for making API calls
import { useToast } from '@shared/components/ui/use-toast';
import { z } from "zod"; // For FormValues type, assuming it's defined here or imported

// Define the Zod schema for settings form values if not already centralized
// This should match or be compatible with the schema in SettingsSection.tsx
export const settingsFormSchema = z.object({ // Export this schema
  username: z.string().optional(), // Add username here
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
  aiProvider: z.enum(["openai", "google"]),
  aiModel: z.string(),
  transcriptionProvider: z.enum(["webspeech", "openai", "google"]),
  preferredLanguage: z.string(),
  automaticModelSelection: z.boolean(),
  memoryDetectionProvider: z.enum(["google", "openai", "none"]),
  memoryDetectionModel: z.string(),
  // Retention settings might be handled by a separate hook/mutation if their API endpoint is different
  highValueRetentionDays: z.number().optional(), // Made optional if handled separately
  mediumValueRetentionDays: z.number().optional(),
  lowValueRetentionDays: z.number().optional(),
});

export type UserSettingsFormValues = z.infer<typeof settingsFormSchema>;

// Define a more specific type for the data returned by /api/settings
// This might be slightly different from FormValues (e.g. includes IDs or lastUpdated)
export interface UserSettingsData extends UserSettingsFormValues {
  // Add any additional fields that the API returns but are not in the form
  // For example: id: string; lastUpdated: string;
}


// Define default settings to be used as placeholderData
const defaultUserSettings: UserSettingsData = {
  username: "Guest",
  name: "User",
  email: "",
  primaryGoal: "general_wellness", // Assuming enum-like string values
  coachStyle: "balanced",
  reminderFrequency: "daily",
  focusAreas: ["stress_management"],
  darkMode: false,
  pushNotifications: true,
  emailSummaries: false,
  dataSharing: false,
  aiProvider: "google",
  aiModel: "gemini-2.0-flash-exp", // Ensure this is a valid default model
  transcriptionProvider: "webspeech",
  preferredLanguage: "en",
  automaticModelSelection: true,
  memoryDetectionProvider: "none",
  memoryDetectionModel: "",
  // Optional retention settings can be omitted or explicitly undefined if truly optional
  // highValueRetentionDays: undefined,
  // mediumValueRetentionDays: undefined,
  // lowValueRetentionDays: undefined,
};

export function useUserSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery<UserSettingsData>({
    queryKey: ['userSettings', '/api/settings'], // Unique queryKey
    queryFn: async () => {
      console.log('[useUserSettings] Fetching /api/settings...');
      const response = await fetch('/api/settings');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch settings' }));
        console.error('[useUserSettings] Error fetching settings:', errorData.message);
        throw new Error(errorData.message || 'Failed to fetch settings');
      }
      const settings = await response.json();
      console.log('[useUserSettings] Successfully fetched settings:', settings);
      return settings;
    },
    placeholderData: defaultUserSettings, // Provide placeholder data
    staleTime: 1000 * 60 * 5, // Cache settings for 5 minutes to reduce refetches
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettingsFormValues>) => { // Allow partial updates
      // Assuming apiRequest is a utility function that handles API calls
      // and PATCH method is used for updates.
      return apiRequest('PATCH', '/api/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings', '/api/settings'] });
      // Potentially invalidate other related queries if settings changes affect them
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
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
    settingsError,
    updateUserSettings: updateSettingsMutation.mutate,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}
