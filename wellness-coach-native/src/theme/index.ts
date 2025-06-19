/**
 * @file index.ts
 * @description Barrel file for re-exporting theme constants.
 * This allows for easier importing of theme values from a single source.
 *
 * @example
 * import { COLORS, SPACING, FONT_SIZES } from '../theme';
 * // or from other files: import { THEME } from 'src/theme' if aliased.
 */

export * from './colors';
export * from './spacing';
export * from './typography';
