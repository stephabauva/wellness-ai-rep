import { Platform } from 'react-native';

/**
 * @file typography.ts
 * @description Defines font sizes, weights, line heights, and common text styles for the application.
 * Note: Font family management (custom fonts) is handled separately (e.g., Expo font loading, react-native.config.js).
 */

/**
 * Standardized font sizes.
 * Use these to maintain a consistent typographic scale.
 * Values are in density-independent pixels (dp).
 */
export const FONT_SIZES = {
  h1: 28,       // Large page titles
  h2: 24,       // Section headers or important titles
  h3: 20,       // Sub-section headers
  h4: 18,       // Larger body text, input field text
  body: 16,     // Standard body text
  caption: 12,  // Captions, small helper text
  small: 10,    // Very small text, e.g., legal disclaimers

  // iOS specific standard sizes (for reference or direct use if adhering to Human Interface Guidelines)
  iosTitle1: 28,
  iosTitle2: 22,
  iosTitle3: 20,
  iosHeadline: 17,    // Standard for list items, button titles
  iosBody: 17,        // Standard body text on iOS
  iosCallout: 16,
  iosSubhead: 15,
  iosFootnote: 13,
  iosCaption1: 12,
  iosCaption2: 11,
};

/**
 * Standardized font weights.
 * These correspond to the `fontWeight` style property.
 * Ensure the loaded custom fonts (if any) support these weights.
 */
export const FONT_WEIGHTS = {
  thin: '100' as const,
  ultraLight: '200' as const,
  light: '300' as const,
  regular: '400' as const, // Default normal weight
  medium: '500' as const,  // Common for slightly emphasized text
  semibold: '600' as const,// Common for titles or important labels
  bold: '700' as const,    // Standard bold
  heavy: '800' as const,
  black: '900' as const,
};

/**
 * Standardized line heights.
 * Calculated based on font size for better readability.
 * Using Platform.select can help fine-tune for OS-specific rendering nuances.
 */
export const LINE_HEIGHTS = {
  /** For dense text or UI elements where vertical space is constrained. `~1.2-1.3x font size` */
  tight: Math.round(FONT_SIZES.body * (Platform.OS === 'ios' ? 1.2 : 1.3)),
  /** Standard line height for body text. `~1.25-1.4x font size` */
  body: Math.round(FONT_SIZES.body * (Platform.OS === 'ios' ? 1.25 : 1.4)),
  /** Line height for headings. `~1.1-1.2x font size` */
  heading: Math.round(FONT_SIZES.h1 * (Platform.OS === 'ios' ? 1.1 : 1.2)),
};

/**
 * Predefined common text styles combining size, weight, and line height.
 * Useful for applying consistent typography to common UI elements like headers, body text, etc.
 * Optional: Can also be defined directly in component StyleSheets if preferred.
 *
 * @example
 * ```js
 * import { TEXT_STYLES } from '../theme';
 * // ...
 * <Text style={TEXT_STYLES.screenHeader}>My Screen Title</Text>
 * ```
 */
export const TEXT_STYLES = {
  screenHeader: {
    fontSize: FONT_SIZES.h1,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: LINE_HEIGHTS.heading, // Example usage
    color: '#000000', // Default text color, can be overridden
  },
  sectionTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: FONT_WEIGHTS.semibold,
    color: '#000000',
  },
  bodyRegular: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: LINE_HEIGHTS.body,
    color: '#000000',
  },
  caption: {
    fontSize: FONT_SIZES.caption,
    fontWeight: FONT_WEIGHTS.regular,
    color: '#000000',
  }
};
