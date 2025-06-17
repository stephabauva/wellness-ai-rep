import React, { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form"; // Only Form component needed at top level
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";
import { 
  User, 
  Heart, 
  Palette, 
  FolderOpen, 
  Bot, 
  Zap,
  Shield
} from "lucide-react";

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
import { PerformanceSettings } from "./settings/PerformanceSettings";
import { HealthDataConsentSettings } from "./settings/HealthDataConsentSettings";

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
  memoryDetectionProvider: z.enum(["google", "openai", "none"]),
  memoryDetectionModel: z.string(),
  highValueRetentionDays: z.number(),
  mediumValueRetentionDays: z.number(),
  lowValueRetentionDays: z.number(),
});

// This type will be used by the form
export type CombinedSettingsFormValues = z.infer<typeof settingsSchema>;

// Define settings sections with icons
const settingsSections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'coaching', label: 'Coaching', icon: Heart },
  { id: 'preferences', label: 'App Preferences', icon: Palette },
  { id: 'files', label: 'File Management', icon: FolderOpen },
  { id: 'ai', label: 'AI Configuration', icon: Bot },
  { id: 'health-consent', label: 'Health Data Privacy', icon: Shield },
  { id: 'performance', label: 'Performance', icon: Zap },
];

const SettingsSection: React.FC = () => {
  const { coachingMode, setCoachingMode } = useAppContext();
  const [activeSection, setActiveSection] = useState('account');
  
  const { userSettings, isLoadingSettings, updateUserSettings, isUpdatingSettings } = useUserSettings();
  const { retentionSettings, isLoadingRetentionSettings, updateRetentionSettings, isUpdatingRetentionSettings } = useRetentionSettings();
  const { aiModels, isLoadingAiModels } = useAiModels();

  // Performance settings state (local state for now)
  const [enableVirtualScrolling, setEnableVirtualScrolling] = React.useState(false);
  const [enablePagination, setEnablePagination] = React.useState(false);
  const [enableWebWorkers, setEnableWebWorkers] = React.useState(false);

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
      memoryDetectionProvider: "google",
      memoryDetectionModel: "gemini-2.0-flash-lite",
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
        memoryDetectionProvider: userSettings.memoryDetectionProvider || "google",
        memoryDetectionModel: userSettings.memoryDetectionModel || "gemini-2.0-flash-lite",
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
      memoryDetectionProvider: data.memoryDetectionProvider,
      memoryDetectionModel: data.memoryDetectionModel,
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

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettings />;
      case 'coaching':
        return <CoachingPreferencesSettings />;
      case 'preferences':
        return <AppPreferencesSettings />;
      case 'files':
        return <FileManagementSettings />;
      case 'ai':
        return (
          <AiConfigurationSettings
            aiModels={aiModels}
            isLoadingAiModels={isLoadingAiModels}
          />
        );
      case 'health-consent':
        return (
          <HealthDataConsentSettings
            settings={userSettings}
            onSettingsUpdate={(newSettings) => {
              // Update settings via the existing handler
              const data = { ...form.getValues(), ...newSettings };
              onSubmit(data);
            }}
            isLoading={isUpdatingSettings}
          />
        );
      case 'performance':
        return (
          <PerformanceSettings
            enableVirtualScrolling={enableVirtualScrolling}
            enablePagination={enablePagination}
            enableWebWorkers={enableWebWorkers}
            onVirtualScrollingChange={setEnableVirtualScrolling}
            onPaginationChange={setEnablePagination}
            onWebWorkersChange={setEnableWebWorkers}
          />
        );
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Vertical Navigation Sidebar */}
      <div className="w-16 bg-gradient-to-b from-primary to-secondary dark:from-primary dark:to-secondary flex flex-col items-center py-4 space-y-4 overflow-y-auto">
        {settingsSections.map((section) => {
          const IconComponent = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                group relative p-3 rounded-xl transition-all duration-300 ease-out
                ${isActive 
                  ? 'bg-white/25 text-white shadow-xl scale-110 ring-2 ring-white/30' 
                  : 'text-white/60 hover:text-white hover:bg-white/15 hover:scale-105 hover:shadow-lg'
                }
                before:absolute before:inset-0 before:rounded-xl before:bg-gradient-radial before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-300
              `}
              title={section.label}
            >
              <IconComponent className={`h-6 w-6 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              {/* Header with section title */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground">
                  {settingsSections.find(s => s.id === activeSection)?.label || 'Settings'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  Configure your {settingsSections.find(s => s.id === activeSection)?.label.toLowerCase()} settings
                </p>
              </div>

              {isLoading ? (
                <div className="space-y-6">
                  <Skeleton className="h-[200px] w-full" />
                  <Skeleton className="h-[300px] w-full" />
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <FormProvider {...form}>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {renderActiveSection()}
                      
                      {/* Save Button - Fixed at bottom */}
                      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4 mt-8">
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 px-8"
                            disabled={isUpdatingSettings || isUpdatingRetentionSettings}
                          >
                            {(isUpdatingSettings || isUpdatingRetentionSettings) ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                </FormProvider>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
