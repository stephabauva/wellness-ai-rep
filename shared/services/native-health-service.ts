/**
 * Native Health Service - Phase 2 Implementation
 * Provides real native health data access across platforms with full integration
 * Part of the Capacitor Mobile Health Data Integration Plan
 */

import { getPlatform, getCapabilities, type Platform } from '@shared/services/platform-detection';
import type { HealthDataPoint, HealthDataQuery, HealthSyncResult, HealthPermissions } from '@shared/types/health';
import { HealthSyncOperations } from '@shared/services/health/sync-operations';
import { NativeHealthProvider, HealthKitProvider } from '@shared/services/health/healthkit-provider';

// Re-export for external usage
export { NativeHealthProvider, HealthKitProvider };
import { GoogleFitProvider } from '@shared/services/health/googlefit-provider';
export { GoogleFitProvider };

// Provider classes have been extracted to separate files
// @see healthkit-provider.ts
// @see googlefit-provider.ts

/**
 * Main native health service with provider abstraction
 */
export class NativeHealthService {
  private provider: NativeHealthProvider | null = null;
  private initialized = false;
  private syncOperations: HealthSyncOperations;

  constructor() {
    this.initializeProvider();
    this.syncOperations = new HealthSyncOperations(this.provider);
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
    
    // Update sync operations with new provider
    this.syncOperations = new HealthSyncOperations(this.provider);
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
    return await this.syncOperations.testSync();
  }

  /**
   * Performs a full synchronization with the backend
   */
  async performFullSync(dataTypes?: string[], timeRangeDays: number = 30): Promise<HealthSyncResult> {
    return await this.syncOperations.performFullSync(
      () => this.checkPermissions(),
      () => this.getSupportedDataTypes(),
      (types: string[]) => this.requestPermissions(types),
      (query: HealthDataQuery) => this.queryHealthData(query),
      dataTypes,
      timeRangeDays
    );
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