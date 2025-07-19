/**
 * Native Health Service - Phase 2 Implementation
 * Provides real native health data access across platforms with full integration
 * Part of the Capacitor Mobile Health Data Integration Plan
 */

import { getPlatform, isCapacitor, getCapabilities, type Platform } from '@shared/services/platform-detection';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { HealthDataPoint, HealthDataQuery, HealthSyncResult, HealthPermissions } from '@shared/types/health';
import { healthKitTypes, googleFitTypes, googleFitUnits } from '@shared/services/health/provider-mappings';
import { processHealthKitResults, processGoogleFitResults } from '@shared/services/health/result-processors';
import { NativeBridgeProvider } from '@shared/services/health/native-bridge-utils';
import { NativeMethodHandler } from '@shared/services/health/native-method-handlers';

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

/**
 * Main native health service with provider abstraction
 */
export class NativeHealthService {
  private provider: NativeHealthProvider | null = null;
  private initialized = false;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const platform = getPlatform();
    
    switch (platform) {
      case 'ios':
        this.provider = new HealthKitProvider();
        break;
      case 'android':
        this.provider = new GoogleFitProvider();
        break;
      default:
        console.log('[NativeHealthService] No native health provider available for platform:', platform);
        this.provider = null;
    }

    this.initialized = true;
  }

  /**
   * Checks if native health data access is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.provider) return false;
    return await this.provider.isAvailable();
  }

  /**
   * Gets the current provider information
   */
  getProviderInfo() {
    const platform = getPlatform();
    const capabilities = getCapabilities();
    
    return {
      platform,
      hasProvider: !!this.provider,
      providerType: this.provider?.constructor.name || 'none',
      capabilities,
      initialized: this.initialized
    };
  }

  /**
   * Checks current permissions
   */
  async checkPermissions(): Promise<HealthPermissions> {
    if (!this.provider) {
      return { granted: false, permissions: { read: [], write: [] } };
    }
    return await this.provider.checkPermissions();
  }

  /**
   * Requests health data permissions
   */
  async requestPermissions(dataTypes: string[]): Promise<HealthPermissions> {
    if (!this.provider) {
      throw new Error('No native health provider available');
    }
    return await this.provider.requestPermissions(dataTypes);
  }

  /**
   * Queries health data from native provider
   */
  async queryHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    if (!this.provider) {
      return [];
    }
    return await this.provider.queryHealthData(query);
  }

  /**
   * Gets supported data types for current platform
   */
  async getSupportedDataTypes(): Promise<string[]> {
    if (!this.provider) {
      return [];
    }
    return await this.provider.getSupportedDataTypes();
  }

  /**
   * Performs a test sync to validate the service and retrieve sample data
   */
  async testSync(): Promise<HealthSyncResult> {
    const startTime = Date.now();
    
    try {
      // For web platform, call the backend API directly
      const platform = getPlatform();
      
      if (platform === 'web') {
        const response = await fetch('/api/health-data/native-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataTypes: ['steps', 'heart_rate', 'sleep'],
            timeRangeDays: 7,
            platform: 'web'
          })
        });

        if (!response.ok) {
          throw new Error(`Test sync failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        return {
          success: result.success,
          recordsProcessed: result.recordsProcessed || 0,
          recordsImported: result.recordsImported || 0,
          errors: result.errors || [],
          duration: Date.now() - startTime
        };
      }

      // For native platforms, check availability and permissions
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsImported: 0,
          errors: ['Native health service not available on this platform'],
          duration: Date.now() - startTime
        };
      }

      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsImported: 0,
          errors: ['Health permissions not granted - please request permissions first'],
          duration: Date.now() - startTime
        };
      }

      // For native platforms with permissions, query actual health data
      const supportedTypes = await this.getSupportedDataTypes();
      const testTypes = supportedTypes.slice(0, 3);
      
      const testQuery: HealthDataQuery = {
        dataTypes: testTypes,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 100
      };

      const healthData = await this.queryHealthData(testQuery);
      
      return {
        success: true,
        recordsProcessed: healthData.length,
        recordsImported: healthData.length,
        errors: [],
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsImported: 0,
        errors: [error instanceof Error ? error.message : 'Test sync failed'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Performs a full synchronization with the backend
   */
  async performFullSync(dataTypes?: string[], timeRangeDays: number = 30): Promise<HealthSyncResult> {
    const startTime = Date.now();
    
    try {
      if (!this.provider) {
        throw new Error('No native health provider available');
      }

      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        // Attempt to request permissions
        const supportedTypes = await this.getSupportedDataTypes();
        const requestTypes = dataTypes || supportedTypes.slice(0, 5);
        const newPermissions = await this.requestPermissions(requestTypes);
        
        if (!newPermissions.granted) {
          throw new Error('Health permissions denied by user');
        }
      }

      const query: HealthDataQuery = {
        dataTypes: dataTypes || await this.getSupportedDataTypes(),
        startDate: new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 10000
      };

      const healthData = await this.queryHealthData(query);
      
      if (healthData.length === 0) {
        return {
          success: true,
          recordsProcessed: 0,
          recordsImported: 0,
          errors: ['No health data found for the specified time range'],
          duration: Date.now() - startTime
        };
      }

      // Send data to backend for processing
      const response = await fetch('/api/health-data/native-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: healthData,
          platform: getPlatform(),
          provider: this.provider.constructor.name,
          syncTimestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        recordsProcessed: healthData.length,
        recordsImported: result.imported || healthData.length,
        errors: result.errors || [],
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        recordsProcessed: 0,
        recordsImported: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Gets health data directly without backend sync
   */
  async getHealthDataDirect(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    if (!this.provider) {
      return [];
    }

    const permissions = await this.checkPermissions();
    if (!permissions.granted) {
      throw new Error('Health permissions not granted');
    }

    return await this.provider.queryHealthData(query);
  }
}

// Export singleton instance
export const nativeHealthService = new NativeHealthService();