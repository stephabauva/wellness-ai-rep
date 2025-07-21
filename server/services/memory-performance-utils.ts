/**
 * Utility functions for memory performance calculations
 * Pure functions with no side effects
 */

/**
 * Calculate average of array of numbers
 */
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Calculate percentile value from array of numbers
 */
export function calculatePercentile(numbers: number[], percentile: number): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Trim array to maximum samples (modifies original array)
 */
export function trimArray(array: number[], maxSamples: number): void {
  while (array.length > maxSamples) {
    array.shift();
  }
}