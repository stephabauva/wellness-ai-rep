/**
 * Health Provider Type Mappings
 * Extracted from native-health-service.ts for better organization
 * Maps friendly health data type names to platform-specific identifiers
 */

/**
 * iOS HealthKit type mappings
 */
export const healthKitTypes = {
  'steps': 'HKQuantityTypeIdentifierStepCount',
  'heart_rate': 'HKQuantityTypeIdentifierHeartRate',
  'active_energy': 'HKQuantityTypeIdentifierActiveEnergyBurned',
  'distance_walking': 'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'sleep_analysis': 'HKCategoryTypeIdentifierSleepAnalysis',
  'body_mass': 'HKQuantityTypeIdentifierBodyMass',
  'height': 'HKQuantityTypeIdentifierHeight',
  'blood_pressure_systolic': 'HKQuantityTypeIdentifierBloodPressureSystolic',
  'blood_pressure_diastolic': 'HKQuantityTypeIdentifierBloodPressureDiastolic',
  'respiratory_rate': 'HKQuantityTypeIdentifierRespiratoryRate'
} as const;

/**
 * Android Google Fit type mappings
 */
export const googleFitTypes = {
  'steps': 'com.google.step_count.delta',
  'heart_rate': 'com.google.heart_rate.bpm',
  'calories_burned': 'com.google.calories.expended',
  'distance': 'com.google.distance.delta',
  'sleep': 'com.google.sleep.segment',
  'weight': 'com.google.weight',
  'height': 'com.google.height',
  'active_minutes': 'com.google.active_minutes',
  'move_minutes': 'com.google.activity.segment'
} as const;

/**
 * Google Fit unit mappings
 */
export const googleFitUnits: Record<string, string> = {
  'com.google.step_count.delta': 'count',
  'com.google.heart_rate.bpm': 'bpm',
  'com.google.calories.expended': 'kcal',
  'com.google.distance.delta': 'meters',
  'com.google.weight': 'kg',
  'com.google.height': 'meters'
};