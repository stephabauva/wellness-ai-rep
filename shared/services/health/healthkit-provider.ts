/**
 * iOS HealthKit Provider
 * Extracted from native-health-service.ts for better organization
 * Handles iOS HealthKit native health data access
 */

import { Capacitor } from '@capacitor/core';
import type { HealthDataQuery, HealthSyncResult, HealthPermissions, HealthDataPoint } from '../../types/health';
import { healthKitTypes } from './provider-mappings';
import { processHealthKitResults } from './result-processors';
import { NativeBridgeProvider } from './native-bridge-utils';
import { NativeMethodHandler } from './native-method-handlers';
import { getPlatform, isCapacitor, type Platform } from '../platform-detection';

/**
 * Abstract base class for native health data access
 */
export abstract class NativeHealthProvider {
  protected platform: Platform;

  constructor() {
    this.platform = getPlatform();
  }

  abstract checkPermissions(): Promise<HealthPermissions>;
  abstract requestPermissions(dataTypes: string[]): Promise<HealthPermissions>;
  abstract queryHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]>;
  abstract isAvailable(): Promise<boolean>;
  abstract getSupportedDataTypes(): Promise<string[]>;
}

/**
 * iOS HealthKit provider - Phase 2 Real Implementation
 */
export class HealthKitProvider extends NativeHealthProvider {
  private bridge = new (class extends NativeBridgeProvider {})();
  private methodHandler = new (class extends NativeMethodHandler {
    protected async getStoredPermissions(): Promise<any> {
      return await this.bridge.getStoredPermissions('healthkit_permissions');
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

      // On real iOS device, check HealthKit permissions
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        try {
          // Use native iOS HealthKit API
          const result = await this.methodHandler.callHealthKitMethod('checkPermissions', {});
          return {
            granted: result.granted || false,
            permissions: {
              read: result.readPermissions || [],
              write: result.writePermissions || []
            }
          };
        } catch (error) {
          console.error('[HealthKit] Native permission check failed:', error);
          return { granted: false, permissions: { read: [], write: [] } };
        }
      }

      // For web/development, return stored permissions
      const stored = await this.getStoredPermissions();
      return {
        granted: stored.granted || false,
        permissions: {
          read: stored.readPermissions || [],
          write: stored.writePermissions || []
        }
      };
    } catch (error) {
      console.error('[HealthKit] Permission check failed:', error);
      return { granted: false, permissions: { read: [], write: [] } };
    }
  }

  async requestPermissions(dataTypes: string[]): Promise<HealthPermissions> {
    try {
      if (!await this.isAvailable()) {
        throw new Error('HealthKit not available on this device');
      }

      const healthKitIdentifiers = dataTypes.map(type => healthKitTypes[type as keyof typeof healthKitTypes]).filter(Boolean);
      
      console.log('[HealthKit] Requesting permissions for types:', healthKitIdentifiers);

      // Use Capacitor native bridge to request HealthKit permissions
      const result = await this.methodHandler.callHealthKitMethod('requestPermissions', {
        readTypes: healthKitIdentifiers,
        writeTypes: [] // Read-only for now
      });

      // Store permissions locally for web testing
      await this.bridge.storePermissions('healthkit_permissions', result);

      return {
        granted: result.granted || false,
        permissions: {
          read: result.readPermissions || dataTypes,
          write: result.writePermissions || []
        }
      };
    } catch (error) {
      console.error('[HealthKit] Permission request failed:', error);
      throw new Error(`HealthKit permission request failed: ${error}`);
    }
  }

  async queryHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    try {
      if (!await this.isAvailable()) {
        return [];
      }

      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        throw new Error('HealthKit permissions not granted');
      }

      const healthKitQueries = query.dataTypes.map(type => ({
        type: healthKitTypes[type as keyof typeof healthKitTypes],
        friendlyName: type
      })).filter(q => q.type);

      console.log('[HealthKit] Querying data for:', healthKitQueries);

      // Use Capacitor native bridge to query HealthKit data
      const results = await this.methodHandler.callHealthKitMethod('queryData', {
        queries: healthKitQueries,
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
        limit: query.limit || 1000
      });

      return processHealthKitResults(results);
    } catch (error) {
      console.error('[HealthKit] Data query failed:', error);
      throw new Error(`HealthKit data query failed: ${error}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (this.platform !== 'ios') return false;
    
    // Check if running in Capacitor on iOS
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      return true;
    }
    
    // For web development, simulate availability
    if (isCapacitor()) {
      return true;
    }
    
    return false;
  }

  async getSupportedDataTypes(): Promise<string[]> {
    return Object.keys(healthKitTypes);
  }

  // Direct access to stored permissions and simulation methods
  private async getStoredPermissions(): Promise<any> {
    return await this.bridge.getStoredPermissions('healthkit_permissions');
  }

  private async simulatePermissionRequest(dataTypes: string[]): Promise<any> {
    return await this.bridge.simulatePermissionRequest(dataTypes);
  }
}