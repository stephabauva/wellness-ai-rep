/**
 * Android Google Fit Provider
 * Extracted from native-health-service.ts for better organization
 * Handles Android Google Fit / Health Connect native health data access
 */

import { Capacitor } from '@capacitor/core';
import type { HealthDataQuery, HealthSyncResult, HealthPermissions, HealthDataPoint } from '../../types/health';
import { googleFitTypes, googleFitUnits } from './provider-mappings';
import { processGoogleFitResults } from './result-processors';
import { NativeBridgeProvider } from './native-bridge-utils';
import { NativeMethodHandler } from './native-method-handlers';
import { getPlatform, isCapacitor, type Platform } from '../platform-detection';

// Import the base class from the HealthKit provider file to ensure consistency
import { NativeHealthProvider } from './healthkit-provider';

/**
 * Android Google Fit / Health Connect provider - Phase 2 Real Implementation
 */
export class GoogleFitProvider extends NativeHealthProvider {
  private bridge = new (class extends NativeBridgeProvider {})();
  private methodHandler = new (class extends NativeMethodHandler {
    protected async getStoredPermissions(): Promise<any> {
      return await this.bridge.getStoredPermissions('googlefit_permissions');
    }
    
    protected async simulatePermissionRequest(dataTypes: string[]): Promise<any> {
      return await this.bridge.simulatePermissionRequest(dataTypes);
    }
    
    constructor(private bridge: NativeBridgeProvider) {
      super();
    }
  })(this.bridge);

  async checkPermissions(): Promise<HealthPermissions> {
    try {
      if (!await this.isAvailable()) {
        return { granted: false, permissions: { read: [], write: [] } };
      }

      // Use Capacitor native bridge to check Google Fit permissions
      const result = await this.methodHandler.callGoogleFitMethod('checkPermissions', {});

      console.log('[GoogleFit] Permission check result:', result);
      
      return {
        granted: result.granted || false,
        permissions: {
          read: result.readPermissions || [],
          write: result.writePermissions || []
        }
      };
    } catch (error) {
      console.error('[GoogleFit] Permission check failed:', error);
      return { granted: false, permissions: { read: [], write: [] } };
    }
  }

  async requestPermissions(dataTypes: string[]): Promise<HealthPermissions> {
    try {
      if (!await this.isAvailable()) {
        throw new Error('Google Fit not available on this device');
      }

      const googleFitDataTypes = dataTypes.map(type => googleFitTypes[type as keyof typeof googleFitTypes]).filter(Boolean);
      
      console.log('[GoogleFit] Requesting permissions for types:', googleFitDataTypes);

      // Use Capacitor native bridge to request Google Fit permissions
      const result = await this.methodHandler.callGoogleFitMethod('requestPermissions', {
        readTypes: googleFitDataTypes,
        writeTypes: [] // Read-only for now
      });

      // Store permissions locally for web testing
      await this.bridge.storePermissions('googlefit_permissions', result);

      return {
        granted: result.granted || false,
        permissions: {
          read: result.readPermissions || dataTypes,
          write: result.writePermissions || []
        }
      };
    } catch (error) {
      console.error('[GoogleFit] Permission request failed:', error);
      throw new Error(`Google Fit permission request failed: ${error}`);
    }
  }

  async queryHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    try {
      if (!await this.isAvailable()) {
        return [];
      }

      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        throw new Error('Google Fit permissions not granted');
      }

      const googleFitQueries = query.dataTypes.map(type => ({
        type: googleFitTypes[type as keyof typeof googleFitTypes],
        friendlyName: type
      })).filter(q => q.type);

      console.log('[GoogleFit] Querying data for:', googleFitQueries);

      // Use Capacitor native bridge to query Google Fit data
      const results = await this.methodHandler.callGoogleFitMethod('queryData', {
        queries: googleFitQueries,
        startTime: query.startDate.getTime(),
        endTime: query.endDate.getTime(),
        bucketType: 'DAY' // Daily aggregation
      });

      return processGoogleFitResults(results);
    } catch (error) {
      console.error('[GoogleFit] Data query failed:', error);
      throw new Error(`Google Fit data query failed: ${error}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (this.platform !== 'android') return false;
    
    // Check if running in Capacitor on Android
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return true;
    }
    
    // For web development, simulate availability
    if (isCapacitor()) {
      return true;
    }
    
    return false;
  }

  async getSupportedDataTypes(): Promise<string[]> {
    return Object.keys(googleFitTypes);
  }

  // Direct access to stored permissions and simulation methods
  private async getStoredPermissions(): Promise<any> {
    return await this.bridge.getStoredPermissions('googlefit_permissions');
  }

  private async simulatePermissionRequest(dataTypes: string[]): Promise<any> {
    return await this.bridge.simulatePermissionRequest(dataTypes);
  }
}