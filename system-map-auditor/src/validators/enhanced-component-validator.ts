import { readFileSync } from 'fs';
import { PathResolver } from '../utils/path-resolver.js';
import { FileUtils } from '../utils/file-utils.js';
import type { 
  ComponentDef, 
  ValidationResult, 
  ValidationIssue, 
  ParsedCodebase,
  ApiCallTrace,
  ApiCallInfo,
  CacheInvalidationInfo,
  UiRefreshInfo,
  CacheInvalidationChain,
  UiRefreshDependency,
  IntegrationEvidence,
  FeatureIntegrationStatus,
  ComponentIntegrationStatus
} from '../core/types.js';

export class EnhancedComponentValidator {
  private pathResolver: PathResolver;

  constructor(projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
  }

  /**
   * Validate component-to-API call tracing
   */
  validateApiCallTracing(component: ComponentDef, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    
    if (!FileUtils.fileExists(resolvedPath)) {
      issues.push({
        type: 'missing-component',
        severity: 'error',
        message: `Component ${component.name} not found for API call tracing`,
        location: component.path,
        suggestion: 'Ensure component file exists'
      });
      return {
        passed: false,
        issues,
        metrics: { checksPerformed: 1, executionTime: Date.now() - startTime }
      };
    }

    try {
      const fileContent = readFileSync(resolvedPath, 'utf-8');
      const apiCallTrace = this.extractApiCallTrace(component, fileContent);
      
      // Validate API calls are properly documented
      if (apiCallTrace.apiCalls.length === 0) {
        issues.push({
          type: 'api-call-tracing',
          severity: 'warning',
          message: `Component ${component.name} has no documented API calls`,
          location: component.path,
          suggestion: 'Document API calls in system map or verify component actually makes API calls'
        });
      }

      // Check for mutations without proper cache invalidation
      for (const apiCall of apiCallTrace.apiCalls) {
        if (apiCall.isInMutation && !apiCall.hasCacheInvalidation) {
          issues.push({
            type: 'cache-invalidation-missing',
            severity: 'error',
            message: `API call ${apiCall.endpoint} in ${component.name} is in mutation but lacks cache invalidation`,
            location: `${component.path}:${apiCall.lineNumber}`,
            suggestion: 'Add queryClient.invalidateQueries() after successful mutation'
          });
        }

        if (!apiCall.hasErrorHandling) {
          issues.push({
            type: 'api-call-tracing',
            severity: 'warning',
            message: `API call ${apiCall.endpoint} in ${component.name} lacks error handling`,
            location: `${component.path}:${apiCall.lineNumber}`,
            suggestion: 'Add proper error handling for API calls'
          });
        }
      }

      // Validate cache invalidations have corresponding UI refresh
      for (const invalidation of apiCallTrace.cacheInvalidations) {
        const hasUiRefresh = apiCallTrace.uiRefreshPatterns.some(refresh => 
          refresh.triggerType === 'query-invalidation'
        );
        
        if (!hasUiRefresh) {
          issues.push({
            type: 'ui-refresh-missing',
            severity: 'warning',
            message: `Cache invalidation for ${invalidation.queryKey} in ${component.name} may not trigger UI refresh`,
            location: `${component.path}:${invalidation.lineNumber}`,
            suggestion: 'Ensure components using this query key will refresh automatically'
          });
        }
      }

    } catch (error) {
      issues.push({
        type: 'api-call-tracing',
        severity: 'error',
        message: `Failed to analyze API calls in ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: component.path,
        suggestion: 'Verify file syntax and accessibility'
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed: 3, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Validate cache invalidation chains
   */
  validateCacheInvalidationChains(component: ComponentDef, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    
    if (!FileUtils.fileExists(resolvedPath)) {
      issues.push({
        type: 'missing-component',
        severity: 'error',
        message: `Component ${component.name} not found for cache invalidation validation`,
        location: component.path
      });
      return {
        passed: false,
        issues,
        metrics: { checksPerformed: 1, executionTime: Date.now() - startTime }
      };
    }

    try {
      const fileContent = readFileSync(resolvedPath, 'utf-8');
      const invalidationChains = this.extractCacheInvalidationChains(component, fileContent);
      
      for (const chain of invalidationChains) {
        if (!chain.chainComplete) {
          issues.push({
            type: 'cache-invalidation-missing',
            severity: 'error',
            message: `Incomplete cache invalidation chain for ${chain.apiEndpoint} in ${component.name}`,
            location: component.path,
            suggestion: `Add invalidation for: ${chain.missingInvalidations.join(', ')}`,
            metadata: { 
              missingInvalidations: chain.missingInvalidations,
              affectedComponents: chain.affectedComponents 
            }
          });
        }

        // Check if related components will be updated
        if (chain.affectedComponents.length === 0) {
          issues.push({
            type: 'ui-refresh-missing',
            severity: 'warning',
            message: `Cache invalidation for ${chain.apiEndpoint} has no affected components`,
            location: component.path,
            suggestion: 'Verify that UI components depend on invalidated queries'
          });
        }
      }

    } catch (error) {
      issues.push({
        type: 'cache-invalidation-missing',
        severity: 'error',
        message: `Failed to validate cache invalidation chains in ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: component.path
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed: 2, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Validate UI refresh dependencies
   */
  validateUiRefreshDependencies(component: ComponentDef, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    
    if (!FileUtils.fileExists(resolvedPath)) {
      issues.push({
        type: 'missing-component',
        severity: 'error',
        message: `Component ${component.name} not found for UI refresh validation`,
        location: component.path
      });
      return {
        passed: false,
        issues,
        metrics: { checksPerformed: 1, executionTime: Date.now() - startTime }
      };
    }

    try {
      const fileContent = readFileSync(resolvedPath, 'utf-8');
      const refreshDependency = this.extractUiRefreshDependencies(component, fileContent);
      
      // Check if component has loading states for queries
      if (refreshDependency.dependsOnQueries.length > 0 && !refreshDependency.hasLoadingStates) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'warning',
          message: `Component ${component.name} uses queries but lacks loading states`,
          location: component.path,
          suggestion: 'Add loading states using query.isLoading or similar patterns'
        });
      }

      // Check if component has error states for queries
      if (refreshDependency.dependsOnQueries.length > 0 && !refreshDependency.hasErrorStates) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'warning',
          message: `Component ${component.name} uses queries but lacks error states`,
          location: component.path,
          suggestion: 'Add error handling using query.isError or similar patterns'
        });
      }

