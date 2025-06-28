import { ConfigManager } from './config.js';
import { SystemMapParser } from '../parsers/system-map-parser.js';
import { CodebaseScanner } from '../parsers/codebase-scanner.js';
import { ComponentValidator } from '../validators/component-validator.js';
import { ApiValidator } from '../validators/api-validator.js';
import { ConsoleReporter } from '../reporters/console-reporter.js';
import { JsonReporter } from '../reporters/json-reporter.js';
import type { 
  AuditResult, 
  ValidationIssue, 
  AuditMetrics, 
  SystemMap, 
  ParsedCodebase,
  AuditConfig 
} from './types.js';

export class SystemMapAuditor {
  private config: AuditConfig;
  private configManager: ConfigManager;
  private systemMapParser: SystemMapParser;
  private codebaseScanner: CodebaseScanner;
  private componentValidator: ComponentValidator;
  private apiValidator: ApiValidator;
  private consoleReporter: ConsoleReporter;
  private jsonReporter: JsonReporter;

  constructor(customConfigPath?: string, projectRoot?: string) {
    this.configManager = new ConfigManager(customConfigPath);
    this.config = this.configManager.getConfig();
    
    // Initialize parsers and validators
    this.systemMapParser = new SystemMapParser(projectRoot);
    this.codebaseScanner = new CodebaseScanner(this.config, projectRoot);
    this.componentValidator = new ComponentValidator(projectRoot);
    this.apiValidator = new ApiValidator(projectRoot);
    
    // Initialize reporters
    this.consoleReporter = new ConsoleReporter(
      this.config.reporting.verbose,
      this.config.reporting.showSuggestions
    );
    this.jsonReporter = new JsonReporter();
  }

