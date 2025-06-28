import { ConfigManager } from './config.js';
import { SystemMapParser } from '../parsers/system-map-parser.js';
import { CodebaseScanner } from '../parsers/codebase-scanner.js';
import { ComponentValidator } from '../validators/component-validator.js';
import { ApiValidator } from '../validators/api-validator.js';
import { FlowValidator } from '../validators/flow-validator.js';
import { DependencyAnalyzer } from '../analyzers/dependency-analyzer.js';
import { ConsoleReporter } from '../reporters/console-reporter.js';
import { JsonReporter } from '../reporters/json-reporter.js';
import { MarkdownReporter } from '../reporters/markdown-reporter.js';
import type { 
  AuditResult, 
  ValidationIssue, 
  AuditMetrics, 
  SystemMap, 
  ParsedCodebase,
  AuditConfig,
  FlowValidationResult,
  CircularDependency,
  DependencyAnalysis,
  PerformanceMetrics,
  OptimizationSuggestion,
  CrossReferenceResult,
  IntegrationPoint,
  DetailedAuditReport
} from './types.js';

export class SystemMapAuditor {
  private config: AuditConfig;
  private configManager: ConfigManager;
  private systemMapParser: SystemMapParser;
  private codebaseScanner: CodebaseScanner;
  private componentValidator: ComponentValidator;
  private apiValidator: ApiValidator;
  private flowValidator: FlowValidator | null = null;
  private dependencyAnalyzer: DependencyAnalyzer | null = null;
  private consoleReporter: ConsoleReporter;
  private jsonReporter: JsonReporter;
  private markdownReporter: MarkdownReporter;

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
    this.markdownReporter = new MarkdownReporter();
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

  // Phase 2 Methods - Flow Validation

  /**
   * Initialize Phase 2 components when needed
   */
  private async initializePhase2Components(): Promise<void> {
    if (!this.flowValidator || !this.dependencyAnalyzer) {
      const { codebase } = await this.codebaseScanner.scanCodebase();
      
      if (!this.flowValidator) {
        this.flowValidator = new FlowValidator(codebase);
      }
      
      if (!this.dependencyAnalyzer) {
        this.dependencyAnalyzer = new DependencyAnalyzer(codebase);
      }
    }
  }

  /**
   * Validate user flows against actual implementation
   */
  async validateFlows(featureName?: string): Promise<FlowValidationResult[]> {
    await this.initializePhase2Components();
    const { maps } = await this.systemMapParser.parseAllSystemMaps();
    const results: FlowValidationResult[] = [];

    for (const [mapPath, systemMap] of maps) {
      if (featureName && !systemMap.name?.includes(featureName) && !mapPath.includes(featureName)) {
        continue;
      }

      if (systemMap.flows && this.flowValidator) {
        const flowResults = this.flowValidator.validateFlowSteps(systemMap);
        results.push(...flowResults);
      }
    }

    return results;
  }

  /**
   * Validate cross-feature component references
   */
  async validateCrossReferences(sharedOnly: boolean = false): Promise<CrossReferenceResult[]> {
    await this.initializePhase2Components();
    const { maps } = await this.systemMapParser.parseAllSystemMaps();
    const systemMaps = Array.from(maps.values());

    if (!this.flowValidator) {
      return [];
    }

    const results = this.flowValidator.validateCrossFeatureReferences(systemMaps);
    
    if (sharedOnly) {
      return results.filter(result => result.usageCount > 1);
    }

    return results;
  }

  /**
   * Validate integration points
   */
  async validateIntegrationPoints(verifyConnections: boolean = false): Promise<IntegrationPoint[]> {
    await this.initializePhase2Components();
    const { maps } = await this.systemMapParser.parseAllSystemMaps();
    const systemMaps = Array.from(maps.values());

    if (!this.flowValidator) {
      return [];
    }

    return this.flowValidator.validateIntegrationPoints(systemMaps);
  }

  // Phase 2 Methods - Dependency Analysis

  /**
   * Detect circular dependencies
   */
  async detectCircularDependencies(): Promise<CircularDependency[]> {
    await this.initializePhase2Components();
    
    if (!this.dependencyAnalyzer) {
      return [];
    }

    return this.dependencyAnalyzer.detectCircularDependencies();
  }

