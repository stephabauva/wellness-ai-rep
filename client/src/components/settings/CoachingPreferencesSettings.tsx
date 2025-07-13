import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@shared/components/ui/radio-group";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@shared/components/ui/form";
import { UserSettingsFormValues } from '@/hooks/useUserSettings';

// Assuming focusAreas options are static or passed as props
const FOCUS_AREAS_OPTIONS = [
  { id: "nutrition", label: "Nutrition" },
  { id: "exercise", label: "Exercise" },
  { id: "sleep", label: "Sleep" },
  { id: "mental", label: "Mental Wellness" },
  { id: "hydration", label: "Hydration" },
];

export function CoachingPreferencesSettings() {
  const { control, watch } = useFormContext<UserSettingsFormValues>();

  return (
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
              control={control}
              name="primaryGoal"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value} // Use value for controlled component
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
              control={control}
              name="coachStyle"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value} // Use value for controlled component
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="motivational" id="style-motivational" />
                        <FormLabel htmlFor="style-motivational" className="font-normal">Motivational</FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="educational" id="style-educational" />
                        <FormLabel htmlFor="style-educational" className="font-normal">Educational</FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="supportive" id="style-supportive" />
                        <FormLabel htmlFor="style-supportive" className="font-normal">Supportive</FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="challenging" id="style-challenging" />
                        <FormLabel htmlFor="style-challenging" className="font-normal">Challenging</FormLabel>
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
              control={control}
              name="reminderFrequency"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value} // Use value for controlled component
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
              control={control}
              name="focusAreas"
              render={() => ( // Main render prop for the group
                <FormItem>
                  <div className="space-y-2">
                    {FOCUS_AREAS_OPTIONS.map((area) => (
                      <FormField // Nested FormField for each checkbox
                        key={area.id}
                        control={control}
                        name="focusAreas" // Still points to the array
                        render={({ field }) => {
                          return (
                            <FormItem
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(area.id)}
                                  onCheckedChange={(checked) => {
                                    const currentAreas = field.value || [];
                                    const updatedAreas = checked
                                      ? [...currentAreas, area.id]
                                      : currentAreas.filter(
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
  );
}
