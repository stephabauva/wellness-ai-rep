import { FileUtils } from '../utils/file-utils.js';
import { PathResolver } from '../utils/path-resolver.js';
import type { 
  ApiEndpoint, 
  ValidationResult, 
  ValidationIssue, 
  ParsedCodebase,
  ApiInfo 
} from '../core/types.js';

export class ApiValidator {
  private pathResolver: PathResolver;

  constructor(projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
  }

  /**
   * Validate that an API endpoint exists in the codebase
   */
  validateEndpointExists(endpoint: ApiEndpoint, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    const endpointKey = `${endpoint.method.toUpperCase()} ${endpoint.path}`;
    const apiInfo = codebase.apis.get(endpointKey);

    if (!apiInfo) {
      // Try to find similar endpoints
      const similarEndpoints = this.findSimilarEndpoints(endpoint, codebase);
      
      if (similarEndpoints.length > 0) {
        issues.push({
          type: 'api-mismatch',
          severity: 'warning',
          message: `API endpoint ${endpointKey} not found, but similar endpoints exist: ${similarEndpoints.join(', ')}`,
          location: endpoint.handler,
          suggestion: 'Check if the endpoint path or method is correct in the system map'
        });
      } else {
        issues.push({
          type: 'api-mismatch',
          severity: 'error',
          message: `API endpoint ${endpointKey} not found in codebase`,
          location: endpoint.handler,
          suggestion: `Implement the API endpoint or remove from system map`
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        checksPerformed: 1,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Validate that the handler file exists and contains the endpoint
   */
  validateHandlerFile(endpoint: ApiEndpoint, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    const resolvedHandlerPath = this.pathResolver.resolveApiHandler(endpoint.handler);
    
    if (!FileUtils.fileExists(resolvedHandlerPath)) {
      // Try to find the handler in alternative locations
      const possibleLocations = this.findHandlerLocations(endpoint.handler);
      
      if (possibleLocations.length === 0) {
        issues.push({
          type: 'api-mismatch',
          severity: 'error',
          message: `API handler file not found: ${endpoint.handler}`,
          location: endpoint.handler,
          suggestion: 'Create the handler file or update the path in the system map'
        });
      } else {
        issues.push({
          type: 'api-mismatch',
          severity: 'warning',
          message: `Handler file not found at specified path, but found at: ${possibleLocations[0]}`,
          location: endpoint.handler,
          suggestion: `Update system map handler path to: ${this.pathResolver.getRelativeFromRoot(possibleLocations[0])}`
        });
      }
    } else {
      // Check if the handler file actually implements the endpoint
      const endpointKey = `${endpoint.method.toUpperCase()} ${endpoint.path}`;
      const apiInfo = codebase.apis.get(endpointKey);
      
      if (apiInfo && apiInfo.handlerFile !== resolvedHandlerPath) {
        issues.push({
          type: 'api-mismatch',
          severity: 'warning',
          message: `Endpoint ${endpointKey} is implemented in ${apiInfo.handlerFile}, not in specified handler ${endpoint.handler}`,
          location: endpoint.handler,
          suggestion: `Update system map handler to point to ${this.pathResolver.getRelativeFromRoot(apiInfo.handlerFile)}`
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        checksPerformed: 1,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Validate request/response schemas (basic validation)
   */
  validateRequestResponse(endpoint: ApiEndpoint, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    // For now, this performs basic validation
    // In a full implementation, this would validate against actual request/response types
    
    if (endpoint.requestSchema && typeof endpoint.requestSchema !== 'object') {
      issues.push({
        type: 'api-mismatch',
        severity: 'warning',
        message: `Invalid request schema format for ${endpoint.method} ${endpoint.path}`,
        location: endpoint.handler,
        suggestion: 'Ensure request schema is a valid JSON schema object'
      });
    }

    if (endpoint.responseSchema && typeof endpoint.responseSchema !== 'object') {
      issues.push({
        type: 'api-mismatch',
        severity: 'warning',
        message: `Invalid response schema format for ${endpoint.method} ${endpoint.path}`,
        location: endpoint.handler,
        suggestion: 'Ensure response schema is a valid JSON schema object'
      });
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        checksPerformed: endpoint.requestSchema && endpoint.responseSchema ? 2 : 1,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Validate database access patterns (basic check)
   */
  validateDatabaseAccess(endpoint: ApiEndpoint, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    // Check if endpoint that should access database actually does
    const dbMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const isDbMethod = dbMethods.includes(endpoint.method.toUpperCase());
    
    if (isDbMethod) {
      const endpointKey = `${endpoint.method.toUpperCase()} ${endpoint.path}`;
      const apiInfo = codebase.apis.get(endpointKey);
      
      if (apiInfo && apiInfo.handlerFile) {
        // Read handler file and check for database access patterns
        try {
          const handlerContent = FileUtils.readJsonFile(apiInfo.handlerFile);
          if (handlerContent && typeof handlerContent === 'string') {
            const hasDatabaseAccess = this.checkDatabaseAccess(handlerContent);
            
            if (!hasDatabaseAccess) {
              issues.push({
                type: 'api-mismatch',
                severity: 'info',
                message: `${endpoint.method} endpoint ${endpoint.path} may not access database`,
                location: apiInfo.handlerFile,
                suggestion: 'Verify if database access is needed for this endpoint'
              });
            }
          }
        } catch {
          // Skip database access validation if file can't be read
        }
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        checksPerformed: 1,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Find similar endpoints that might be typos or variants
   */
  private findSimilarEndpoints(targetEndpoint: ApiEndpoint, codebase: ParsedCodebase): string[] {
    const similar: string[] = [];
    const targetKey = `${targetEndpoint.method.toUpperCase()} ${targetEndpoint.path}`;
    
    for (const [endpointKey, apiInfo] of codebase.apis) {
      // Skip route registration entries
      if (apiInfo.method === 'ROUTES') continue;
      
      // Check for same path, different method
      if (endpointKey.endsWith(` ${targetEndpoint.path}`) && endpointKey !== targetKey) {
        similar.push(endpointKey);
      }
      
      // Check for same method, similar path
      if (endpointKey.startsWith(`${targetEndpoint.method.toUpperCase()} `)) {
        const path = endpointKey.substring(targetEndpoint.method.length + 1);
        if (this.isSimilarPath(targetEndpoint.path, path)) {
          similar.push(endpointKey);
        }
      }
    }
    
    return similar.slice(0, 3); // Return top 3 similar endpoints
  }

  /**
   * Check if two paths are similar (basic string similarity)
   */
  private isSimilarPath(path1: string, path2: string): boolean {
    // Simple similarity check - can be enhanced with more sophisticated algorithms
    const normalize = (path: string) => path.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(path1);
    const norm2 = normalize(path2);
    
    // Check if one is substring of another
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return true;
    }
    
    // Check Levenshtein distance for short strings
    if (Math.max(norm1.length, norm2.length) <= 10) {
      const distance = this.levenshteinDistance(norm1, norm2);
      return distance <= 2;
    }
    
    return false;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Find possible locations for an API handler
   */
  private findHandlerLocations(handlerPath: string): string[] {
    const locations: string[] = [];
    
    // Extract filename from path
    const filename = handlerPath.split('/').pop() || handlerPath;
    const searchDirs = [
      'server/routes',
      'server/api', 
      'server',
      'api',
      'routes'
    ];

    const extensions = ['.ts', '.js'];
    
    for (const dir of searchDirs) {
      const fullDir = this.pathResolver.normalizePath(this.pathResolver.getProjectRoot() + '/' + dir);
      if (!FileUtils.directoryExists(fullDir)) continue;

      for (const ext of extensions) {
        const candidate = this.pathResolver.normalizePath(fullDir + '/' + filename + ext);
        if (FileUtils.fileExists(candidate)) {
          locations.push(candidate);
        }
      }
    }

    return locations;
  }

  /**
   * Check if file content indicates database access
   */
  private checkDatabaseAccess(content: string): boolean {
    const dbPatterns = [
      /\b(db|database|storage)\./i,
      /\b(insert|update|delete|select)\b/i,
      /\bfrom\s+['"`]\w+['"`]/i, // SQL FROM clause
      /\.(save|create|update|delete|find|query)\(/i,
      /storage\.(get|set|add|remove)/i
    ];

    return dbPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate all APIs in a system map
   */
  async validateAllApis(
    apis: ApiEndpoint[], 
    codebase: ParsedCodebase,
    enabledChecks: {
      checkHandlerFiles: boolean;
      validateSchemas: boolean;
      checkOrphanedEndpoints: boolean;
    }
  ): Promise<ValidationResult> {
    const allIssues: ValidationIssue[] = [];
    const startTime = Date.now();
    let totalChecks = 0;

    for (const api of apis) {
      // Always check endpoint existence
      const existsResult = this.validateEndpointExists(api, codebase);
      allIssues.push(...existsResult.issues);
      totalChecks += existsResult.metrics.checksPerformed;

      if (enabledChecks.checkHandlerFiles) {
        const handlerResult = this.validateHandlerFile(api, codebase);
        allIssues.push(...handlerResult.issues);
        totalChecks += handlerResult.metrics.checksPerformed;
      }

      if (enabledChecks.validateSchemas) {
        const schemaResult = this.validateRequestResponse(api, codebase);
        allIssues.push(...schemaResult.issues);
        totalChecks += schemaResult.metrics.checksPerformed;
      }
    }

    // Check for orphaned endpoints (endpoints in codebase but not in system map)
    if (enabledChecks.checkOrphanedEndpoints) {
      const orphanedResult = this.findOrphanedEndpoints(apis, codebase);
      allIssues.push(...orphanedResult.issues);
      totalChecks += orphanedResult.metrics.checksPerformed;
    }

    return {
      passed: allIssues.filter(i => i.severity === 'error').length === 0,
      issues: allIssues,
      metrics: {
        checksPerformed: totalChecks,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Find API endpoints in codebase that are not documented in system maps
   */
  private findOrphanedEndpoints(declaredApis: ApiEndpoint[], codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    // Build set of declared endpoints
    const declaredEndpoints = new Set(
      declaredApis.map(api => `${api.method.toUpperCase()} ${api.path}`)
    );

    // Check all endpoints found in codebase
    for (const [endpointKey, apiInfo] of codebase.apis) {
      // Skip route registration entries
      if (apiInfo.method === 'ROUTES') continue;
      
      if (!declaredEndpoints.has(endpointKey)) {
        issues.push({
          type: 'api-mismatch',
          severity: 'info',
          message: `API endpoint ${endpointKey} found in codebase but not documented in system maps`,
          location: apiInfo.handlerFile,
          suggestion: 'Add endpoint to system map or remove if no longer needed'
        });
      }
    }

    return {
      passed: true, // Orphaned endpoints are informational, not errors
      issues,
      metrics: {
        checksPerformed: codebase.apis.size,
        executionTime: Date.now() - startTime
      }
    };
  }
}