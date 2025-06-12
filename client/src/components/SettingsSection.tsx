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
  Settings, 
  MousePointer, 
  Stethoscope, 
  Bell, 
  Database, 
  Terminal, 
  MessageSquare, 
  TestTube, 
  Globe 
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

// Define settings sections with icons
const settingsSections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'coaching', label: 'Coaching', icon: Stethoscope },
  { id: 'preferences', label: 'App Preferences', icon: Settings },
  { id: 'files', label: 'File Management', icon: Database },
  { id: 'ai', label: 'AI Configuration', icon: MessageSquare },
  { id: 'performance', label: 'Performance', icon: Terminal },
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
      <div className="w-16 bg-gradient-to-b from-purple-600 to-slate-800 dark:from-purple-700 dark:to-slate-900 flex flex-col items-center py-4 space-y-4 overflow-y-auto">
        {settingsSections.map((section) => {
          const IconComponent = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                p-3 rounded-lg transition-all duration-200 
                ${isActive 
                  ? 'bg-white/20 text-white shadow-lg scale-110' 
                  : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
                }
              `}
              title={section.label}
            >
              <IconComponent className="h-6 w-6" />
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
