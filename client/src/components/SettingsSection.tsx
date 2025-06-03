import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";

const formSchema = z.object({
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
  language: z.enum(["en", "fr"]),
});

type FormValues = z.infer<typeof formSchema>;

const SettingsSection: React.FC = () => {
  const { toast } = useToast();
  const { coachingMode, setCoachingMode } = useAppContext();
  const { t, i18n } = useTranslation();
  
  // Fetch user settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    }
  });

  // Fetch available AI models
  const { data: aiModels, isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/ai-models'],
    queryFn: async () => {
      const response = await fetch('/api/ai-models');
      if (!response.ok) throw new Error('Failed to fetch AI models');
      return await response.json();
    }
  });
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest('PATCH', '/api/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Initialize language from settings
  React.useEffect(() => {
    if (settings?.language && settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings?.language, i18n]);

  // Set up form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: settings?.name || "Jane Smith",
      email: settings?.email || "jane.smith@example.com",
      primaryGoal: settings?.primaryGoal || "weight-loss",
      coachStyle: settings?.coachStyle || "motivational",
      reminderFrequency: settings?.reminderFrequency || "daily",
      focusAreas: settings?.focusAreas || ["nutrition", "exercise", "sleep"],
      darkMode: settings?.darkMode || false,
      pushNotifications: settings?.pushNotifications || true,
      emailSummaries: settings?.emailSummaries || true,
      dataSharing: settings?.dataSharing || false,
      aiProvider: settings?.aiProvider || "google",
      aiModel: settings?.aiModel || "gemini-2.0-flash-exp",
      language: settings?.language || "en",
    }
  });

  // Update form when settings change
  React.useEffect(() => {
    if (settings) {
      form.reset({
        name: settings.name || "Jane Smith",
        email: settings.email || "jane.smith@example.com",
        primaryGoal: settings.primaryGoal || "weight-loss",
        coachStyle: settings.coachStyle || "motivational",
        reminderFrequency: settings.reminderFrequency || "daily",
        focusAreas: settings.focusAreas || ["nutrition", "exercise", "sleep"],
        darkMode: settings.darkMode || false,
        pushNotifications: settings.pushNotifications || true,
        emailSummaries: settings.emailSummaries || true,
        dataSharing: settings.dataSharing || false,
        aiProvider: settings.aiProvider || "google",
        aiModel: settings.aiModel || "gemini-2.0-flash-exp",
        language: settings.language || "en",
      });
    }
  }, [settings, form]);
  
  const onSubmit = (data: FormValues) => {
    // Check if language changed
    const languageChanged = data.language !== i18n.language;
    
    updateSettingsMutation.mutate(data);
    
    // Update coaching mode in context if primary goal changed
    if (data.primaryGoal !== coachingMode) {
      setCoachingMode(data.primaryGoal);
    }
    
    // Handle language change after form submission
    if (languageChanged) {
      i18n.changeLanguage(data.language).then(() => {
        localStorage.setItem('i18nextLng', data.language);
        // Force reload to ensure all components update with new language
        window.location.reload();
      });
    }
  };
  
  // Focus areas options
  const focusAreas = [
    { id: "nutrition", label: "Nutrition" },
    { id: "exercise", label: "Exercise" },
    { id: "sleep", label: "Sleep" },
    { id: "mental", label: "Mental Wellness" },
    { id: "hydration", label: "Hydration" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground mb-6">Settings</h1>

          {isLoading ? (
            // Loading state
            <>
              <Skeleton className="h-[200px] w-full mb-8" />
              <Skeleton className="h-[300px] w-full mb-8" />
              <Skeleton className="h-[200px] w-full mb-8" />
            </>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* Account Settings */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center mb-6">
                      <div className="sm:w-1/3">
                        <FormLabel>Profile Photo</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3 flex items-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden mr-4">
                          <span className="text-lg font-medium text-muted-foreground">JS</span>
                        </div>
                        <Button variant="outline" size="sm">Change</Button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-t border-border">
                      <div className="sm:w-1/3">
                        <FormLabel htmlFor="name">Full Name</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input id="name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-t border-border">
                      <div className="sm:w-1/3">
                        <FormLabel htmlFor="email">Email Address</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input id="email" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-t border-border">
                      <div className="sm:w-1/3">
                        <FormLabel>Password</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3">
                        <Button variant="outline" size="sm">Change password</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Coaching Preferences */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Coaching Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center mb-6">
                      <div className="sm:w-1/3">
                        <FormLabel>Primary Goal</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3">
                        <FormField
                          control={form.control}
                          name="primaryGoal"
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select your primary goal" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="weight-loss">Weight Loss</SelectItem>
                                  <SelectItem value="muscle-gain">Muscle Gain</SelectItem>
                                  <SelectItem value="fitness">Fitness Improvement</SelectItem>
                                  <SelectItem value="mental-wellness">Mental Wellness</SelectItem>
                                  <SelectItem value="nutrition">Balanced Eating</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row py-4 border-t border-border">
                      <div className="sm:w-1/3">
                        <FormLabel>Coach Communication Style</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3">
                        <FormField
                          control={form.control}
                          name="coachStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="space-y-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="motivational" id="style-motivational" />
                                    <FormLabel htmlFor="style-motivational">Motivational</FormLabel>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="educational" id="style-educational" />
                                    <FormLabel htmlFor="style-educational">Educational</FormLabel>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="supportive" id="style-supportive" />
                                    <FormLabel htmlFor="style-supportive">Supportive</FormLabel>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="challenging" id="style-challenging" />
                                    <FormLabel htmlFor="style-challenging">Challenging</FormLabel>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-t border-border">
                      <div className="sm:w-1/3">
                        <FormLabel>Reminder Frequency</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3">
                        <FormField
                          control={form.control}
                          name="reminderFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select reminder frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="frequent">Frequently (Multiple times per day)</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="few-times-week">A few times per week</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="never">Never</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row py-4 border-t border-border">
                      <div className="sm:w-1/3">
                        <FormLabel>Areas of Focus</FormLabel>
                      </div>
                      <div className="mt-2 sm:mt-0 sm:w-2/3">
                        <FormField
                          control={form.control}
                          name="focusAreas"
                          render={() => (
                            <FormItem>
                              <div className="space-y-2">
                                {focusAreas.map((area) => (
                                  <FormField
                                    key={area.id}
                                    control={form.control}
                                    name="focusAreas"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={area.id}
                                          className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(area.id)}
                                              onCheckedChange={(checked) => {
                                                const updatedAreas = checked
                                                  ? [...field.value, area.id]
                                                  : field.value?.filter(
                                                      (value) => value !== area.id
                                                    );
                                                field.onChange(updatedAreas);
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="font-normal">
                                            {area.label}
                                          </FormLabel>
                                        </FormItem>
                                      );
                                    }}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* App Preferences */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>App Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center py-4">
                      <div>
                        <h4 className="text-md font-medium">Dark Mode</h4>
                        <p className="text-sm text-muted-foreground">Use dark theme throughout the app</p>
                      </div>
                      <div className="flex items-center">
                        <FormField
                          control={form.control}
                          name="darkMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t border-border">
                      <div>
                        <h4 className="text-md font-medium">Push Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive reminder notifications</p>
                      </div>
                      <div className="flex items-center">
                        <FormField
                          control={form.control}
                          name="pushNotifications"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t border-border">
                      <div>
                        <h4 className="text-md font-medium">Email Summaries</h4>
                        <p className="text-sm text-muted-foreground">Receive weekly email progress reports</p>
                      </div>
                      <div className="flex items-center">
                        <FormField
                          control={form.control}
                          name="emailSummaries"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t border-border">
                      <div>
                        <h4 className="text-md font-medium">Data Sharing</h4>
                        <p className="text-sm text-muted-foreground">Allow anonymous data use for service improvement</p>
                      </div>
                      <div className="flex items-center">
                        <FormField
                          control={form.control}
                          name="dataSharing"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Assistant Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="aiProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI Provider</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select AI provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="google">Google Gemini</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose your preferred AI provider for coaching responses
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aiModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI Model</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select AI model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {!modelsLoading && aiModels && (
                                <>
                                  {form.watch("aiProvider") === "openai" && aiModels.openai?.map((model: any) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      {model.name} - {model.description}
                                    </SelectItem>
                                  ))}
                                  {form.watch("aiProvider") === "google" && aiModels.google?.map((model: any) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      {model.name} - {model.description}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                              {modelsLoading && (
                                <SelectItem value="loading" disabled>Loading models...</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the specific model for enhanced coaching capabilities
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Language Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("settings.language")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("settings.language")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en">{t("settings.english")}</SelectItem>
                              <SelectItem value="fr">{t("settings.french")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose your preferred language for the interface
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {t("settings.saveChanges")}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
