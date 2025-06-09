import React from 'react';
import { useFormContext, Controller } from 'react-hook-form'; // Or pass form control directly
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { UserSettingsFormValues } from '@/hooks/useUserSettings'; // Assuming this type includes account fields

interface AccountSettingsProps {
  // We can pass the full form instance or parts of it.
  // For better encapsulation, passing control is often preferred.
  // control: Control<UserSettingsFormValues>; // From react-hook-form
}

export function AccountSettings({}: AccountSettingsProps) {
  // If using FormProvider in the parent, useFormContext can be used.
  // Otherwise, control needs to be passed as a prop.
  // For this refactor, let's assume SettingsSection will use FormProvider
  // or pass down `control` explicitly. For now, let's use useFormContext
  // and adjust if SettingsSection is structured differently.
  const { control } = useFormContext<UserSettingsFormValues>();

  return (
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
              {/* TODO: Replace with actual user initials or image */}
              <span className="text-lg font-medium text-muted-foreground">JS</span>
            </div>
            <Button variant="outline" size="sm" type="button">Change</Button> {/* type="button" to prevent form submission */}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center py-4 border-t border-border">
          <div className="sm:w-1/3">
            <FormLabel htmlFor="name">Full Name</FormLabel>
          </div>
          <div className="mt-2 sm:mt-0 sm:w-2/3">
            <FormField
              control={control}
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
              control={control}
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
            <Button variant="outline" size="sm" type="button">Change password</Button> {/* type="button" */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
