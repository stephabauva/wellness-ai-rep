import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Switch } from "@shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@shared/components/ui/form";
import { UserSettingsFormValues } from '@/hooks/useUserSettings';
import { Sun, Moon, Monitor } from 'lucide-react';

export function AppPreferencesSettings() {
  const { control } = useFormContext<UserSettingsFormValues>();

  const preferenceItems = [
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
        {/* Theme Preference */}
        <FormField
          control={control}
          name="themePreference"
          render={({ field }) => (
            <FormItem className="flex justify-between items-center py-4">
              <div>
                <FormLabel className="text-md font-medium">Theme</FormLabel>
                <FormDescription>Choose your preferred theme</FormDescription>
              </div>
              <FormControl>
                <Select value={field.value || 'system'} onValueChange={field.onChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        
        {preferenceItems.map((item, index) => (
          <FormField
            key={item.name}
            control={control}
            name={item.name}
            render={({ field }) => (
              <FormItem className={`flex justify-between items-center py-4 border-t border-border`}>
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