      // Check refresh completeness score
      if (refreshDependency.refreshCompleteness < 0.8) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'warning',
          message: `Component ${component.name} has incomplete UI refresh patterns (${Math.round(refreshDependency.refreshCompleteness * 100)}%)`,
          location: component.path,
          suggestion: 'Ensure all data dependencies trigger proper UI updates'
        });
      }

      // Validate refresh triggers
      for (const trigger of refreshDependency.refreshTriggers) {
        if (!trigger.validated) {
          issues.push({
            type: 'ui-refresh-missing',
            severity: 'info',
            message: `Unvalidated refresh trigger ${trigger.trigger} in ${component.name}`,
            location: component.path,
            suggestion: 'Verify this refresh trigger works correctly'
          });
        }
      }

    } catch (error) {
      issues.push({
        type: 'ui-refresh-missing',
        severity: 'error',
        message: `Failed to validate UI refresh dependencies in ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: component.path
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed: 4, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Validate integration evidence requirements
   */
  validateIntegrationEvidence(component: ComponentDef, evidence: IntegrationEvidence[]): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    const componentEvidence = evidence.filter(e => 
      e.requiredFor.includes(component.name) || 
      e.evidenceLocation.includes(component.path)
    );

    if (componentEvidence.length === 0) {
      issues.push({
        type: 'integration-evidence-missing',
        severity: 'warning',
        message: `Component ${component.name} has no integration evidence`,
        location: component.path,
        suggestion: 'Add integration tests or manual verification records'
      });
    }

    for (const ev of componentEvidence) {
      if (ev.verificationStatus === 'failed') {
        issues.push({
          type: 'integration-evidence-missing',
          severity: 'error',
          message: `Integration evidence failed for ${component.name}: ${ev.evidenceType}`,
          location: ev.evidenceLocation,
          suggestion: 'Fix integration issues or update evidence'
        });
      } else if (ev.verificationStatus === 'needs-verification') {
        issues.push({
          type: 'integration-evidence-missing',
          severity: 'warning',
          message: `Integration evidence needs verification for ${component.name}`,
          location: ev.evidenceLocation,
          suggestion: 'Run verification process for this evidence'
        });
      } else if (ev.verificationStatus === 'outdated') {
        issues.push({
          type: 'integration-evidence-missing',
          severity: 'info',
          message: `Integration evidence is outdated for ${component.name}`,
          location: ev.evidenceLocation,
          suggestion: 'Update evidence with recent verification'
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed: componentEvidence.length + 1, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Extract API call trace from component file
   */
  private extractApiCallTrace(component: ComponentDef, fileContent: string): ApiCallTrace {
    const apiCalls: ApiCallInfo[] = [];
    const cacheInvalidations: CacheInvalidationInfo[] = [];
    const uiRefreshPatterns: UiRefreshInfo[] = [];

    const lines = fileContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Look for API calls (mutations and queries)
      const mutationMatch = line.match(/useMutation\s*\(\s*{[\s\S]*?mutationFn:\s*.*?apiRequest\(['"`]([^'"`]+)['"`]/);
      const queryMatch = line.match(/useQuery\s*\(\s*{[\s\S]*?queryKey:\s*\[['"`]([^'"`]+)['"`]/);
      
      if (mutationMatch) {
        const endpoint = mutationMatch[1];
        const isInMutation = true;
        const hasErrorHandling = this.checkErrorHandling(lines, i);
        const hasCacheInvalidation = this.checkCacheInvalidation(lines, i);
        
        apiCalls.push({
          endpoint,
          method: this.extractMethod(line),
          lineNumber,
          functionName: 'useMutation',
          isInMutation,
          hasErrorHandling,
          hasCacheInvalidation
        });
      }

      // Look for cache invalidations
      const invalidationMatch = line.match(/queryClient\.invalidateQueries\s*\(\s*\[['"`]([^'"`]+)['"`]/);
      if (invalidationMatch) {
        cacheInvalidations.push({
          queryKey: invalidationMatch[1],
          invalidationType: 'specific',
          lineNumber,
          isImmediate: true
        });
      }

      // Look for UI refresh patterns
      if (line.includes('isLoading') || line.includes('isPending')) {
        uiRefreshPatterns.push({
          triggerType: 'query-invalidation',
          affectedComponents: [component.name],
          isAutomatic: true,
          hasLoadingState: true
        });
      }
    }

    return {
      componentName: component.name,
      componentPath: component.path,
      apiCalls,
      cacheInvalidations,
      uiRefreshPatterns
    };
  }

  /**
   * Extract cache invalidation chains from component file
   */
  private extractCacheInvalidationChains(component: ComponentDef, fileContent: string): CacheInvalidationChain[] {
    const chains: CacheInvalidationChain[] = [];
    const lines = fileContent.split('\n');

    // Look for mutation patterns that should trigger invalidations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const mutationMatch = line.match(/useMutation\s*\(\s*{[\s\S]*?mutationFn:\s*.*?apiRequest\(['"`]([^'"`]+)['"`]/);
      if (mutationMatch) {
        const apiEndpoint = mutationMatch[1];
        const expectedInvalidations = this.getExpectedInvalidations(apiEndpoint);
        const actualInvalidations = this.findActualInvalidations(lines, i);
        const missingInvalidations = expectedInvalidations.filter(exp => 
          !actualInvalidations.includes(exp)
        );

        chains.push({
          startingAction: 'mutation',
          apiEndpoint,
          expectedInvalidations,
          actualInvalidations,
          missingInvalidations,
          chainComplete: missingInvalidations.length === 0,
          affectedComponents: [component.name]
        });
      }
    }

    return chains;
  }

  /**
   * Extract UI refresh dependencies from component file
   */
  private extractUiRefreshDependencies(component: ComponentDef, fileContent: string): UiRefreshDependency {
    const dependsOnQueries: string[] = [];
    const refreshTriggers: any[] = [];
    
    const lines = fileContent.split('\n');
    let hasLoadingStates = false;
    let hasErrorStates = false;

    for (const line of lines) {
      // Find query dependencies
      const queryMatch = line.match(/useQuery\s*\(\s*{[\s\S]*?queryKey:\s*\[['"`]([^'"`]+)['"`]/);
      if (queryMatch) {
        dependsOnQueries.push(queryMatch[1]);
      }

      // Check for loading and error states
      if (line.includes('isLoading') || line.includes('isPending')) {
        hasLoadingStates = true;
      }
      if (line.includes('isError') || line.includes('error')) {
        hasErrorStates = true;
      }

      // Find refresh triggers
      if (line.includes('refetch') || line.includes('invalidateQueries')) {
        refreshTriggers.push({
          type: 'manual',
          trigger: line.trim(),
          validated: true
        });
      }
    }

    const refreshCompleteness = this.calculateRefreshCompleteness(
      dependsOnQueries.length,
      hasLoadingStates,
      hasErrorStates,
      refreshTriggers.length
    );

    return {
      component: component.name,
      dependsOnQueries,
      refreshTriggers,
      hasLoadingStates,
      hasErrorStates,
      refreshCompleteness
    };
  }

  /**
   * Helper methods
   */
  private checkErrorHandling(lines: string[], mutationLine: number): boolean {
    // Look in the next 10 lines for error handling
    for (let i = mutationLine; i < Math.min(mutationLine + 10, lines.length); i++) {
      if (lines[i].includes('onError') || lines[i].includes('catch') || lines[i].includes('error')) {
        return true;
      }
    }
    return false;
  }

  private checkCacheInvalidation(lines: string[], mutationLine: number): boolean {
    // Look in the next 15 lines for cache invalidation
    for (let i = mutationLine; i < Math.min(mutationLine + 15, lines.length); i++) {
      if (lines[i].includes('invalidateQueries') || lines[i].includes('refetch')) {
        return true;
      }
    }
    return false;
  }

  private extractMethod(line: string): string {
    if (line.includes('DELETE')) return 'DELETE';
    if (line.includes('PUT')) return 'PUT';
    if (line.includes('PATCH')) return 'PATCH';
    if (line.includes('POST')) return 'POST';
    return 'GET';
  }

  private getExpectedInvalidations(endpoint: string): string[] {
    // Based on endpoint patterns, return expected cache invalidations
    if (endpoint.includes('/api/health-data/')) {
      return ['/api/health-data', '/api/health-data/overview'];
    }
    if (endpoint.includes('/api/memories/')) {
      return ['/api/memories', '/api/memories/overview'];
    }
    if (endpoint.includes('/api/conversations/')) {
      return ['/api/conversations', '/api/messages'];
    }
    return [];
  }

  private findActualInvalidations(lines: string[], startLine: number): string[] {
    const invalidations: string[] = [];
    
    // Look in the next 20 lines for invalidations
    for (let i = startLine; i < Math.min(startLine + 20, lines.length); i++) {
      const invalidationMatch = lines[i].match(/invalidateQueries\s*\(\s*\[['"`]([^'"`]+)['"`]/);
      if (invalidationMatch) {
        invalidations.push(invalidationMatch[1]);
      }
    }
    
    return invalidations;
  }

  private calculateRefreshCompleteness(
    queryCount: number,
    hasLoadingStates: boolean,
    hasErrorStates: boolean,
    refreshTriggerCount: number
  ): number {
    if (queryCount === 0) return 1.0;
    
    let score = 0.5; // Base score for having queries
    
    if (hasLoadingStates) score += 0.2;
    if (hasErrorStates) score += 0.2;
    if (refreshTriggerCount > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }
}