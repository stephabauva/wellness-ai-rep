/**
 * @file colors.ts
 * @description Defines the color palette for the application.
 * Includes primary, secondary, text, background, status, and specific UI element colors.
 */

export const COLORS = {
  // Core Palette
  primary: '#007AFF',         // Standard Blue: For primary actions, buttons, links, active states.
  secondary: '#5856D6',       // Indigo/Purple: For secondary actions, accents, or alternative highlights.


  // Backgrounds
  background: '#F2F2F7',      // System Gray 6 (iOS): Main app background for a native feel.
  cardBackground: '#FFFFFF',  // White: For cards, list items, modal backgrounds, sections.

  // Text Colors
  text: '#000000',            // Black: Primary text, body copy.
  textSecondary: '#6E6E73',   // System Gray (iOS): Secondary text, captions, placeholders, subtitles.
  textDisabled: '#AEAEB2',    // System Gray 2 (iOS): Disabled text or very subtle hints.
  textOnPrimary: '#FFFFFF',   // White: Text placed on primary color backgrounds.
  textOnSecondary: '#FFFFFF', // White: Text placed on secondary color backgrounds.
  textLink: '#007AFF',        // Same as primary, common for links.

  // Borders & Separators
  border: '#D1D1D6',          // System Gray 4 (iOS): Standard borders for inputs, cards.
  separator: '#C7C7CC',       // System Gray 3 (iOS): For list item separators, dividers.

  // Status Colors
  success: '#34C759',         // System Green (iOS): Success messages, icons, indicators.
  error: '#FF3B30',           // System Red (iOS): Error messages, icons, destructive actions.
  warning: '#FF9500',         // System Orange (iOS): Warning messages, icons, alerts.
  info: '#007AFF',            // System Blue (iOS), can be same as primary: Informational messages, icons.

  // Specific UI Elements
  tabBarActiveTint: '#007AFF',    // Typically primary color.
  tabBarInactiveTint: '#8E8E93',  // System Gray (iOS): For inactive tab icons and labels.
  tabBarBackground: '#F8F8F8',   // Slightly off-white, common for tab bars (iOS). Or COLORS.cardBackground.

  // Chart Specific (Examples - can be expanded)
  chartLineBlue: '#0A84FF',       // System Blue (iOS) - slightly different for charts if needed.
  chartLineGreen: '#30D158',      // System Green (iOS) - slightly different.
  chartLineRed: '#FF453A',        // System Red (iOS) - slightly different.
  chartGrid: '#E5E5EA',           // System Gray 5 (iOS): For chart grid lines.
  deepSleep: '#004080',           // Custom: Dark blue for deep sleep stages in charts.

  // Grayscale Palette (can be used directly or as basis for text/border shades)
  white: '#FFFFFF',
  lightGray: '#E5E5EA',           // System Gray 5 (iOS)
  mediumGray: '#C7C7CC',          // System Gray 3 (iOS)
  darkGray: '#8E8E93',            // System Gray (iOS)
  black: '#000000',
};
