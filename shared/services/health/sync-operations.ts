/**
 * Health Sync Operations
 * Extracted from native-health-service.ts for better organization
 * Handles health data synchronization with backend services
 */

import { getPlatform } from '../platform-detection';
import type { HealthDataQuery, HealthSyncResult, HealthPermissions, HealthDataPoint } from '../../types/health';

/**
 * Health sync operations handler
 */
export class HealthSyncOperations {
  constructor(private provider: any | null) {}

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
      const isAvailable = await this.provider?.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsImported: 0,
          errors: ['Native health service not available on this platform'],
          duration: Date.now() - startTime
        };
      }

      const permissions = await this.provider?.checkPermissions();
      if (!permissions?.granted) {
        return {
          success: false,
          recordsProcessed: 0,
          recordsImported: 0,
          errors: ['Health permissions not granted - please request permissions first'],
          duration: Date.now() - startTime
        };
      }

      // For native platforms with permissions, query actual health data
      const supportedTypes = await this.provider?.getSupportedDataTypes() || [];
      const testTypes = supportedTypes.slice(0, 3);
      
      const testQuery: HealthDataQuery = {
        dataTypes: testTypes,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 100
      };

      const healthData = await this.provider?.queryHealthData(testQuery) || [];
      
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
  async performFullSync(
    checkPermissions: () => Promise<HealthPermissions>,
    getSupportedDataTypes: () => Promise<string[]>,
    requestPermissions: (types: string[]) => Promise<HealthPermissions>,
    queryHealthData: (query: HealthDataQuery) => Promise<HealthDataPoint[]>,
    dataTypes?: string[], 
    timeRangeDays: number = 30
  ): Promise<HealthSyncResult> {
    const startTime = Date.now();
    
    try {
      if (!this.provider) {
        throw new Error('No native health provider available');
      }

      const permissions = await checkPermissions();
      if (!permissions.granted) {
        // Attempt to request permissions
        const supportedTypes = await getSupportedDataTypes();
        const requestTypes = dataTypes || supportedTypes.slice(0, 5);
        const newPermissions = await requestPermissions(requestTypes);
        
        if (!newPermissions.granted) {
          throw new Error('Health permissions denied by user');
        }
      }

      const query: HealthDataQuery = {
        dataTypes: dataTypes || await getSupportedDataTypes(),
        startDate: new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        limit: 10000
      };

      const healthData = await queryHealthData(query);
      
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
}