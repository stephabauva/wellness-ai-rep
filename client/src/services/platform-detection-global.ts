/**
 * Global Platform Detection Service for Console Access
 * Makes platform detection available globally for testing
 */

import { PlatformDetectionService } from './platform-detection';
import { nativeHealthService } from './native-health-service';

// Make services globally available for console testing
declare global {
  interface Window {
    PlatformDetectionService: typeof PlatformDetectionService;
    nativeHealthService: typeof nativeHealthService;
  }
}

// Expose services globally
if (typeof window !== 'undefined') {
  window.PlatformDetectionService = PlatformDetectionService;
  window.nativeHealthService = nativeHealthService;
}

export { PlatformDetectionService, nativeHealthService };