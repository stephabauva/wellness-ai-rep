/**
 * Global Platform Detection Service for Console Access
 * Makes platform detection available globally for testing
 */

import * as PlatformDetection from '@shared/services/platform-detection';
import { nativeHealthService } from './native-health-service';

// Make services globally available for console testing
declare global {
  interface Window {
    PlatformDetection: typeof PlatformDetection;
    nativeHealthService: typeof nativeHealthService;
  }
}

// Expose services globally
if (typeof window !== 'undefined') {
  window.PlatformDetection = PlatformDetection;
  window.nativeHealthService = nativeHealthService;
}

export { PlatformDetection, nativeHealthService };