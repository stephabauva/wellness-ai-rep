import { Platform } from 'react-native';

export const FONT_SIZES = {
  h1: 28,
  h2: 24,
  h3: 20,
  h4: 18, // Sub-header or larger body text
  body: 16, // Standard body text
  caption: 12,
  small: 10,

  // iOS specific standard sizes (for reference, can be mapped)
  iosTitle1: 28,
  iosTitle2: 22,
  iosTitle3: 20,
  iosHeadline: 17, // Often used for list items, buttons
  iosBody: 17,
  iosCallout: 16,
  iosSubhead: 15,
  iosFootnote: 13,
  iosCaption1: 12,
  iosCaption2: 11,
};

export const FONT_WEIGHTS = {
  thin: '100' as const,
  ultraLight: '200' as const,
  light: '300' as const,
  regular: '400' as const, // Normal
  medium: '500' as const,
  semibold: '600' as const, // Semibold in San Francisco font
  bold: '700' as const,     // Bold
  heavy: '800' as const,
  black: '900' as const,
};

export const LINE_HEIGHTS = {
  tight: Platform.select({ ios: FONT_SIZES.body * 1.2, android: FONT_SIZES.body * 1.3 }), // Example: 20 for body
  body: Platform.select({ ios: FONT_SIZES.body * 1.25, android: FONT_SIZES.body * 1.4 }), // Example: 22 for body
  heading: Platform.select({ ios: FONT_SIZES.h1 * 1.1, android: FONT_SIZES.h1 * 1.2 }), // Example: 32 for H1
};

// Example of combining into text styles (optional, can also be done in components)
export const TEXT_STYLES = {
  screenHeader: {
    fontSize: FONT_SIZES.h1,
    fontWeight: FONT_WEIGHTS.bold,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  bodyRegular: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: LINE_HEIGHTS.body,
  },
  caption: {
    fontSize: FONT_SIZES.caption,
    fontWeight: FONT_WEIGHTS.regular,
  }
};

// Note: Actual font family management (e.g., custom fonts) would be handled separately,
// often involving configuration in react-native.config.js or Expo font loading.
// This file primarily focuses on sizes, weights, and line heights.
