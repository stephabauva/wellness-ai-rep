import React, { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form"; // Only Form component needed at top level
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";

// Import hooks
import { useUserSettings, UserSettingsFormValues } from "@/hooks/useUserSettings";
import { useRetentionSettings, RetentionSettingsFormValues } from "@/hooks/useRetentionSettings";
import { useAiModels } from "@/hooks/useAiModels";

// Import sub-components
import { AccountSettings } from "./settings/AccountSettings";
import { CoachingPreferencesSettings } from "./settings/CoachingPreferencesSettings";
import { AppPreferencesSettings } from "./settings/AppPreferencesSettings";
import { FileManagementSettings } from "./settings/FileManagementSettings";
import { AiConfigurationSettings } from "./settings/AiConfigurationSettings";

// Define the combined Zod schema for the entire settings form
// This should be compatible with UserSettingsFormValues and RetentionSettingsFormValues
const settingsSchema = z.object({
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
  highValueRetentionDays: z.number(),
  mediumValueRetentionDays: z.number(),
  lowValueRetentionDays: z.number(),
});

// This type will be used by the form
export type CombinedSettingsFormValues = z.infer<typeof settingsSchema>;

const SettingsSection: React.FC = () => {
  const { coachingMode, setCoachingMode } = useAppContext();
  
  const { userSettings, isLoadingSettings, updateUserSettings, isUpdatingSettings } = useUserSettings();
  const { retentionSettings, isLoadingRetentionSettings, updateRetentionSettings, isUpdatingRetentionSettings } = useRetentionSettings();
  const { aiModels, isLoadingAiModels } = useAiModels();

  const form = useForm<CombinedSettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      email: "",
      primaryGoal: "weight-loss",
      coachStyle: "motivational",
      reminderFrequency: "daily",
      focusAreas: ["nutrition", "exercise", "sleep"],
      darkMode: false,
      pushNotifications: true,
      emailSummaries: true,
      dataSharing: false,
      aiProvider: "openai",
      aiModel: "gpt-4o",
      transcriptionProvider: "webspeech",
      preferredLanguage: "en",
      automaticModelSelection: true,
      highValueRetentionDays: -1,
      mediumValueRetentionDays: 90,
      lowValueRetentionDays: 30,
    },
  });

  useEffect(() => {
    if (userSettings && retentionSettings) {
      form.reset({
        name: userSettings.name || "",
        email: userSettings.email || "",
        primaryGoal: userSettings.primaryGoal || "weight-loss",
        coachStyle: userSettings.coachStyle || "motivational",
        reminderFrequency: userSettings.reminderFrequency || "daily",
        focusAreas: userSettings.focusAreas || ["nutrition", "exercise", "sleep"],
        darkMode: userSettings.darkMode || false,
        pushNotifications: userSettings.pushNotifications || true,
        emailSummaries: userSettings.emailSummaries || true,
        dataSharing: userSettings.dataSharing || false,
        aiProvider: userSettings.aiProvider || "openai",
        aiModel: userSettings.aiModel || "gpt-4o", // Default to a common model
        transcriptionProvider: userSettings.transcriptionProvider || "webspeech",
        preferredLanguage: userSettings.preferredLanguage || "en",
        automaticModelSelection: userSettings.automaticModelSelection ?? true,
        highValueRetentionDays: retentionSettings.highValueRetentionDays ?? -1,
        mediumValueRetentionDays: retentionSettings.mediumValueRetentionDays ?? 90,
        lowValueRetentionDays: retentionSettings.lowValueRetentionDays ?? 30,
      });
    }
  }, [userSettings, retentionSettings, form.reset]);
  
  const onSubmit = (data: CombinedSettingsFormValues) => {
    // Separate data for different update functions if necessary
    const userSettingsData: Partial<UserSettingsFormValues> = {
      name: data.name,
      email: data.email,
      primaryGoal: data.primaryGoal,
      coachStyle: data.coachStyle,
      reminderFrequency: data.reminderFrequency,
      focusAreas: data.focusAreas,
      darkMode: data.darkMode,
      pushNotifications: data.pushNotifications,
      emailSummaries: data.emailSummaries,
      dataSharing: data.dataSharing,
      aiProvider: data.aiProvider,
      aiModel: data.aiModel,
      transcriptionProvider: data.transcriptionProvider,
      preferredLanguage: data.preferredLanguage,
      automaticModelSelection: data.automaticModelSelection,
    };
    updateUserSettings(userSettingsData);

    const retentionData: RetentionSettingsFormValues = {
      highValueRetentionDays: data.highValueRetentionDays,
      mediumValueRetentionDays: data.mediumValueRetentionDays,
      lowValueRetentionDays: data.lowValueRetentionDays,
    };
    // Only update retention if values are present (could be refined)
    if (data.highValueRetentionDays !== undefined) {
        updateRetentionSettings(retentionData);
    }
    
    if (data.primaryGoal !== coachingMode) {
      setCoachingMode(data.primaryGoal);
    }
  };
  
  const isLoading = isLoadingSettings || isLoadingRetentionSettings;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground mb-6">Settings</h1>

          {isLoading ? (
            <>
              <Skeleton className="h-[200px] w-full mb-8" />
              <Skeleton className="h-[300px] w-full mb-8" />
              <Skeleton className="h-[250px] w-full mb-8" />
              <Skeleton className="h-[350px] w-full mb-8" />
              <Skeleton className="h-[400px] w-full mb-8" />
            </>
          ) : (
            <FormProvider {...form}> {/* Pass all form methods to children */}
              <Form {...form}> {/* This Form is from ui/form, for Shadcn layout */}
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <AccountSettings />
                  <CoachingPreferencesSettings />
                  <AppPreferencesSettings />
                  <FileManagementSettings />
                  <AiConfigurationSettings
                    aiModels={aiModels}
                    isLoadingAiModels={isLoadingAiModels}
                  />

                  <div className="flex justify-end mt-8"> {/* Added mt-8 for spacing */}
                    <Button
                      type="submit"
                      className="bg-primary hover:bg-primary/90"
                      disabled={isUpdatingSettings || isUpdatingRetentionSettings}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </FormProvider>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
