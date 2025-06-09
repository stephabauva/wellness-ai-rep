import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { UserSettingsFormValues } from '@/hooks/useUserSettings';

export function AppPreferencesSettings() {
  const { control } = useFormContext<UserSettingsFormValues>();

  const preferenceItems = [
    {
      name: "darkMode" as keyof UserSettingsFormValues, // Type assertion
      label: "Dark Mode",
      description: "Use dark theme throughout the app",
    },
    {
      name: "pushNotifications" as keyof UserSettingsFormValues,
      label: "Push Notifications",
      description: "Receive reminder notifications",
    },
    {
      name: "emailSummaries" as keyof UserSettingsFormValues,
      label: "Email Summaries",
      description: "Receive weekly email progress reports",
    },
    {
      name: "dataSharing" as keyof UserSettingsFormValues,
      label: "Data Sharing",
      description: "Allow anonymous data use for service improvement",
    },
  ];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>App Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        {preferenceItems.map((item, index) => (
          <FormField
            key={item.name}
            control={control}
            name={item.name}
            render={({ field }) => (
              <FormItem className={`flex justify-between items-center py-4 ${index > 0 ? 'border-t border-border' : ''}`}>
                <div>
                  <FormLabel htmlFor={item.name} className="text-md font-medium">{item.label}</FormLabel>
                  <FormDescription>{item.description}</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id={item.name}
                    checked={field.value as boolean} // field.value is any, cast to boolean for Switch
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ))}
      </CardContent>
    </Card>
  );
}
