/**
 * Platform Detection Service - Phase 1
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

export class PlatformDetectionService {
  /**
   * Detects if the app is running inside Capacitor
   */
  static isCapacitor(): boolean {
    return !!(window as any).Capacitor;
  }

  /**
   * Gets the current platform
   */
  static getPlatform(): Platform {
    if (!this.isCapacitor()) {
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
  }

  /**
   * Checks if native health data access is available
   */
  static hasHealthAccess(): boolean {
    const platform = this.getPlatform();
    return this.isCapacitor() && ['ios', 'android'].includes(platform);
  }

  /**
   * Gets platform-specific capabilities
   */
  static getCapabilities(): PlatformCapabilities {
    const platform = this.getPlatform();
    const isCapacitor = this.isCapacitor();

    return {
      healthDataAccess: isCapacitor && ['ios', 'android'].includes(platform),
      backgroundSync: isCapacitor && ['ios', 'android'].includes(platform),
      bluetoothLE: isCapacitor && ['ios', 'android'].includes(platform),
      fileUpload: true, // Always available as fallback
      pushNotifications: isCapacitor && ['ios', 'android'].includes(platform),
    };
  }

  /**
   * Gets platform-specific health data providers
   */
  static getHealthProviders(): string[] {
    const platform = this.getPlatform();
    
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
  }

  /**
   * Checks if a specific health provider is available
   */
  static isHealthProviderAvailable(provider: string): boolean {
    const availableProviders = this.getHealthProviders();
    return availableProviders.includes(provider);
  }

  /**
   * Gets environment information for debugging
   */
  static getEnvironmentInfo() {
    return {
      platform: this.getPlatform(),
      isCapacitor: this.isCapacitor(),
      capabilities: this.getCapabilities(),
      healthProviders: this.getHealthProviders(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      hasCapacitorGlobal: !!(window as any).Capacitor,
    };
  }

  /**
   * Logs platform information for debugging
   */
  static logPlatformInfo(): void {
    const info = this.getEnvironmentInfo();
    console.log('[PlatformDetection] Environment Info:', info);
  }
}