  /**
   * Analyze dependency depth
   */
  async analyzeDependencyDepth(component?: string, maxDepth: number = 5): Promise<DependencyAnalysis[]> {
    await this.initializePhase2Components();
    
    if (!this.dependencyAnalyzer) {
      return [];
    }

    if (component) {
      const analysis = this.dependencyAnalyzer.analyzeDependencyDepth(component);
      return [analysis];
    }

    // Analyze all components
    const { codebase } = await this.codebaseScanner.scanCodebase();
    const results: DependencyAnalysis[] = [];

    for (const [componentName] of codebase.components) {
      const analysis = this.dependencyAnalyzer.analyzeDependencyDepth(componentName);
      if (analysis.depth > maxDepth) {
        results.push(analysis);
      }
    }

    return results;
  }

  /**
   * Analyze performance impact
   */
  async analyzePerformance(): Promise<PerformanceMetrics> {
    await this.initializePhase2Components();
    
    if (!this.dependencyAnalyzer) {
      // Return empty metrics if analyzer not available
      return {
        bundleSize: {
          totalSize: 0,
          componentSizes: new Map(),
          largestComponents: [],
          unusedCode: 0
        },
        loadingMetrics: {
          criticalPath: [],
          loadingTime: 0,
          lazyLoadableComponents: [],
          preloadCandidates: []
        },
        complexityMetrics: {
          cognitiveComplexity: 0,
          cyclomaticComplexity: 0,
          maintainabilityIndex: 100,
          technicalDebt: 0
        }
      };
    }

    return this.dependencyAnalyzer.analyzePerformanceImpact();
  }

  /**
   * Analyze critical dependency paths
   */
  async analyzeCriticalPaths(maxLength: number = 10): Promise<string[][]> {
    await this.initializePhase2Components();
    
    if (!this.dependencyAnalyzer) {
      return [];
    }

    const performance = this.dependencyAnalyzer.analyzePerformanceImpact();
    const criticalPath = performance.loadingMetrics.criticalPath;
    
    // Return paths that exceed the max length
    const longPaths: string[][] = [];
    if (criticalPath.length > maxLength) {
      longPaths.push(criticalPath);
    }

    return longPaths;
  }

  /**
   * Generate detailed audit report
   */
  async generateDetailedReport(options: {
    includePerformance?: boolean;
    includeRecommendations?: boolean;
  } = {}): Promise<DetailedAuditReport> {
    const results = await this.runFullAudit();
    const performanceAnalysis = options.includePerformance ? await this.analyzePerformance() : undefined;
    
    let recommendations: OptimizationSuggestion[] = [];
    if (options.includeRecommendations && this.dependencyAnalyzer) {
      recommendations = this.dependencyAnalyzer.suggestDependencyOptimizations();
    }

    // Calculate summary
    const summary = {
      totalFeatures: results.length,
      passedFeatures: results.filter(r => r.status === 'pass').length,
      failedFeatures: results.filter(r => r.status === 'fail').length,
      warningFeatures: results.filter(r => r.status === 'warning').length,
      totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
      criticalIssues: results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0),
      overallScore: this.calculateOverallScore(results)
    };

