import React from 'react';
import { Slot } from 'expo-router';
import { AppProvider } from '../src/context/AppContext'; // Assuming AppProvider is here
import Toast from 'react-native-toast-message'; // Import Toast

// TODO: RN-Adapt - QueryClientProvider should wrap the app for react-query to work.
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// const queryClient = new QueryClient();

export default function RootLayout() {
  // TODO: Wrap with QueryClientProvider once react-query setup is confirmed for RN.
  // For now, just AppProvider.
  return (
    <AppProvider>
      <Slot />
      {/* Toast component needs to be rendered at the root */}
      <Toast />
    </AppProvider>
  );
}
