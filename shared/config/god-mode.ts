/**
 * God Mode Configuration
 * Controls visibility of developer monitoring features
 * Client-safe implementation using Vite environment variables
 */

interface GodModeConfig {
  enabled: boolean;
  features: {
    memoryQualityMetrics: boolean;
    systemDiagnostics: boolean;
    performanceMonitoring: boolean;
  };
}

// Client-safe environment variable access
const getGodModeEnabled = (): boolean => {
  // In client-side code, use Vite's import.meta.env
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_GODMODE === 'true';
  }
  
  // In server-side code, use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env.GODMODE === 'true';
  }
  
  return false;
};

const godModeConfig: GodModeConfig = {
  enabled: getGodModeEnabled(),
  features: {
    memoryQualityMetrics: true,
    systemDiagnostics: true,
    performanceMonitoring: true,
  },
};

export const isGodModeEnabled = (): boolean => {
  return godModeConfig.enabled;
};

export const isGodModeFeatureEnabled = (feature: keyof GodModeConfig['features']): boolean => {
  return godModeConfig.enabled && godModeConfig.features[feature];
};

export default godModeConfig;