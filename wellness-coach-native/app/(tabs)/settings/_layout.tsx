import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '../../../src/theme'; // Adjust path as necessary

export default function SettingsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.cardBackground }, // Use themed background for header
        headerTintColor: COLORS.text, // Color for header title and back button
        headerTitleStyle: {
          fontWeight: 'bold', // Or use FONT_WEIGHTS.bold if defined in typography
        },
      }}
    >
      <Stack.Screen
        name="index" // This refers to settings/index.tsx
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="language" // This refers to settings/language.tsx
        options={{ title: 'Select Language' }}
      />
      {/* Add other settings screens here as they are created */}
      {/* e.g., <Stack.Screen name="account" options={{ title: 'Account Details' }} /> */}
    </Stack>
  );
}
