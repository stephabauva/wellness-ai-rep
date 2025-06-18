export const SPACING = {
  xxs: 2,  // Extra extra small
  xs: 4,   // Extra small
  sm: 8,   // Small
  md: 16,  // Medium (common base padding/margin)
  lg: 24,  // Large
  xl: 32,  // Extra large
  xxl: 48, // Extra extra large
};

// For specific layout needs, can add more granular or semantic spacing
export const LAYOUT_SPACING = {
  screenPaddingHorizontal: SPACING.md,
  screenPaddingVertical: SPACING.lg,
  sectionMarginVertical: SPACING.lg,
  itemPaddingVertical: SPACING.sm + SPACING.xs, // 12
  itemPaddingHorizontal: SPACING.md,
  headerPaddingVertical: SPACING.md,
  headerPaddingHorizontal: SPACING.md,
  fabMargin: SPACING.md,
};
