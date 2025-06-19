# Wellness Coach Native - Build and Deployment Guide

This guide provides instructions for building, testing, and deploying the Wellness Coach React Native application using Expo and Expo Application Services (EAS).

## 1. Prerequisites

Before you begin, ensure you have the following installed and configured:

*   **Node.js and npm/yarn:**
    *   Node.js (LTS version recommended). Download from [nodejs.org](https://nodejs.org/).
    *   npm (comes with Node.js) or Yarn Classic/Berry.
*   **Expo CLI:**
    *   Install globally: `npm install -g expo-cli`
*   **EAS CLI (Expo Application Services):**
    *   Install globally: `npm install -g eas-cli`
    *   Log in to your Expo account: `eas login`
*   **Development Environment:**
    *   **React Native:** Follow the "React Native CLI Quickstart" guide on the official React Native website for your OS, specifically the "Setting up the development environment" section. This includes installing dependencies like JDK, Android SDK (for Android), and Xcode (for iOS).
    *   **Android Studio:** For Android development, install Android Studio ([developer.android.com/studio](https://developer.android.com/studio)) to manage Android SDKs, AVDs (emulators), and for specific build tasks if not using EAS Build exclusively.
    *   **Xcode:** For iOS development (on macOS), install Xcode from the Mac App Store. This includes iOS SDKs, simulators, and build tools.
*   **Apple Developer Account:** Required for iOS TestFlight distribution and App Store submission.
*   **Google Play Console Account:** Required for Android Play Store submission.

## 2. Environment Variables

Currently, the application primarily uses hardcoded values for configuration (e.g., `API_BASE_URL` in `src/config/api.ts`).

For a production environment, you would typically manage different API URLs or other sensitive keys using environment variables. With Expo, this can be done via:
*   **EAS Build Secrets:** For variables needed at build time (e.g., API keys for third-party services compiled into the app). Manage with `eas secrets:create MY_SECRET_KEY`.
*   **App Configuration (`app.config.js` or `app.json`):** Using dynamic configuration with `app.config.js` allows you to set variables based on the build profile or environment.
*   **Runtime Environment Variables:** For variables that change at runtime without a new build (less common for API base URLs but possible for feature flags), these would be fetched from a configuration endpoint or set via EAS Update channels.

**For this project's current state, no specific environment variables need to be configured externally for the build itself.** The API base URL would need to be updated in `src/config/api.ts` for different backend environments (development, staging, production) before building if not using a dynamic configuration setup.

## 3. Local Development and Testing

*   **Running with Expo Go:**
    *   Expo Go allows you to quickly run and test your app on a physical device without needing to build a native binary.
    *   Command: `npx expo start`
    *   Scan the QR code with the Expo Go app (iOS or Android).
*   **Running on Simulators/Emulators:**
    *   **iOS Simulator (macOS only):** `npx expo run:ios` (or `i` in the Metro Bundler terminal)
    *   **Android Emulator:** `npx expo run:android` (or `a` in the Metro Bundler terminal)
    *   Ensure you have simulators/emulators set up in Xcode and Android Studio respectively.

## 4. Creating Development Builds

Development builds are useful for testing on physical devices, especially when your app includes custom native code not supported by Expo Go.

*   **EAS CLI Command:**
    *   `eas build -p [android|ios] --profile development`
    *   This command builds a debuggable version of your app that you can install on your device.
    *   The `development` profile in `eas.json` is typically configured for this.

## 5. Building for Production (EAS Build)

EAS Build is Expo's cloud build service that compiles your app's native code.

*   **`eas.json` Build Profiles:**
    *   This file configures different build settings for various environments.
    *   Example `eas.json`:
        ```json
        {
          "build": {
            "development": {
              "developmentClient": true,
              "distribution": "internal",
              "android": {
                "buildType": "apk"
              }
            },
            "preview": {
              "distribution": "internal"
              // "android": { ... }, // Example: specific settings for preview
              // "ios": { ... }
            },
            "production": {
              // Default settings are usually fine for a basic production build
              // "env": { "API_URL": "https://prod.example.com/api" } // Example of setting build-time env var
            }
          }
        }
        ```
    *   `development`: For creating development client builds.
    *   `preview`: Often used for internal distribution (QA, TestFlight).
    *   `production`: For builds intended for app store submission.
*   **Running a Production Build:**
    *   `eas build -p [android|ios] --profile production`
    *   This command will build your app in the cloud, ready for submission.
*   **Managing Credentials:**
    *   EAS CLI can manage your app signing credentials (Android Keystore, iOS Distribution Certificate and Provisioning Profile).
    *   Run `eas credentials` to set them up or let EAS handle them automatically (`--auto-submit` for iOS or default Android behavior).

## 6. Android Deployment

*   **Build Output:** EAS Build for Android (production profile) typically generates an AAB (Android App Bundle), which is the recommended format for the Play Store. You can also configure it for APKs if needed.
*   **Google Play Console:**
    1.  Create a new app listing in the Google Play Console.
    2.  Fill in all required store listing details (description, screenshots, privacy policy, etc.).
    3.  Upload your AAB to a new release (e.g., Internal Testing, Closed Testing, Production).
    4.  Roll out the release.
*   **Key Signing:**
    *   By default, EAS Build manages app signing for you.
    *   If you have an existing app or need to manage your own keys, you can configure this in `eas.json` and upload your credentials.

## 7. iOS Deployment

*   **Build Output:** EAS Build for iOS (production profile) generates an IPA file.
*   **App Store Connect:**
    1.  Create a new app record in App Store Connect.
    2.  Fill in app information, pricing, availability, and store listing details.
    3.  **Upload IPA:**
        *   **EAS Submit:** `eas submit -p ios --latest` (or specify build ID). This is the easiest way.
        *   **Transporter App:** Download the Transporter app on your Mac, then use it to upload the IPA file provided by EAS Build.
    4.  **TestFlight:** After uploading, distribute the build to internal testers (App Store Connect users) or external beta testers via TestFlight.
    5.  **App Store Review:** Once testing is complete, submit the build for App Store review. This process can take a few days.
*   **Provisioning and Certificates:**
    *   EAS Build can manage provisioning profiles and distribution certificates automatically.
    *   If you prefer manual management, you can create these in your Apple Developer Account and provide them to EAS.

## 8. Over-the-Air (OTA) Updates (EAS Update)

EAS Update allows you to deploy updates to the JavaScript and asset portions of your app directly to users without going through a full app store review process. This is ideal for bug fixes, feature tweaks, and asset changes.

*   **Concept:** You publish an update bundle to a specific channel (e.g., `production`, `preview`). The app, when built with EAS Update configured, checks for updates on that channel and downloads them in the background.
*   **Configuration:**
    *   Ensure `expo-updates` is correctly configured in your `app.json` (EAS Build usually handles this).
    *   Set up channels in `eas.json` if needed for different update streams.
*   **Publishing an Update:**
    *   `eas update --branch <your-branch-name> --message "Your update message"`
    *   This command builds your JS bundle and assets and uploads them to EAS.
    *   The update will be served to apps configured to use that channel (often determined by the build profile or a specific channel setting in `app.json`).
*   **Classic Updates (`expo publish`):** While `expo publish` is the older way and still works for classic builds, EAS Update is the recommended system for apps built with EAS Build.

## 9. Important Considerations

*   **App Icons and Splash Screens:**
    *   Configure these in `app.json` under the `expo.icon`, `expo.splash`, `expo.ios.icon`, `expo.android.adaptiveIcon` keys. Ensure you provide assets of the correct sizes and formats.
*   **Permissions:**
    *   While `react-native-health` and other modules handle runtime permission requests, ensure your app's privacy policy and store listing accurately reflect the permissions your app uses and why.
*   **Bundle Identifiers:**
    *   **Android:** `android.package` in `app.json` (e.g., `com.yourcompany.appname`).
    *   **iOS:** `ios.bundleIdentifier` in `app.json` (e.g., `com.yourcompany.appname`).
    *   These must be unique and are set before your first build for a specific platform.
*   **Version Numbering:**
    *   **`expo.version`:** Your user-facing version number (e.g., "1.0.0").
    *   **`expo.android.versionCode`:** Incremental integer for Android builds.
    *   **`expo.ios.buildNumber`:** Incremental string (often integer) for iOS builds.
    *   Increment these appropriately for each new release submitted to the app stores. EAS Build can also help automate versioning or use build numbers.

This guide provides a foundational overview. Always refer to the latest official Expo and platform-specific documentation for the most up-to-date and detailed instructions.
