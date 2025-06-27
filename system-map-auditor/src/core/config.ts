import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import type { AuditConfig } from './types.js';

export class ConfigManager {
  private config: AuditConfig;
  private configPath: string;

  constructor(customConfigPath?: string) {
    this.configPath = customConfigPath || this.findDefaultConfig();
    this.config = this.loadConfig();
  }

  private findDefaultConfig(): string {
    // Look for config in current directory first, then in the auditor package
    const currentDirConfig = resolve(process.cwd(), 'system-map-auditor.config.json');
    if (existsSync(currentDirConfig)) {
      return currentDirConfig;
    }

    // Fall back to default config in package
    return join(__dirname, '../../config/default-config.json');
  }

  private loadConfig(): AuditConfig {
    try {
      const configData = readFileSync(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);
      
      // Merge with default config to ensure all properties exist
      return this.mergeWithDefaults(parsedConfig);
    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}, using defaults`);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): AuditConfig {
    return {
      validation: {
        components: {
          checkExistence: true,
          validateDependencies: true,
          checkUnusedComponents: false
        },
        apis: {
          checkHandlerFiles: true,
          validateSchemas: false,
          checkOrphanedEndpoints: true
        },
        flows: {
          validateSteps: true,
          checkComponentCapabilities: true,
          validateApiCalls: true
        },
        references: {
          resolveSystemMapRefs: true,
          validateFileReferences: true
        }
      },
      scanning: {
        includePatterns: [
          'src/**/*',
          'client/**/*',
          'server/**/*',
          'shared/**/*'
        ],
        excludePatterns: [
          'node_modules/**/*',
          'dist/**/*',
          'build/**/*',
          'coverage/**/*',
          '.git/**/*'
        ],
        fileExtensions: [
          '.ts',
          '.tsx',
          '.js',
          '.jsx'
        ]
      },
      reporting: {
        format: 'console',
        verbose: false,
        showSuggestions: true
      },
      performance: {
        maxExecutionTime: 30000,
        parallel: false,
        cacheEnabled: true
      }
    };
  }

  private mergeWithDefaults(customConfig: Partial<AuditConfig>): AuditConfig {
    const defaultConfig = this.getDefaultConfig();
    
    return {
      validation: {
        ...defaultConfig.validation,
        ...customConfig.validation,
        components: {
          ...defaultConfig.validation.components,
          ...customConfig.validation?.components
        },
        apis: {
          ...defaultConfig.validation.apis,
          ...customConfig.validation?.apis
        },
        flows: {
          ...defaultConfig.validation.flows,
          ...customConfig.validation?.flows
        },
        references: {
          ...defaultConfig.validation.references,
          ...customConfig.validation?.references
        }
      },
      scanning: {
        ...defaultConfig.scanning,
        ...customConfig.scanning
      },
      reporting: {
        ...defaultConfig.reporting,
        ...customConfig.reporting
      },
      performance: {
        ...defaultConfig.performance,
        ...customConfig.performance
      }
    };
  }

  public getConfig(): AuditConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<AuditConfig>): void {
    this.config = this.mergeWithDefaults({ ...this.config, ...updates });
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required properties
    if (!this.config.validation) {
      errors.push('Missing validation configuration');
    }

    if (!this.config.scanning) {
      errors.push('Missing scanning configuration');
    }

    if (!this.config.reporting) {
      errors.push('Missing reporting configuration');
    }

    // Validate specific values
    if (this.config.performance?.maxExecutionTime && this.config.performance.maxExecutionTime < 1000) {
      errors.push('maxExecutionTime must be at least 1000ms');
    }

    if (this.config.reporting?.format && !['console', 'json', 'markdown'].includes(this.config.reporting.format)) {
      errors.push('reporting.format must be one of: console, json, markdown');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}