    return {
      summary,
      featureResults: results.map(r => ({
        featureName: r.feature,
        status: r.status,
        componentValidation: { 
          passed: r.status !== 'fail', 
          issues: r.issues.filter(i => i.type === 'missing-component'),
          metrics: {
            checksPerformed: r.metrics.totalChecks,
            executionTime: r.metrics.executionTime
          }
        },
        apiValidation: { 
          passed: r.status !== 'fail', 
          issues: r.issues.filter(i => i.type === 'api-mismatch'),
          metrics: {
            checksPerformed: r.metrics.totalChecks,
            executionTime: r.metrics.executionTime
          }
        },
        flowValidation: [],
        crossReferenceValidation: [],
        performanceMetrics: performanceAnalysis || {
          bundleSize: {
            totalSize: 0,
            componentSizes: new Map(),
            largestComponents: [],
            unusedCode: 0
          },
          loadingMetrics: {
            criticalPath: [],
            loadingTime: 0,
            lazyLoadableComponents: [],
            preloadCandidates: []
          },
          complexityMetrics: {
            cognitiveComplexity: 0,
            cyclomaticComplexity: 0,
            maintainabilityIndex: 100,
            technicalDebt: 0
          }
        },
        issues: r.issues
      })),
      globalIssues: [],
      performanceAnalysis: performanceAnalysis || {
        bundleSize: {
          totalSize: 0,
          componentSizes: new Map(),
          largestComponents: [],
          unusedCode: 0
        },
        loadingMetrics: {
          criticalPath: [],
          loadingTime: 0,
          lazyLoadableComponents: [],
          preloadCandidates: []
        },
        complexityMetrics: {
          cognitiveComplexity: 0,
          cyclomaticComplexity: 0,
          maintainabilityIndex: 100,
          technicalDebt: 0
        }
      },
      recommendations,
      metadata: {
        generatedAt: new Date().toISOString(),
        auditorVersion: this.getVersion(),
        projectPath: process.cwd(),
        configurationUsed: this.config,
        executionTime: 0
      }
    };
  }

  // Phase 2 Reporting Methods

  /**
   * Generate flow validation report
   */
  generateFlowValidationReport(results: FlowValidationResult[]): string {
    return this.consoleReporter.renderFlowValidation(results);
  }

  /**
   * Generate cross-reference report
   */
  generateCrossReferenceReport(results: CrossReferenceResult[]): string {
    const lines: string[] = [];
    lines.push('Cross-Reference Validation Results:');
    lines.push('');
    
    for (const result of results) {
      lines.push(`Component: ${result.component}`);
      lines.push(`  Usage Count: ${result.usageCount}`);
      lines.push(`  Features: ${result.features.join(', ')}`);
      lines.push(`  Pattern: ${result.sharedUsagePattern}`);
      if (result.inconsistencies.length > 0) {
        lines.push(`  Issues: ${result.inconsistencies.length}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate integration point report
   */
  generateIntegrationPointReport(results: IntegrationPoint[]): string {
    const lines: string[] = [];
    lines.push('Integration Point Validation Results:');
    lines.push('');
    
    for (const result of results) {
      lines.push(`Integration Point: ${result.name}`);
      lines.push(`  Type: ${result.type}`);
      lines.push(`  Verified: ${result.verified ? 'Yes' : 'No'}`);
      if (result.issues.length > 0) {
        lines.push(`  Issues: ${result.issues.length}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate circular dependency report
   */
  generateCircularDependencyReport(circularDeps: CircularDependency[]): string {
    return this.consoleReporter.renderCircularDependencies(circularDeps);
  }

  /**
   * Generate circular dependency markdown
   */
  generateCircularDependencyMarkdown(circularDeps: CircularDependency[]): string {
    return this.markdownReporter.generateCircularDependencyDiagram(circularDeps);
  }

  /**
   * Generate dependency depth report
   */
  generateDependencyDepthReport(analysis: DependencyAnalysis[]): string {
    const lines: string[] = [];
    lines.push('Dependency Depth Analysis:');
    lines.push('');
    
    for (const result of analysis) {
      lines.push(`Component: ${result.component}`);
      lines.push(`  Depth: ${result.depth}`);
      lines.push(`  Dependencies: ${result.dependencies.length}`);
      lines.push(`  Circular Paths: ${result.circularPaths.length}`);
      lines.push(`  Complexity Score: ${result.metrics.complexityScore}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(metrics: PerformanceMetrics): string {
    return this.consoleReporter.renderPerformanceMetrics(metrics);
  }

  /**
   * Generate critical paths report
   */
  generateCriticalPathsReport(paths: string[][]): string {
    const lines: string[] = [];
    lines.push('Critical Dependency Paths:');
    lines.push('');
    
    for (let i = 0; i < paths.length; i++) {
      lines.push(`Path ${i + 1} (${paths[i].length} steps):`);
      lines.push(`  ${paths[i].join(' → ')}`);
      lines.push('');
    }
    
    if (paths.length === 0) {
      lines.push('No critical paths found.');
    }
    
    return lines.join('\n');
  }

  /**
   * Generate detailed markdown report
   */
  generateDetailedMarkdownReport(report: DetailedAuditReport): string {
    return this.markdownReporter.generateDetailedReport(report);
  }

  // Helper methods

  private calculateOverallScore(results: AuditResult[]): number {
    if (results.length === 0) return 100;
    
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const errorCount = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'error').length, 0);
    const warningCount = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0);
    
    // Simple scoring: start at 100, subtract points for issues
    let score = 100;
    score -= errorCount * 10; // 10 points per error
    score -= warningCount * 5; // 5 points per warning
    score -= (totalIssues - errorCount - warningCount) * 1; // 1 point per info issue
    
    return Math.max(0, score);
  }
}