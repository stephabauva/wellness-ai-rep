/**
 * @file spacing.ts
 * @description Defines spacing constants for margins, paddings, and layout.
 * Includes a base scale and semantic layout spacing units.
 */

/**
 * Base spacing scale.
 * Use these for consistent margins, paddings, and component dimensions.
 * (e.g., `padding: SPACING.md`)
 */
export const SPACING = {
  xxs: 2,  // Extra extra small (e.g., fine adjustments)
  xs: 4,   // Extra small (e.g., small icon padding)
  sm: 8,   // Small
  md: 16,  // Medium (common base padding/margin)
  lg: 24,  // Large
  xl: 32,  // Extra large (e.g., large section padding)
  xxl: 48, // Extra extra large (e.g., hero image bottom margin)
};

/**
 * Semantic spacing units for common layout patterns.
 * These often combine values from the base `SPACING` scale.
 * (e.g., `paddingHorizontal: LAYOUT_SPACING.screenPaddingHorizontal`)
 */
export const LAYOUT_SPACING = {
  /** Default horizontal padding for screen content. */
  screenPaddingHorizontal: SPACING.md,
  /** Default vertical padding for screen content (can be overridden by specific needs like headers). */
  screenPaddingVertical: SPACING.lg,
  /** Standard vertical margin between major UI sections. */
  sectionMarginVertical: SPACING.lg,
  /** Standard vertical padding within list items or cards. */
  itemPaddingVertical: SPACING.sm + SPACING.xs, // 12, often good for touch targets
  /** Standard horizontal padding within list items or cards. */
  itemPaddingHorizontal: SPACING.md,
  /** Vertical padding for main headers or tab bar areas. */
  headerPaddingVertical: SPACING.md,
  /** Horizontal padding for main headers or tab bar areas. */
  headerPaddingHorizontal: SPACING.md,
  /** Margin for Floating Action Buttons from screen edges. */
  fabMargin: SPACING.md,
  /** Standard gap between elements in a row or column. */
  elementGap: SPACING.sm,
};
