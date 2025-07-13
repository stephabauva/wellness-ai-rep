import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@shared/components/ui/form";
// Assuming form values related to retention are part of a larger form schema,
// or this component will be used with a form dedicated to RetentionSettingsFormValues.
// For this refactor, we'll use UserSettingsFormValues and assume retention fields are there.
import { UserSettingsFormValues } from '@/hooks/useUserSettings';

interface RetentionField {
  name: keyof UserSettingsFormValues; // Ensure these keys exist in UserSettingsFormValues
  label: string;
  description: string;
  options: { value: string; label: string }[];
}

const retentionFields: RetentionField[] = [
  {
    name: "highValueRetentionDays",
    label: "Medical Documents Retention",
    description: "How long to keep medical documents, lab results, and prescriptions",
    options: [
      { value: "-1", label: "Keep indefinitely" },
      { value: "365", label: "1 year" },
      { value: "180", label: "6 months" },
      { value: "90", label: "3 months" },
    ],
  },
  {
    name: "mediumValueRetentionDays",
    label: "Health Plans & Routines Retention",
    description: "How long to keep nutrition plans and exercise routines",
    options: [
      { value: "180", label: "6 months" },
      { value: "90", label: "3 months" },
      { value: "60", label: "2 months" },
      { value: "30", label: "1 month" },
    ],
  },
  {
    name: "lowValueRetentionDays",
    label: "Photos & Temporary Files Retention",
    description: "How long to keep food photos, screenshots, and temporary files",
    options: [
      { value: "60", label: "2 months" },
      { value: "30", label: "1 month" },
      { value: "14", label: "2 weeks" },
      { value: "7", label: "1 week" },
    ],
  },
];

export function FileManagementSettings() {
  const { control } = useFormContext<UserSettingsFormValues>();

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>File Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-muted-foreground mb-4">
          Configure how long uploaded files are kept on the system. Medical documents are typically kept longer than photos or temporary files.
        </div>

        {retentionFields.map((item) => (
          <FormField
            key={item.name}
            control={control}
            name={item.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{item.label}</FormLabel>
                <Select
                  // Ensure field.value is a string for Select with parseInt on change
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  value={String(field.value)} // Convert number to string for Select value
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {item.options.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{item.description}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </CardContent>
    </Card>
  );
}
