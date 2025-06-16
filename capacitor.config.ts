import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wellness.coach',
  appName: 'Wellness Coach',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    // Add microphone permissions
    Microphone: {
      NSMicrophoneUsageDescription: "This app uses the microphone to record voice messages for AI transcription."
    },
    // Add health data permissions
    HealthKit: {
      NSHealthShareUsageDescription: "This app reads health data to provide personalized wellness coaching.",
      NSHealthUpdateUsageDescription: "This app writes health data to track your wellness progress."
    }
  }
};

export default config;