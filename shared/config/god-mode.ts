/**
 * God Mode Configuration
 * Controls visibility of developer monitoring features
 */

interface GodModeConfig {
  enabled: boolean;
  features: {
    memoryQualityMetrics: boolean;
    systemDiagnostics: boolean;
    performanceMonitoring: boolean;
  };
}

const godModeConfig: GodModeConfig = {
  enabled: process.env.GODMODE === 'true',
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