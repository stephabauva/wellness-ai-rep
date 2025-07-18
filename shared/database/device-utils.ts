import type { ConnectedDevice } from "@shared/schema";

/**
 * Utility functions for device metadata handling
 * Used by both MemStorage and DatabaseStorage to avoid code duplication
 */

/**
 * Safely merge device metadata, ensuring both existing and new metadata are objects
 * @param existingMetadata - Current device metadata (may be null or non-object)
 * @param newMetadata - New metadata to merge (may be null or non-object) 
 * @returns Merged metadata object
 */
export function mergeDeviceMetadata(
  existingMetadata: any,
  newMetadata: any
): Record<string, any> {
  const safeExisting = (existingMetadata && typeof existingMetadata === 'object') 
    ? existingMetadata 
    : {};
  
  const safeNew = (newMetadata && typeof newMetadata === 'object') 
    ? newMetadata 
    : {};
  
  return {
    ...safeExisting,
    ...safeNew
  };
}

/**
 * Prepare device update settings with merged metadata and updated sync time
 * @param currentDevice - Current device object
 * @param settings - Update settings (may include metadata)
 * @returns Processed settings ready for database update
 */
export function prepareDeviceUpdateSettings(
  currentDevice: ConnectedDevice,
  settings: any
): any {
  let updatedSettings = { ...settings };
  
  // If metadata is being updated, merge it with existing metadata
  if (settings.metadata) {
    updatedSettings.metadata = mergeDeviceMetadata(
      currentDevice.metadata,
      settings.metadata
    );
  }
  
  // Always update lastSync when device settings are modified
  updatedSettings.lastSync = new Date();
  
  return updatedSettings;
}

/**
 * Create updated device object for memory storage (does full object merge)
 * @param device - Current device object
 * @param settings - Update settings
 * @returns New device object with merged settings
 */
export function createUpdatedDevice(
  device: ConnectedDevice,
  settings: any
): ConnectedDevice {
  return {
    ...device,
    metadata: mergeDeviceMetadata(device.metadata, settings),
    lastSync: new Date()
  };
}