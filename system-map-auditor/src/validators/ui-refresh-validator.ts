import { readFileSync } from 'fs';
import { PathResolver } from '../utils/path-resolver.js';
import { FileUtils } from '../utils/file-utils.js';
import type { 
  ValidationResult, 
  ValidationIssue, 
  ParsedCodebase,
  UiRefreshDependency,
  RefreshTrigger,
  ComponentDef
} from '../core/types.js';

export class UiRefreshValidator {
  private pathResolver: PathResolver;

  constructor(projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
  }

  /**
   * Validate UI refresh chains across components
   */
  async validateUiRefreshChains(codebase: ParsedCodebase): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();
    let checksPerformed = 0;

    // Find all components that use data queries
    const dataComponents = this.findDataDependentComponents(codebase);
    
    for (const [filePath, componentInfo] of dataComponents) {
      checksPerformed++;
      
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const refreshDependency = this.analyzeUiRefreshDependency(filePath, fileContent);
        const refreshIssues = this.validateRefreshDependency(refreshDependency);
        issues.push(...refreshIssues);
      } catch (error) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'error',
          message: `Failed to analyze UI refresh patterns in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: filePath,
          suggestion: 'Verify file accessibility and syntax'
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Validate component data synchronization
   */
  async validateComponentDataSync(codebase: ParsedCodebase): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();
    let checksPerformed = 0;

    // Build dependency graph of data flow
    const dataFlowGraph = this.buildDataFlowGraph(codebase);
    
    for (const [component, dependencies] of dataFlowGraph) {
      checksPerformed++;
      
      const syncIssues = this.validateDataSynchronization(component, dependencies, codebase);
      issues.push(...syncIssues);
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Validate UI consistency after data changes
   */
  async validateUiConsistency(codebase: ParsedCodebase): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();
    let checksPerformed = 0;

    // Find components that modify data
    const dataModifiers = this.findDataModifyingComponents(codebase);
    
    for (const [filePath, componentInfo] of dataModifiers) {
      checksPerformed++;
      
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const consistencyIssues = this.validateComponentConsistency(filePath, fileContent, codebase);
        issues.push(...consistencyIssues);
      } catch (error) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'error',
          message: `Failed to validate UI consistency in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: filePath
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Find components that depend on data queries
   */
  private findDataDependentComponents(codebase: ParsedCodebase): Map<string, any> {
    const dataComponents = new Map();
    
    for (const [filePath, componentInfo] of codebase.components) {
      if (this.hasDataDependencies(filePath)) {
        dataComponents.set(filePath, componentInfo);
      }
    }
    
    return dataComponents;
  }

  /**
   * Find components that modify data (have mutations)
   */
  private findDataModifyingComponents(codebase: ParsedCodebase): Map<string, any> {
    const modifyingComponents = new Map();
    
    for (const [filePath, componentInfo] of codebase.components) {
      if (this.modifiesData(filePath)) {
        modifyingComponents.set(filePath, componentInfo);
      }
    }
    
    return modifyingComponents;
  }

