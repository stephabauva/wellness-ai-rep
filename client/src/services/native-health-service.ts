/**
 * Native Health Service - Phase 1 Foundation
 * Provides abstraction layer for native health data access across platforms
 * Part of the Capacitor Mobile Health Data Integration Plan
 */

import { PlatformDetectionService, Platform } from './platform-detection';

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

/**
 * Abstract base class for native health data access
 */
export abstract class NativeHealthProvider {
  protected platform: Platform;

  constructor() {
    this.platform = PlatformDetectionService.getPlatform();
  }

  abstract checkPermissions(): Promise<HealthPermissions>;
  abstract requestPermissions(dataTypes: string[]): Promise<HealthPermissions>;
  abstract queryHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]>;
  abstract isAvailable(): Promise<boolean>;
  abstract getSupportedDataTypes(): Promise<string[]>;
}

/**
 * iOS HealthKit provider (future implementation)
 */
export class HealthKitProvider extends NativeHealthProvider {
  async checkPermissions(): Promise<HealthPermissions> {
    console.log('[HealthKit] Checking permissions - Phase 1 stub');
    return {
      granted: false,
      permissions: { read: [], write: [] }
    };
  }

  async requestPermissions(dataTypes: string[]): Promise<HealthPermissions> {
    console.log('[HealthKit] Requesting permissions for:', dataTypes);
    return {
      granted: false,
      permissions: { read: [], write: [] }
    };
  }

  async queryHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    console.log('[HealthKit] Querying health data - Phase 1 stub:', query);
    return [];
  }

  async isAvailable(): Promise<boolean> {
    return this.platform === 'ios' && PlatformDetectionService.isCapacitor();
  }

  async getSupportedDataTypes(): Promise<string[]> {
    return [
      'steps',
      'heart_rate',
      'active_energy',
      'distance_walking',
      'sleep_analysis',
      'body_mass',
      'height'
    ];
  }
}

/**
 * Android Google Fit / Health Connect provider (future implementation)
 */
export class GoogleFitProvider extends NativeHealthProvider {
  async checkPermissions(): Promise<HealthPermissions> {
    console.log('[GoogleFit] Checking permissions - Phase 1 stub');
    return {
      granted: false,
      permissions: { read: [], write: [] }
    };
  }

  async requestPermissions(dataTypes: string[]): Promise<HealthPermissions> {
    console.log('[GoogleFit] Requesting permissions for:', dataTypes);
    return {
      granted: false,
      permissions: { read: [], write: [] }
    };
  }

  async queryHealthData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    console.log('[GoogleFit] Querying health data - Phase 1 stub:', query);
    return [];
  }

  async isAvailable(): Promise<boolean> {
    return this.platform === 'android' && PlatformDetectionService.isCapacitor();
  }

  async getSupportedDataTypes(): Promise<string[]> {
    return [
      'steps',
      'heart_rate',
      'calories_burned',
      'distance',
      'sleep',
      'weight',
      'height'
    ];
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
    const platform = PlatformDetectionService.getPlatform();
    
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
    const platform = PlatformDetectionService.getPlatform();
    const capabilities = PlatformDetectionService.getCapabilities();
    
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
   * Performs a test sync to validate the service
   */
  async testSync(): Promise<HealthSyncResult> {
    const startTime = Date.now();
    
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsImported: 0,
          errors: ['Native health service not available'],
          duration: Date.now() - startTime
        };
      }

      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsImported: 0,
          errors: ['Health permissions not granted'],
          duration: Date.now() - startTime
        };
      }

      // Phase 1: Just test the service without actual data
      return {
        success: true,
        recordsProcessed: 0,
        recordsImported: 0,
        errors: [],
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
}

// Export singleton instance
export const nativeHealthService = new NativeHealthService();