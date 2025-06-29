import { readFileSync } from 'fs';
import { PathResolver } from '../utils/path-resolver.js';
import { FileUtils } from '../utils/file-utils.js';
import type { 
  ValidationResult, 
  ValidationIssue, 
  ParsedCodebase,
  CacheInvalidationChain,
  CacheConsistencyCheck,
  ComponentDef
} from '../core/types.js';

export class CacheValidationService {
  private pathResolver: PathResolver;

  constructor(projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
  }

  /**
   * Validate cache invalidation dependencies across components
   */
  async validateCacheDependencies(codebase: ParsedCodebase): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();
    let checksPerformed = 0;

    // Find all components that use React Query
    const queryComponents = this.findQueryComponents(codebase);
    
    for (const [filePath, componentInfo] of queryComponents) {
      checksPerformed++;
      
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const cacheIssues = this.validateComponentCacheDependencies(filePath, fileContent);
        issues.push(...cacheIssues);
      } catch (error) {
        issues.push({
          type: 'cache-invalidation-missing',
          severity: 'error',
          message: `Failed to analyze cache dependencies in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Validate cache invalidation chains for completeness
   */
  async validateCacheInvalidationChains(codebase: ParsedCodebase): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();
    let checksPerformed = 0;

    const mutationComponents = this.findMutationComponents(codebase);
    
    for (const [filePath, componentInfo] of mutationComponents) {
      checksPerformed++;
      
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const chains = this.extractInvalidationChains(filePath, fileContent);
        
        for (const chain of chains) {
          if (!chain.chainComplete) {
            issues.push({
              type: 'cache-invalidation-missing',
              severity: 'error',
              message: `Incomplete cache invalidation chain for ${chain.apiEndpoint} in ${filePath}`,
              location: filePath,
              suggestion: `Add invalidation for: ${chain.missingInvalidations.join(', ')}`,
              metadata: { 
                missingInvalidations: chain.missingInvalidations,
                affectedComponents: chain.affectedComponents 
              }
            });
          }

          // Validate that invalidations happen in onSuccess or onSettled
          if (!this.validateInvalidationTiming(fileContent, chain)) {
            issues.push({
              type: 'cache-invalidation-missing',
              severity: 'warning',
              message: `Cache invalidation for ${chain.apiEndpoint} may not be properly timed`,
              location: filePath,
              suggestion: 'Ensure invalidations occur in onSuccess or onSettled callbacks'
            });
          }
        }
      } catch (error) {
        issues.push({
          type: 'cache-invalidation-missing',
          severity: 'error',
          message: `Failed to validate invalidation chains in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Validate query key consistency across the codebase
   */
  async validateQueryKeyConsistency(codebase: ParsedCodebase): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    const queryKeyMap = new Map<string, string[]>();
    const invalidationMap = new Map<string, string[]>();

    // Collect all query keys and their usage locations
    for (const [filePath, componentInfo] of codebase.components) {
      if (this.usesReactQuery(filePath)) {
        try {
          const fileContent = readFileSync(filePath, 'utf-8');
          const queryKeys = this.extractQueryKeys(fileContent);
          const invalidations = this.extractInvalidationKeys(fileContent);

          for (const key of queryKeys) {
            if (!queryKeyMap.has(key)) {
              queryKeyMap.set(key, []);
            }
            queryKeyMap.get(key)!.push(filePath);
          }

          for (const key of invalidations) {
            if (!invalidationMap.has(key)) {
              invalidationMap.set(key, []);
            }
            invalidationMap.get(key)!.push(filePath);
          }
        } catch (error) {
          issues.push({
            type: 'cache-invalidation-missing',
            severity: 'warning',
            message: `Failed to analyze query keys in ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            location: filePath
          });
        }
      }
    }

    // Validate consistency
    for (const [queryKey, queryLocations] of queryKeyMap) {
      const invalidationLocations = invalidationMap.get(queryKey) || [];
      
      if (queryLocations.length > 1 && invalidationLocations.length === 0) {
        issues.push({
          type: 'cache-invalidation-missing',
          severity: 'warning',
          message: `Query key "${queryKey}" is used in multiple components but never invalidated`,
          location: queryLocations.join(', '),
          suggestion: 'Add cache invalidation for this query key when data changes'
        });
      }

      // Check for orphaned invalidations
      if (invalidationLocations.length > 0 && queryLocations.length === 0) {
        issues.push({
          type: 'cache-invalidation-missing',
          severity: 'info',
          message: `Query key "${queryKey}" is invalidated but not used in any queries`,
          location: invalidationLocations.join(', '),
          suggestion: 'Remove unused invalidation or add corresponding query'
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed: queryKeyMap.size + invalidationMap.size, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Find components that use React Query
   */
  private findQueryComponents(codebase: ParsedCodebase): Map<string, any> {
    const queryComponents = new Map();
    
    for (const [filePath, componentInfo] of codebase.components) {
      if (this.usesReactQuery(filePath)) {
        queryComponents.set(filePath, componentInfo);
      }
    }
    
    return queryComponents;
  }

  /**
   * Find components that use mutations
   */
  private findMutationComponents(codebase: ParsedCodebase): Map<string, any> {
    const mutationComponents = new Map();
    
    for (const [filePath, componentInfo] of codebase.components) {
      if (this.usesMutations(filePath)) {
        mutationComponents.set(filePath, componentInfo);
      }
    }
    
    return mutationComponents;
  }

  /**
   * Check if a file uses React Query
   */
  private usesReactQuery(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return content.includes('useQuery') || content.includes('useMutation') || content.includes('queryClient');
    } catch {
      return false;
    }
  }

  /**
   * Check if a file uses mutations
   */
  private usesMutations(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return content.includes('useMutation');
    } catch {
      return false;
    }
  }

  /**
   * Validate cache dependencies for a single component
   */
  private validateComponentCacheDependencies(filePath: string, content: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for queries without proper dependency arrays
      const queryMatch = line.match(/useQuery\s*\(\s*{[^}]*queryKey:\s*\[([^\]]+)\]/);
      if (queryMatch) {
        const queryKeyContent = queryMatch[1];
        
        // Check if query key properly includes all dependencies
        if (!this.hasProperDependencies(queryKeyContent, lines, i)) {
          issues.push({
            type: 'cache-invalidation-missing',
            severity: 'warning',
            message: `Query in ${filePath} may have incomplete dependency array`,
            location: `${filePath}:${i + 1}`,
            suggestion: 'Ensure query key includes all variables that affect the query'
          });
        }
      }

      // Check for mutations without proper onSuccess handlers
      const mutationMatch = line.match(/useMutation\s*\(/);
      if (mutationMatch) {
        if (!this.hasProperMutationHandlers(lines, i)) {
          issues.push({
            type: 'cache-invalidation-missing',
            severity: 'warning',
            message: `Mutation in ${filePath} lacks proper success handling`,
            location: `${filePath}:${i + 1}`,
            suggestion: 'Add onSuccess handler with appropriate cache invalidation'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Extract invalidation chains from a file
   */
  private extractInvalidationChains(filePath: string, content: string): CacheInvalidationChain[] {
    const chains: CacheInvalidationChain[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const mutationMatch = line.match(/mutationFn:\s*.*?apiRequest\(['"`]([^'"`]+)['"`]/);
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
          affectedComponents: [filePath]
        });
      }
    }

    return chains;
  }

  /**
   * Extract query keys from file content
   */
  private extractQueryKeys(content: string): string[] {
    const queryKeys: string[] = [];
    const queryKeyRegex = /queryKey:\s*\[['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = queryKeyRegex.exec(content)) !== null) {
      queryKeys.push(match[1]);
    }

    return queryKeys;
  }

  /**
   * Extract invalidation keys from file content
   */
  private extractInvalidationKeys(content: string): string[] {
    const invalidationKeys: string[] = [];
    const invalidationRegex = /invalidateQueries\s*\(\s*\[['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = invalidationRegex.exec(content)) !== null) {
      invalidationKeys.push(match[1]);
    }

    return invalidationKeys;
  }

  /**
   * Validate invalidation timing
   */
  private validateInvalidationTiming(content: string, chain: CacheInvalidationChain): boolean {
    const invalidationPattern = new RegExp(`invalidateQueries.*${chain.expectedInvalidations.join('|')}`);
    const onSuccessPattern = /onSuccess:|onSettled:/;
    
    // Find the mutation and check if invalidations are in proper callbacks
    const mutationIndex = content.indexOf(chain.apiEndpoint);
    if (mutationIndex === -1) return false;
    
    const afterMutation = content.substring(mutationIndex);
    const onSuccessIndex = afterMutation.search(onSuccessPattern);
    const invalidationIndex = afterMutation.search(invalidationPattern);
    
    return onSuccessIndex !== -1 && invalidationIndex > onSuccessIndex;
  }

  /**
   * Helper methods
   */
  private hasProperDependencies(queryKeyContent: string, lines: string[], lineIndex: number): boolean {
    // Simple heuristic: check if query key includes variables from surrounding context
    const surroundingContext = lines.slice(Math.max(0, lineIndex - 5), lineIndex + 5).join(' ');
    const variables = surroundingContext.match(/const\s+(\w+)\s*=/g) || [];
    
    // If there are variables defined nearby, they should probably be in the query key
    return variables.length === 0 || variables.some(variable => {
      const varName = variable.match(/const\s+(\w+)/)?.[1];
      return varName && queryKeyContent.includes(varName);
    });
  }

  private hasProperMutationHandlers(lines: string[], mutationLine: number): boolean {
    // Look for onSuccess, onError, or onSettled in the next 15 lines
    for (let i = mutationLine; i < Math.min(mutationLine + 15, lines.length); i++) {
      if (lines[i].includes('onSuccess') || lines[i].includes('onError') || lines[i].includes('onSettled')) {
        return true;
      }
    }
    return false;
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
    if (endpoint.includes('/api/files/')) {
      return ['/api/files'];
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
}