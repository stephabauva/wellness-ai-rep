module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
  // Note: moduleNameMapper might be needed if using path aliases like @/components
  // moduleNameMapper: {
  //   '^@/(.*)$': '<rootDir>/src/$1',
  // },
  // Collect coverage from src, excluding theme and types for now, and excluding App.tsx/index.js
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/theme/**/*.{ts,tsx}',
    '!src/types/**/*.{ts,tsx}',
    '!src/App.tsx', // If it exists and is just an entry
    '!src/index.ts', // If it's just re-exporting
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};