  /**
   * Run full audit of all system maps
   */
  async runFullAudit(): Promise<AuditResult[]> {
    const startTime = Date.now();
    const results: AuditResult[] = [];

    try {
      // Parse all system maps
      const { maps, issues: parseIssues } = await this.systemMapParser.parseAllSystemMaps();
      
      // Scan codebase
      const { codebase, issues: scanIssues } = await this.codebaseScanner.scanCodebase();

      // If no maps found, create a single result with parse issues
      if (maps.size === 0) {
        results.push({
          feature: 'system-maps',
          status: 'fail',
          issues: parseIssues,
          metrics: {
            totalChecks: 1,
            passedChecks: 0,
            warningChecks: parseIssues.filter(i => i.severity === 'warning').length,
            failedChecks: parseIssues.filter(i => i.severity === 'error').length,
            executionTime: Date.now() - startTime
          }
        });
        return results;
      }

      // Audit each system map
      for (const [mapPath, systemMap] of maps) {
        const result = await this.auditSystemMap(systemMap, codebase, mapPath);
        
        // Add any parsing issues specific to this map
        const mapParseIssues = parseIssues.filter(issue => issue.location.includes(mapPath));
        result.issues.unshift(...mapParseIssues);
        
        // Add scanning issues if this is the first result
        if (results.length === 0) {
          result.issues.unshift(...scanIssues);
        }

        results.push(result);
      }

    } catch (error) {
      // Create error result if audit fails completely
      results.push({
        feature: 'audit-error',
        status: 'fail',
        issues: [{
          type: 'invalid-reference',
          severity: 'error',
          message: `Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: 'auditor',
          suggestion: 'Check project structure and configuration'
        }],
        metrics: {
          totalChecks: 1,
          passedChecks: 0,
          warningChecks: 0,
          failedChecks: 1,
          executionTime: Date.now() - startTime
        }
      });
    }

    return results;
  }

  /**
   * Audit a single system map
   */
  async auditSystemMap(
    systemMap: SystemMap, 
    codebase: ParsedCodebase, 
    mapPath: string
  ): Promise<AuditResult> {
    const startTime = Date.now();
    const allIssues: ValidationIssue[] = [];
    let totalChecks = 0;
    let passedChecks = 0;
    let warningChecks = 0;
    let failedChecks = 0;

    // Normalize system map components and APIs for validation
    const normalizedComponents = this.normalizeComponents(systemMap);
    const normalizedApis = this.normalizeApis(systemMap);

    // Validate components
    if (normalizedComponents.length > 0 && this.config.validation.components) {
      const componentResult = await this.componentValidator.validateAllComponents(
        normalizedComponents,
        codebase,
        this.config.validation.components
      );
      
      allIssues.push(...componentResult.issues);
      totalChecks += componentResult.metrics.checksPerformed;
      
      // Count check results
      for (const issue of componentResult.issues) {
        if (issue.severity === 'error') {
          failedChecks++;
        } else if (issue.severity === 'warning') {
          warningChecks++;
        }
      }
    }

    // Validate APIs
    if (normalizedApis.length > 0 && this.config.validation.apis) {
      const apiResult = await this.apiValidator.validateAllApis(
        normalizedApis,
        codebase,
        this.config.validation.apis
      );
      
      allIssues.push(...apiResult.issues);
      totalChecks += apiResult.metrics.checksPerformed;
      
      // Count check results
      for (const issue of apiResult.issues) {
        if (issue.severity === 'error') {
          failedChecks++;
        } else if (issue.severity === 'warning') {
          warningChecks++;
        }
      }
    }

    // Calculate passed checks
    passedChecks = totalChecks - failedChecks - warningChecks;

    // Determine overall status
    let status: 'pass' | 'fail' | 'warning' = 'pass';
    if (failedChecks > 0) {
      status = 'fail';
    } else if (warningChecks > 0) {
      status = 'warning';
    }

    const metrics: AuditMetrics = {
      totalChecks,
      passedChecks,
      warningChecks,
      failedChecks,
      executionTime: Date.now() - startTime
    };

    return {
      feature: systemMap.name || mapPath,
      status,
      issues: allIssues,
      metrics
    };
  }

  /**
   * Audit specific feature by name
   */
  async auditFeature(featureName: string): Promise<AuditResult | null> {
    const { maps } = await this.systemMapParser.parseAllSystemMaps();
    const { codebase } = await this.codebaseScanner.scanCodebase();

    // Find the system map for this feature
    for (const [mapPath, systemMap] of maps) {
      if (systemMap.name === featureName || mapPath.includes(featureName)) {
        return await this.auditSystemMap(systemMap, codebase, mapPath);
      }
    }

    return null;
  }

  /**
   * Parse system maps only (without full validation)
   */
  async parseOnly(): Promise<{ success: boolean; issues: ValidationIssue[] }> {
    try {
      const { maps, issues } = await this.systemMapParser.parseAllSystemMaps();
      
      return {
        success: issues.filter(i => i.severity === 'error').length === 0,
        issues
      };
    } catch (error) {
      return {
        success: false,
        issues: [{
          type: 'invalid-reference',
          severity: 'error',
          message: `Parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: 'parser',
          suggestion: 'Check system map file format and syntax'
        }]
      };
    }
  }

  /**
   * Generate console report
   */
  generateConsoleReport(results: AuditResult[]): string {
    return this.consoleReporter.generateReport(results);
  }

  /**
   * Generate JSON report
   */
  generateJsonReport(results: AuditResult[], pretty: boolean = true): string {
    return this.jsonReporter.generateReportString(results, pretty);
  }

  /**
   * Get configuration
   */
  getConfig(): AuditConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AuditConfig>): void {
    this.configManager.updateConfig(updates);
    this.config = this.configManager.getConfig();
    
    // Update reporter settings
    this.consoleReporter.setOptions(
      this.config.reporting.verbose,
      this.config.reporting.showSuggestions
    );
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    return this.configManager.validate();
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.systemMapParser.clearCache();
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(results: AuditResult[]): object {
    return this.jsonReporter.generateSummary(results);
  }

  /**
   * Check if audit should fail (for CI/CD integration)
   */
  shouldFailCi(results: AuditResult[]): boolean {
    for (const result of results) {
      for (const issue of result.issues) {
        if (issue.severity === 'error') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Generate CI/CD friendly report
   */
  generateCiReport(results: AuditResult[]): object {
    return this.jsonReporter.generateCiReport(results);
  }

  /**
   * Show configuration
   */
  showConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Get version info
   */
  getVersion(): string {
    return '1.0.0';
  }

  /**
   * Normalize components from different system map formats
   */
  private normalizeComponents(systemMap: SystemMap): any[] {
    const components: any[] = [];

    // Handle legacy array format
    if (systemMap.components && Array.isArray(systemMap.components)) {
      components.push(...systemMap.components);
    }

    // Handle object format (feature-based maps)
    if (systemMap.components && typeof systemMap.components === 'object' && !Array.isArray(systemMap.components)) {
      Object.entries(systemMap.components).forEach(([name, component]: [string, any]) => {
        components.push({
          name,
          path: component.path,
          description: component.description,
          uses: component.uses || []
        });
      });
    }

    // Handle featureGroups format
    const mapAny = systemMap as any;
    if (mapAny.featureGroups) {
      Object.values(mapAny.featureGroups).forEach((group: any) => {
        if (group.features) {
          Object.values(group.features).forEach((feature: any) => {
            if (feature.components && Array.isArray(feature.components)) {
              components.push(...feature.components);
            }
          });
        }
      });
    }

    // Handle globalComponents format
    if (mapAny.globalComponents) {
      Object.entries(mapAny.globalComponents).forEach(([name, component]: [string, any]) => {
        components.push({
          name,
          path: component.path,
          description: component.description,
          uses: component.uses || []
        });
      });
    }

    return components;
  }

  /**
   * Normalize APIs from different system map formats
   */
  private normalizeApis(systemMap: SystemMap): any[] {
    const apis: any[] = [];

    // Handle legacy array format
    if (systemMap.apis && Array.isArray(systemMap.apis)) {
      apis.push(...systemMap.apis);
    }

    // Handle apiEndpoints object format
    const mapAny = systemMap as any;
    if (mapAny.apiEndpoints) {
      Object.entries(mapAny.apiEndpoints).forEach(([path, api]: [string, any]) => {
        apis.push({
          path,
          method: api.method,
          handler: api.handler || api.path,
          description: api.description,
          readsFrom: api.readsFrom || [],
          modifies: api.modifies || []
        });
      });
    }

    return apis;
  }

  /**
   * Find system maps in project
   */
  async scanForMaps(): Promise<string[]> {
    const { maps } = await this.systemMapParser.parseAllSystemMaps();
    return Array.from(maps.keys());
  }
}