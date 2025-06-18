import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS } from '../../../src/theme'; // Import theme colors

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.tabBarInactiveTint,
        tabBarStyle: {
          backgroundColor: COLORS.tabBarBackground,
          // borderTopColor: COLORS.border, // Optional: if you want to customize border
        },
        headerStyle: {
          backgroundColor: COLORS.tabBarBackground, // Or a specific header color
        },
        headerTintColor: COLORS.text, // Color for header title and back button
      }}
    >
      <Tabs.Screen
        name="chat" // This will match app/(tabs)/chat.tsx
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="health" // This will match app/(tabs)/health.tsx
        options={{
          title: 'Health',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart-pulse" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="files" // This will match app/(tabs)/files.tsx
        options={{
          title: 'Files',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-multiple" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="memory" // This will match app/(tabs)/memory.tsx
        options={{
          title: 'Memory',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="brain" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings" // This will match app/(tabs)/settings.tsx
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
