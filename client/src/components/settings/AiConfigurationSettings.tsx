import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from @shared/components/ui/select";
import { Switch } from @shared/components/ui/switch";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { UserSettingsFormValues } from '@/hooks/useUserSettings';
import { AvailableAiModels, AiModelInfo } from '@/hooks/useAiModels'; // Import model types
import { supportedLanguages } from "@shared/schema"; // Assuming this path is correct

interface AiConfigurationSettingsProps {
  aiModels?: AvailableAiModels;
  isLoadingAiModels: boolean;
}

export function AiConfigurationSettings({ aiModels, isLoadingAiModels }: AiConfigurationSettingsProps) {
  const { control, watch } = useFormContext<UserSettingsFormValues>();
  const currentAiProvider = watch("aiProvider");

  return (
    <Card className="mb-8"> {/* Changed from <Card> to <Card className="mb-8"> for consistency */}
      <CardHeader>
        <CardTitle>AI Assistant Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="aiProvider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Provider</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
          control={control}
          name="aiModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Model</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoadingAiModels || !currentAiProvider}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingAiModels ? (
                    <SelectItem value="loading" disabled>Loading models...</SelectItem>
                  ) : (
                    aiModels && currentAiProvider && aiModels[currentAiProvider]?.map((model: AiModelInfo) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </SelectItem>
                    ))
                  )}
                  {!isLoadingAiModels && (!aiModels || !currentAiProvider || !aiModels[currentAiProvider]?.length) && (
                     <SelectItem value="no-models" disabled>No models available for selected provider.</SelectItem>
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

        <FormField
          control={control}
          name="transcriptionProvider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audio Transcription Provider</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transcription provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="webspeech">Web Speech API (Browser-based)</SelectItem>
                  <SelectItem value="openai">OpenAI Whisper (High accuracy)</SelectItem>
                  <SelectItem value="google">Google Speech-to-Text (Fast processing)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choose your preferred method for converting speech to text
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="preferredLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Language for Audio Transcription</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {supportedLanguages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select your language to improve speech recognition accuracy
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="automaticModelSelection"
          render={({ field }) => (
            <FormItem className="flex justify-between items-center py-4 border-t border-border">
              <div>
                <FormLabel htmlFor="automaticModelSelection" className="text-md font-medium">Automatic AI Model Selection</FormLabel>
                <FormDescription>
                  Automatically choose the best AI model based on query type and attachments
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  id="automaticModelSelection"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="pt-4 border-t border-border">
          <h4 className="text-md font-medium mb-4">Memory Detection Settings</h4>
          
          <FormField
            control={control}
            name="memoryDetectionProvider"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Memory Detection Provider</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select memory detection provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="google">Google Gemini (Recommended)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="none">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose AI provider for analyzing conversations to create memories. Google Gemini Flash Lite is most cost-effective.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="memoryDetectionModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Memory Detection Model</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={watch("memoryDetectionProvider") === "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select memory detection model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {watch("memoryDetectionProvider") === "google" && (
                      <>
                        <SelectItem value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Cheapest)</SelectItem>
                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                      </>
                    )}
                    {watch("memoryDetectionProvider") === "openai" && (
                      <>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended)</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      </>
                    )}
                    {watch("memoryDetectionProvider") === "none" && (
                      <SelectItem value="none" disabled>Memory detection disabled</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {watch("memoryDetectionProvider") === "none" 
                    ? "Memory detection is disabled. Simple keyword-based memory will be used instead."
                    : "Select the specific model for analyzing conversations to detect important information worth remembering."
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
