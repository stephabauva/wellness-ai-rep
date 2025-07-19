/**
 * Health Data Types
 * Extracted from native-health-service.ts for better organization
 */

export interface HealthDataPoint {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface HealthDataQuery {
  dataTypes: string[];
  startDate: Date;
  endDate: Date;
  limit?: number;
}

export interface HealthSyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsImported: number;
  errors: string[];
  duration: number;
}

export interface HealthPermissions {
  granted: boolean;
  permissions: {
    read: string[];
    write: string[];
  };
}