  /**
   * Check if component has data dependencies
   */
  private hasDataDependencies(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return content.includes('useQuery') || 
             content.includes('useSWR') || 
             content.includes('useEffect') ||
             content.includes('useState');
    } catch {
      return false;
    }
  }

  /**
   * Check if component modifies data
   */
  private modifiesData(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return content.includes('useMutation') || 
             content.includes('apiRequest') ||
             content.includes('POST') ||
             content.includes('PUT') ||
             content.includes('DELETE') ||
             content.includes('PATCH');
    } catch {
      return false;
    }
  }

  /**
   * Analyze UI refresh dependency for a component
   */
  private analyzeUiRefreshDependency(filePath: string, content: string): UiRefreshDependency {
    const dependsOnQueries: string[] = [];
    const refreshTriggers: RefreshTrigger[] = [];
    
    const lines = content.split('\n');
    let hasLoadingStates = false;
    let hasErrorStates = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Find query dependencies
      const queryMatch = line.match(/useQuery\s*\(\s*{[^}]*queryKey:\s*\[['"`]([^'"`]+)['"`]/);
      if (queryMatch) {
        dependsOnQueries.push(queryMatch[1]);
      }

      // Check for loading states
      if (line.includes('isLoading') || line.includes('isPending') || line.includes('loading')) {
        hasLoadingStates = true;
      }

      // Check for error states
      if (line.includes('isError') || line.includes('error') && !line.includes('console.error')) {
        hasErrorStates = true;
      }

      // Find refresh triggers
      if (line.includes('refetch') || line.includes('invalidateQueries')) {
        const triggerType = line.includes('invalidateQueries') ? 'automatic' : 'manual';
        refreshTriggers.push({
          type: triggerType as 'automatic' | 'manual' | 'conditional',
          trigger: line.trim(),
          validated: this.validateRefreshTrigger(lines, i)
        });
      }

      // Check for conditional refresh triggers
      if (line.includes('enabled:') || line.includes('staleTime:')) {
        refreshTriggers.push({
          type: 'conditional',
          trigger: line.trim(),
          conditions: this.extractConditions(line),
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
      component: this.extractComponentName(filePath),
      dependsOnQueries,
      refreshTriggers,
      hasLoadingStates,
      hasErrorStates,
      refreshCompleteness
    };
  }

  /**
   * Validate refresh dependency and return issues
   */
  private validateRefreshDependency(dependency: UiRefreshDependency): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if component has queries but no loading states
    if (dependency.dependsOnQueries.length > 0 && !dependency.hasLoadingStates) {
      issues.push({
        type: 'ui-refresh-missing',
        severity: 'warning',
        message: `Component ${dependency.component} uses queries but lacks loading states`,
        location: dependency.component,
        suggestion: 'Add loading states using query.isLoading or similar patterns'
      });
    }

    // Check if component has queries but no error states
    if (dependency.dependsOnQueries.length > 0 && !dependency.hasErrorStates) {
      issues.push({
        type: 'ui-refresh-missing',
        severity: 'warning',
        message: `Component ${dependency.component} uses queries but lacks error states`,
        location: dependency.component,
        suggestion: 'Add error handling using query.isError or similar patterns'
      });
    }

    // Check refresh completeness score
    if (dependency.refreshCompleteness < 0.7) {
      issues.push({
        type: 'ui-refresh-missing',
        severity: 'warning',
        message: `Component ${dependency.component} has incomplete UI refresh patterns (${Math.round(dependency.refreshCompleteness * 100)}%)`,
        location: dependency.component,
        suggestion: 'Ensure all data dependencies trigger proper UI updates'
      });
    }

    // Validate individual refresh triggers
    for (const trigger of dependency.refreshTriggers) {
      if (!trigger.validated) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'info',
          message: `Unvalidated refresh trigger "${trigger.trigger}" in ${dependency.component}`,
          location: dependency.component,
          suggestion: 'Verify this refresh trigger works correctly'
        });
      }
    }

    return issues;
  }

  /**
   * Build data flow graph
   */
  private buildDataFlowGraph(codebase: ParsedCodebase): Map<string, string[]> {
    const dataFlowGraph = new Map<string, string[]>();
    
    for (const [filePath, componentInfo] of codebase.components) {
      if (this.hasDataDependencies(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const dependencies = this.extractDataDependencies(content);
          const componentName = this.extractComponentName(filePath);
          dataFlowGraph.set(componentName, dependencies);
        } catch {
          // Skip files that can't be read
        }
      }
    }
    
    return dataFlowGraph;
  }

  /**
   * Validate data synchronization for a component
   */
  private validateDataSynchronization(
    component: string, 
    dependencies: string[], 
    codebase: ParsedCodebase
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if dependencies are properly synchronized
    for (const dependency of dependencies) {
      if (!this.isDependencySynchronized(component, dependency, codebase)) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'warning',
          message: `Data dependency "${dependency}" in ${component} may not be properly synchronized`,
          location: component,
          suggestion: 'Ensure this dependency triggers UI updates when data changes'
        });
      }
    }

    return issues;
  }

  /**
   * Validate component consistency
   */
  private validateComponentConsistency(
    filePath: string, 
    content: string, 
    codebase: ParsedCodebase
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const componentName = this.extractComponentName(filePath);

    // Check if mutations properly update related components
    const mutations = this.extractMutations(content);
    
    for (const mutation of mutations) {
      if (!this.hasProperConsistencyHandling(content, mutation)) {
        issues.push({
          type: 'ui-refresh-missing',
          severity: 'warning',
          message: `Mutation "${mutation}" in ${componentName} may not properly update UI consistency`,
          location: filePath,
          suggestion: 'Add cache invalidation or optimistic updates for this mutation'
        });
      }
    }

    return issues;
  }

  /**
   * Helper methods
   */
  private validateRefreshTrigger(lines: string[], triggerLine: number): boolean {
    // Look for proper callback context (onSuccess, onSettled, etc.)
    for (let i = Math.max(0, triggerLine - 5); i < Math.min(triggerLine + 5, lines.length); i++) {
      if (lines[i].includes('onSuccess') || lines[i].includes('onSettled') || lines[i].includes('then')) {
        return true;
      }
    }
    return false;
  }

  private extractConditions(line: string): string[] {
    const conditions: string[] = [];
    
    // Extract enabled conditions
    const enabledMatch = line.match(/enabled:\s*([^,}]+)/);
    if (enabledMatch) {
      conditions.push(`enabled: ${enabledMatch[1].trim()}`);
    }

    // Extract staleTime conditions
    const staleTimeMatch = line.match(/staleTime:\s*([^,}]+)/);
    if (staleTimeMatch) {
      conditions.push(`staleTime: ${staleTimeMatch[1].trim()}`);
    }

    return conditions;
  }

  private calculateRefreshCompleteness(
    queryCount: number,
    hasLoadingStates: boolean,
    hasErrorStates: boolean,
    refreshTriggerCount: number
  ): number {
    if (queryCount === 0) return 1.0;
    
    let score = 0.4; // Base score for having queries
    
    if (hasLoadingStates) score += 0.25;
    if (hasErrorStates) score += 0.25;
    if (refreshTriggerCount > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  private extractComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }

  private extractDataDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Extract query keys
    const queryKeyRegex = /queryKey:\s*\[['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = queryKeyRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    // Extract API endpoints
    const apiRegex = /apiRequest\(['"`]([^'"`]+)['"`]/g;
    while ((match = apiRegex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies;
  }

  private isDependencySynchronized(
    component: string, 
    dependency: string, 
    codebase: ParsedCodebase
  ): boolean {
    // Simple heuristic: check if there are invalidation patterns for this dependency
    for (const [filePath, componentInfo] of codebase.components) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes(`invalidateQueries(['"${dependency}]`) || 
            content.includes(`refetch`) && content.includes(dependency)) {
          return true;
        }
      } catch {
        // Skip files that can't be read
      }
    }
    return false;
  }

  private extractMutations(content: string): string[] {
    const mutations: string[] = [];
    const mutationRegex = /mutationFn:\s*.*?apiRequest\(['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = mutationRegex.exec(content)) !== null) {
      mutations.push(match[1]);
    }

    return mutations;
  }

  private hasProperConsistencyHandling(content: string, mutation: string): boolean {
    // Check if mutation has onSuccess with invalidation or optimistic updates
    const mutationIndex = content.indexOf(mutation);
    if (mutationIndex === -1) return false;

    const afterMutation = content.substring(mutationIndex);
    const hasOnSuccess = afterMutation.includes('onSuccess');
    const hasInvalidation = afterMutation.includes('invalidateQueries');
    const hasOptimisticUpdate = afterMutation.includes('setQueryData');

    return hasOnSuccess && (hasInvalidation || hasOptimisticUpdate);
  }
}