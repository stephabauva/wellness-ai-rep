/**
 * Platform Detection Utilities
 * Provides platform detection and capability checking for mobile health data integration
 * Part of the Capacitor Mobile Health Data Integration Plan
 */

export interface PlatformCapabilities {
  healthDataAccess: boolean;
  backgroundSync: boolean;
  bluetoothLE: boolean;
  fileUpload: boolean;
  pushNotifications: boolean;
}

export type Platform = 'web' | 'ios' | 'android' | 'desktop';

/**
 * Detects if the app is running inside Capacitor
 */
export const isCapacitor = (): boolean => {
  return !!(window as any).Capacitor;
};

/**
 * Gets the current platform
 */
export const getPlatform = (): Platform => {
  if (!isCapacitor()) {
    // Check if running in desktop environment
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('electron')) {
        return 'desktop';
      }
    }
    return 'web';
  }

  const platform = (window as any).Capacitor.getPlatform();
  return platform as Platform;
};

/**
 * Checks if native health data access is available
 */
export const hasHealthAccess = (): boolean => {
  const platform = getPlatform();
  return isCapacitor() && ['ios', 'android'].includes(platform);
};

/**
 * Gets platform-specific capabilities
 */
export const getCapabilities = (): PlatformCapabilities => {
  const platform = getPlatform();
  const isCapacitorApp = isCapacitor();

  return {
    healthDataAccess: isCapacitorApp && ['ios', 'android'].includes(platform),
    backgroundSync: isCapacitorApp && ['ios', 'android'].includes(platform),
    bluetoothLE: isCapacitorApp && ['ios', 'android'].includes(platform),
    fileUpload: true, // Always available as fallback
    pushNotifications: isCapacitorApp && ['ios', 'android'].includes(platform),
  };
};

/**
 * Gets platform-specific health data providers
 */
export const getHealthProviders = (): string[] => {
  const platform = getPlatform();
  
  switch (platform) {
    case 'ios':
      return ['HealthKit', 'Apple Health'];
    case 'android':
      return ['Google Fit', 'Health Connect'];
    case 'web':
    case 'desktop':
    default:
      return ['File Upload'];
  }
};

/**
 * Checks if a specific health provider is available
 */
export const isHealthProviderAvailable = (provider: string): boolean => {
  const availableProviders = getHealthProviders();
  return availableProviders.includes(provider);
};

/**
 * Gets environment information for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    platform: getPlatform(),
    isCapacitor: isCapacitor(),
    capabilities: getCapabilities(),
    healthProviders: getHealthProviders(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    hasCapacitorGlobal: !!(window as any).Capacitor,
  };
};

/**
 * Logs platform information for debugging
 */
export const logPlatformInfo = (): void => {
  const info = getEnvironmentInfo();
  console.log('[PlatformDetection] Environment Info:', info);
};