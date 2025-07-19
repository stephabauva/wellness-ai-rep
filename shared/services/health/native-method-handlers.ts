/**
 * Native Method Handlers
 * Extracted from native-health-service.ts for better organization
 * Handles native platform method calls and fallback strategies
 */

import { Capacitor } from '@capacitor/core';
import { generateSampleHealthKitData, generateSampleGoogleFitData } from './sample-data-generators';

/**
 * Base class for handling native platform method calls with fallbacks
 */
export abstract class NativeMethodHandler {
  /**
   * Gets stored permissions for the specific platform
   */
  protected abstract getStoredPermissions(): Promise<any>;

  /**
   * Simulates permission request for development/testing
   */
  protected abstract simulatePermissionRequest(dataTypes: string[]): Promise<any>;

  /**
   * HealthKit-specific method handler
   */
  public async callHealthKitMethod(method: string, args: any): Promise<any> {
    try {
      // Use the actual HealthKit plugin for iOS
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const HealthKitManager = (window as any).Capacitor?.Plugins?.HealthKitManager;
        if (HealthKitManager) {
          return await HealthKitManager[method](args);
        } else {
          console.warn('[HealthKit] HealthKitManager plugin not found on Capacitor.Plugins');
        }
      }
      
      // Fallback for development/web
      const result = await Capacitor.isPluginAvailable('HealthKitManager')
        ? (window as any).CapacitorHealthKit?.[method]?.(args)
        : null;
      
      if (!result) {
        console.log('[HealthKit] Native plugin not available, using fallback');
        return this.getHealthKitFallback(method, args);
      }
      
      return result;
    } catch (error) {
      console.error('[HealthKit] Native call failed:', error);
      return this.getHealthKitFallback(method, args);
    }
  }

  /**
   * Google Fit-specific method handler
   */
  public async callGoogleFitMethod(method: string, args: any): Promise<any> {
    try {
      // This would use a real Google Fit plugin in production
      const result = await Capacitor.isPluginAvailable('GoogleFit')
        ? (window as any).CapacitorGoogleFit?.[method]?.(args)
        : null;
      
      if (!result) {
        console.log('[GoogleFit] Native plugin not available, using fallback');
        return this.getGoogleFitFallback(method, args);
      }
      
      return result;
    } catch (error) {
      console.error('[GoogleFit] Native call failed:', error);
      return this.getGoogleFitFallback(method, args);
    }
  }

  /**
   * HealthKit fallback result generation
   */
  private async getHealthKitFallback(method: string, args: any): Promise<any> {
    switch (method) {
      case 'checkPermissions':
        return await this.getStoredPermissions();
      case 'requestPermissions':
        return await this.simulatePermissionRequest(args.readTypes || []);
      case 'queryData':
        return await generateSampleHealthKitData(args);
      default:
        return null;
    }
  }

  /**
   * Google Fit fallback result generation
   */
  private async getGoogleFitFallback(method: string, args: any): Promise<any> {
    switch (method) {
      case 'checkPermissions':
        return await this.getStoredPermissions();
      case 'requestPermissions':
        return await this.simulatePermissionRequest(args.readTypes || []);
      case 'queryData':
        return await generateSampleGoogleFitData(args);
      default:
        return null;
    }
  }
}