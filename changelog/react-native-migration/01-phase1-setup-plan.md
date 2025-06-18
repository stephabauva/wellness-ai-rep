# Phase 1: React Native Project Setup & Initial Configuration

This document summarizes the outcomes of Phase 1, focusing on the initialization and basic setup of the `wellness-coach-native` React Native application.

## 1. Project Initialization

*   **Directory Created:** The main project directory `wellness-coach-native` has been successfully created at the root of the repository.
*   **Expo Project with TypeScript:** The project was initialized as an Expo (React Native) application using the TypeScript template.
    *   Due to tool limitations preventing the direct use of `npx create-expo-app`, the project files and structure were scaffolded manually.
*   **Standard Configuration Files:** Core configuration files were created:
    *   `app.json`: Contains basic app metadata (name, slug, version, platform configurations, asset bundling information).
    *   `babel.config.js`: Standard Expo Babel preset configuration.
    *   `metro.config.js`: Standard Expo Metro bundler configuration.

## 2. Directory Structure

A comprehensive directory structure has been established within `wellness-coach-native/src/` to organize the application's codebase:

*   `src/assets/`: For static assets like fonts, images, and icons.
    *   `fonts/`
    *   `images/`
    *   `icons/`
*   `src/components/`: For reusable UI components.
    *   `ui/` (common UI elements)
    *   `charts/` (for Skia-based charts)
*   `src/config/`: For application-level configurations (e.g., API settings).
*   `src/context/`: For React Context API stores.
*   `src/hooks/`: For custom React hooks.
*   `src/navigation/`: For navigation-related code (navigators, stacks).
*   `src/screens/`: For application screens/views.
    *   Placeholder screens created: `HomeScreen.tsx`, `ChatScreen.tsx`, `HealthScreen.tsx`, `FilesScreen.tsx`, `MemoryScreen.tsx`, `SettingsScreen.tsx`.
*   `src/services/`: For API service integrations and other external services.
*   `src/types/`: For TypeScript type definitions and interfaces.
*   `src/utils/`: For utility functions and helpers.

Placeholder `.gitkeep` files were used to ensure empty directories are tracked.

## 3. Backend Integration

Configuration for connecting to the backend API has been set up:

*   **API Configuration (`src/config/api.ts`):**
    *   An `API_CONFIG` object was created, defining:
        *   `baseUrl`: `'http://localhost:5000/api'`
        *   `timeout`: `30000` (30 seconds)
        *   `defaultHeaders`: `{ 'Content-Type': 'application/json' }`
*   **API Client Utility (`src/services/apiClient.ts`):**
    *   A basic API client utility was created with a `getFromApi` function. This function demonstrates how to use the `API_CONFIG` for making `fetch` requests and includes timeout handling using `AbortController`.
*   **Important Note on `baseUrl`:** The `baseUrl` (`http://localhost:5000/api`) is a placeholder. It will likely require adjustment based on the development environment (e.g., for Android emulators: `http://10.0.2.2:5000/api`; for physical devices testing with a local server: the machine's network IP; or the Replit deployment URL: `https://<your-replit-id>.replit.dev/api`).

## 4. Key Dependencies

The `wellness-coach-native/package.json` file has been configured with the following key dependencies (versions specified are approximate or current at the time of setup):

*   `expo`: `~51.0.2`
*   `react`: `18.2.0`
*   `react-native`: `0.74.1`
*   `@react-navigation/native`: `~6.1.17`
*   `@react-navigation/native-stack`: `~6.9.26`
*   `expo-router`: `~3.5.11`
*   `react-native-health`: `~1.19.0`
*   `react-native-reanimated`: `~3.10.1`
*   `@shopify/react-native-skia`: `1.2.3`
*   `react-native-screens`: `3.31.1`
*   `react-native-safe-area-context`: `4.10.1`
*   `expo-status-bar`: `~1.12.1`
*   `expo-linking`: `~6.3.1`
*   `expo-constants`: `~16.0.1`
*   `typescript`: `^5.1.3` (devDependencies)

*Note: Dependencies were added to `package.json`, but `npm install` or `yarn install` has not been run as part of this automated scaffolding phase due to tool limitations.*

## 5. Entry Point

*   **Main Application Component (`App.tsx`):**
    *   Located at `wellness-coach-native/App.tsx`.
    *   Currently renders the placeholder `HomeScreen` from `src/screens/HomeScreen.tsx`.
*   **Application Registration (`index.js`):**
    *   Located at `wellness-coach-native/index.js`.
    *   This file uses `registerRootComponent` from Expo to register `App.tsx` as the main application component, aligning with the `"main": "index.js"` entry point in `package.json`.

This setup provides a foundational structure for the React Native application, enabling further development of UI, features, and navigation.
