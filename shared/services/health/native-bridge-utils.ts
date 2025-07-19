/**
 * Native Bridge Utilities
 * Extracted from native-health-service.ts for better organization
 * Provides common utilities for native platform communication
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Base class for native bridge communication
 */
export abstract class NativeBridgeProvider {
  /**
   * Gets stored permissions from local storage
   */
  public async getStoredPermissions(key: string): Promise<any> {
    try {
      const stored = await Preferences.get({ key });
      return stored.value ? JSON.parse(stored.value) : { granted: false };
    } catch {
      return { granted: false };
    }
  }

  /**
   * Simulates permission request for development
   */
  public async simulatePermissionRequest(dataTypes: string[]): Promise<any> {
    // For development - simulate user granting permissions
    return {
      granted: true,
      readPermissions: dataTypes,
      writePermissions: []
    };
  }

  /**
   * Stores permissions locally for web testing
   */
  public async storePermissions(key: string, permissions: any): Promise<void> {
    await Preferences.set({
      key,
      value: JSON.stringify(permissions)
    });
  }

  /**
   * Checks if a Capacitor plugin is available
   */
  protected isPluginAvailable(pluginName: string): boolean {
    return Capacitor.isPluginAvailable(pluginName);
  }

  /**
   * Checks if running on native platform
   */
  protected isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Gets the current platform
   */
  protected getPlatform(): string {
    return Capacitor.getPlatform();
  }
}