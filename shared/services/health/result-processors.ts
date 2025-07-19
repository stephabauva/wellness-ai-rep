/**
 * Health Result Processors
 * Extracted from native-health-service.ts for better organization
 * Processes platform-specific health data results into common format
 */

import type { HealthDataPoint } from '@shared/types/health';
import { healthKitTypes, googleFitTypes, googleFitUnits } from './provider-mappings';

/**
 * Processes HealthKit results into standardized HealthDataPoint format
 */
export function processHealthKitResults(results: any): HealthDataPoint[] {
  if (!results?.samples) return [];
  
  return results.samples.map((sample: any, index: number) => ({
    id: `healthkit_${Date.now()}_${index}`,
    type: getTypeFromHealthKitIdentifier(sample.type),
    value: sample.value,
    unit: sample.unit,
    timestamp: new Date(sample.startDate),
    source: 'HealthKit',
    metadata: {
      healthKitType: sample.type,
      endDate: sample.endDate,
      device: sample.device || 'iPhone'
    }
  }));
}

/**
 * Processes Google Fit results into standardized HealthDataPoint format
 */
export function processGoogleFitResults(results: any): HealthDataPoint[] {
  if (!results?.buckets) return [];
  
  return results.buckets.map((bucket: any, index: number) => ({
    id: `googlefit_${Date.now()}_${index}`,
    type: getTypeFromGoogleFitIdentifier(bucket.type),
    value: bucket.value,
    unit: getUnitForGoogleFitType(bucket.type),
    timestamp: new Date(bucket.startTime),
    source: 'Google Fit',
    metadata: {
      googleFitType: bucket.type,
      endTime: bucket.endTime,
      device: bucket.device || 'Android'
    }
  }));
}

/**
 * Converts HealthKit type identifier back to friendly name
 */
function getTypeFromHealthKitIdentifier(healthKitType: string): string {
  for (const [friendlyName, hkType] of Object.entries(healthKitTypes)) {
    if (hkType === healthKitType) return friendlyName;
  }
  return healthKitType;
}

/**
 * Converts Google Fit type identifier back to friendly name
 */
function getTypeFromGoogleFitIdentifier(googleFitType: string): string {
  for (const [friendlyName, gfType] of Object.entries(googleFitTypes)) {
    if (gfType === googleFitType) return friendlyName;
  }
  return googleFitType;
}

/**
 * Gets the unit for a Google Fit data type
 */
function getUnitForGoogleFitType(googleFitType: string): string {
  return googleFitUnits[googleFitType] || 'unknown';
}