import { SystemMap, ValidationIssue, CacheDependencies, ComponentMap, ApiEndpointMap, FeatureGroups, IntegrationStatus } from '../core/types.js';
import { FileUtils } from '../utils/file-utils.js';

export interface CacheKeyAnalysis {
  queryKey: string;
  usedBy: string[];
  invalidatedBy: string[];
  expectedInvalidations: string[];
  missingInvalidations: string[];
}

export interface ComponentCacheAnalysis {
  componentName: string;
  cacheKeys: string[];
  cachingStrategy?: string;
  invalidationPattern?: string;
  refreshDependencies: string[];
  criticalIssues: string[];
}

export class SemanticCacheValidator {
  
  /**
   * Validates cache consistency across all system map formats
   */
  validateCacheConsistency(systemMap: SystemMap, mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Handle different system map formats
    if (systemMap.featureGroups && systemMap.components && !Array.isArray(systemMap.components)) {
      // Custom format like metrics-management.map.json
      issues.push(...this.validateCustomFormatCache(systemMap, mapPath));
    }
    
    if (systemMap.components && Array.isArray(systemMap.components)) {
      // Standard format
      issues.push(...this.validateStandardFormatCache(systemMap, mapPath));
    }
    
    return issues;
  }
  
  /**
   * Validates cache patterns in custom format (metrics-management style)
   */
  private validateCustomFormatCache(systemMap: SystemMap, mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // 1. Check for broken feature status
    if (systemMap.integrationStatus) {
      issues.push(...this.validateBrokenFeatureStatus(systemMap.integrationStatus, mapPath));
    }
    
    // 2. Analyze cache key consistency across components
    const componentMap = this.getComponentMapFromSystemMap(systemMap);
    if (componentMap) {
      const cacheAnalysis = this.analyzeCacheKeyConsistency(componentMap, mapPath);
      issues.push(...this.detectCacheKeyInconsistencies(cacheAnalysis, mapPath));
    }
    
    // 3. Validate cache invalidation chains
    if (systemMap.featureGroups) {
      issues.push(...this.validateCacheInvalidationChains(systemMap.featureGroups, componentMap, mapPath));
    }
    
    // 4. Check for missing component definitions
    issues.push(...this.validateComponentDefinitions(systemMap, mapPath));
    
    // 5. Validate handler file references
    if (systemMap.apiEndpoints) {
      issues.push(...this.validateHandlerFileReferences(systemMap.apiEndpoints, mapPath));
    }
    
    return issues;
  }
  
  /**
   * Extracts ComponentMap from SystemMap regardless of format
   */
  private getComponentMapFromSystemMap(systemMap: SystemMap): ComponentMap | undefined {
    if (!systemMap.components) return undefined;
    
    if (Array.isArray(systemMap.components)) {
      // Convert array format to map format
      const componentMap: ComponentMap = {};
      systemMap.components.forEach(comp => {
        if (comp.name) {
          componentMap[comp.name] = {
            path: comp.path,
            type: comp.type,
            description: comp.description
          };
        }
      });
      return Object.keys(componentMap).length > 0 ? componentMap : undefined;
    } else {
      // Already in map format
      return systemMap.components as ComponentMap;
    }
  }
  
  /**
   * Validates broken feature status indicators
   */
  private validateBrokenFeatureStatus(integrationStatus: IntegrationStatus, mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    for (const [featureName, status] of Object.entries(integrationStatus)) {
      if (status.status === 'broken' && status.knownIssues.length > 0) {
        issues.push({
          type: 'broken-feature-status',
          severity: 'error',
          message: `Feature "${featureName}" is marked as broken with known issues: ${status.knownIssues.join(', ')}`,
          location: `${mapPath}#/integrationStatus/${featureName}`,
          suggestion: 'Fix the underlying issues or change status to "partial" if feature has limited functionality',
          metadata: {
            featureName,
            knownIssues: status.knownIssues,
            lastVerified: status.lastVerified
          }
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Analyzes cache key consistency across components
   */
  private analyzeCacheKeyConsistency(components: ComponentMap, mapPath: string): CacheKeyAnalysis[] {
    const cacheKeyMap = new Map<string, CacheKeyAnalysis>();
    
    for (const [componentName, component] of Object.entries(components)) {
      // Extract cache keys from various fields
      const cacheKeys = this.extractCacheKeys(component);
      
      cacheKeys.forEach(queryKey => {
        if (!cacheKeyMap.has(queryKey)) {
          cacheKeyMap.set(queryKey, {
            queryKey,
            usedBy: [],
            invalidatedBy: [],
            expectedInvalidations: [],
            missingInvalidations: []
          });
        }
        
        const analysis = cacheKeyMap.get(queryKey)!;
        
        // Track usage patterns
        if (component.uses?.includes(queryKey) || component.dependsOn?.includes(queryKey)) {
          analysis.usedBy.push(componentName);
        }
        
        if (component.invalidates?.includes(queryKey)) {
          analysis.invalidatedBy.push(componentName);
        }
      });
    }
    
    return Array.from(cacheKeyMap.values());
  }
  
  /**
   * Extracts cache keys from component definition
   */
  private extractCacheKeys(component: any): string[] {
    const keys: string[] = [];
    
    // Check various fields that might contain cache keys
    if (component.uses) keys.push(...component.uses);
    if (component.invalidates) keys.push(...component.invalidates);
    if (component.dependsOn) keys.push(...component.dependsOn);
    
    // Look for query patterns
    const queryPatterns = /query[:\s]*([\/\w-]+)/gi;
    const componentStr = JSON.stringify(component);
    let match;
    while ((match = queryPatterns.exec(componentStr)) !== null) {
      keys.push(match[1]);
    }
    
    return [...new Set(keys)]; // Remove duplicates
  }
  
  /**
   * Detects cache key inconsistencies
   */
  private detectCacheKeyInconsistencies(analyses: CacheKeyAnalysis[], mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Group similar cache keys that might be inconsistent
    const similarKeys = this.groupSimilarCacheKeys(analyses);
    
    similarKeys.forEach(group => {
      if (group.length > 1) {
        // Found potential inconsistency
        const keys = group.map(a => a.queryKey);
        const allUsers = group.flatMap(a => a.usedBy);
        
        issues.push({
          type: 'cache-key-inconsistency',
          severity: 'error',
          message: `Cache key inconsistency detected: ${keys.join(', ')} - different keys used for same data by components: ${allUsers.join(', ')}`,
          location: `${mapPath}#/components`,
          suggestion: 'Standardize cache keys across all components accessing the same data source',
          metadata: {
            inconsistentKeys: keys,
            affectedComponents: allUsers
          }
        });
      }
    });
    
    // Check for missing invalidations
    analyses.forEach(analysis => {
      if (analysis.usedBy.length > 0 && analysis.invalidatedBy.length === 0) {
        issues.push({
          type: 'cache-invalidation-missing',
          severity: 'warning',
          message: `Cache key "${analysis.queryKey}" is used by ${analysis.usedBy.join(', ')} but never invalidated`,
          location: `${mapPath}#/components`,
          suggestion: 'Add cache invalidation for this query key when data changes',
          metadata: {
            queryKey: analysis.queryKey,
            usedBy: analysis.usedBy
          }
        });
      }
    });
    
    return issues;
  }
  
  /**
   * Groups similar cache keys that might represent the same data
   */
  private groupSimilarCacheKeys(analyses: CacheKeyAnalysis[]): CacheKeyAnalysis[][] {
    const groups: CacheKeyAnalysis[][] = [];
    const processed = new Set<string>();
    
    analyses.forEach(analysis => {
      if (processed.has(analysis.queryKey)) return;
      
      const similarKeys = analyses.filter(other => 
        this.areCacheKeysSimilar(analysis.queryKey, other.queryKey)
      );
      
      if (similarKeys.length > 0) {
        groups.push(similarKeys);
        similarKeys.forEach(key => processed.add(key.queryKey));
      }
    });
    
    return groups;
  }
  
  /**
   * Determines if two cache keys likely represent the same data
   */
  private areCacheKeysSimilar(key1: string, key2: string): boolean {
    // Normalize keys for comparison
    const normalize = (key: string) => 
      key.toLowerCase()
         .replace(/^query[:\s]*/, '')
         .replace(/[\/\-_]/g, '')
         .replace(/settings?/g, 'setting')
         .replace(/visibilit(y|ies)/g, 'visibility');
    
    const norm1 = normalize(key1);
    const norm2 = normalize(key2);
    
    // Check for exact match after normalization
    if (norm1 === norm2) return true;
    
    // Check for substring relationships (e.g., "healthVisibility" vs "health-consent-visibility")
    const minLength = Math.min(norm1.length, norm2.length);
    if (minLength > 5) { // Only check substantial keys
      return norm1.includes(norm2) || norm2.includes(norm1);
    }
    
    return false;
  }
  
  /**
   * Validates cache invalidation chains in feature groups
   */
  private validateCacheInvalidationChains(
    featureGroups: FeatureGroups, 
    components: ComponentMap | undefined, 
    mapPath: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    for (const [groupName, group] of Object.entries(featureGroups)) {
      for (const [featureName, feature] of Object.entries(group.features)) {
        if (feature.apiIntegration?.cacheDependencies) {
          issues.push(...this.validateFeatureCacheChain(
            featureName,
            feature.apiIntegration.cacheDependencies,
            feature.components || [],
            components,
            mapPath
          ));
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Validates cache chain for a specific feature
   */
  private validateFeatureCacheChain(
    featureName: string,
    cacheDeps: CacheDependencies,
    featureComponents: string[],
    allComponents: ComponentMap | undefined,
    mapPath: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for missing invalidations
    if (cacheDeps.missingInvalidations && cacheDeps.missingInvalidations.length > 0) {
      issues.push({
        type: 'incomplete-cache-chain',
        severity: 'error',
        message: `Feature "${featureName}" has incomplete cache invalidation chain: missing ${cacheDeps.missingInvalidations.join(', ')}`,
        location: `${mapPath}#/featureGroups/${featureName}/cacheDependencies`,
        suggestion: 'Add missing cache invalidations to ensure all dependent components refresh',
        metadata: {
          featureName,
          missingInvalidations: cacheDeps.missingInvalidations,
          currentInvalidations: cacheDeps.invalidates || []
        }
      });
    }
    
    // Validate that refreshed components exist
    if (cacheDeps.refreshesComponents) {
      cacheDeps.refreshesComponents.forEach(componentName => {
        if (allComponents && !allComponents[componentName]) {
          issues.push({
            type: 'missing-component-definition',
            severity: 'error',
            message: `Component "${componentName}" is referenced in cache refresh chain but not defined in components section`,
            location: `${mapPath}#/featureGroups/${featureName}/cacheDependencies`,
            suggestion: 'Add component definition to components section or remove from refresh chain',
            metadata: {
              componentName,
              referencedBy: featureName
            }
          });
        }
      });
    }
    
    return issues;
  }
  
  /**
   * Validates that all referenced components are defined
   */
  private validateComponentDefinitions(systemMap: SystemMap, mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const definedComponents = new Set(Object.keys(systemMap.components || {}));
    const referencedComponents = new Set<string>();
    
    // Collect all component references
    if (systemMap.featureGroups) {
      for (const group of Object.values(systemMap.featureGroups)) {
        for (const feature of Object.values(group.features)) {
          feature.components?.forEach(comp => referencedComponents.add(comp));
          feature.apiIntegration?.cacheDependencies?.refreshesComponents?.forEach(comp => 
            referencedComponents.add(comp)
          );
        }
      }
    }
    
    if (systemMap.tableOfContents) {
      for (const section of Object.values(systemMap.tableOfContents)) {
        section.components?.forEach(comp => referencedComponents.add(comp));
      }
    }
    
    // Find missing definitions
    referencedComponents.forEach(componentName => {
      if (!definedComponents.has(componentName)) {
        issues.push({
          type: 'missing-component-definition',
          severity: 'error',
          message: `Component "${componentName}" is referenced but not defined in components section`,
          location: `${mapPath}#/components`,
          suggestion: 'Add component definition to components section with proper path and metadata',
          metadata: {
            componentName,
            referencedIn: 'multiple locations'
          }
        });
      }
    });
    
    return issues;
  }
  
  /**
   * Validates handler file references in API endpoints
   */
  private validateHandlerFileReferences(apiEndpoints: ApiEndpointMap, mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    for (const [endpoint, config] of Object.entries(apiEndpoints)) {
      if (config.handlerFile && config.handlerFile.includes('server/routes.ts')) {
        // Check if modular routes exist
        const possibleModularFiles = [
          'server/routes/health-routes.ts',
          'server/routes/settings-routes.ts',
          'server/routes/chat-routes.ts',
          'server/routes/memory-routes.ts',
          'server/routes/file-routes.ts',
          'server/routes/monitoring-routes.ts'
        ];
        
        const existingModularFile = possibleModularFiles.find(file => FileUtils.fileExists(file));
        
        if (existingModularFile) {
          issues.push({
            type: 'handler-file-mismatch',
            severity: 'warning',
            message: `API endpoint "${endpoint}" references outdated handler file "server/routes.ts" but modular routes exist`,
            location: `${mapPath}#/apiEndpoints/${endpoint}`,
            suggestion: `Update handler file reference to appropriate modular route file (e.g., ${existingModularFile})`,
            metadata: {
              endpoint,
              currentHandler: config.handlerFile,
              suggestedHandler: existingModularFile
            }
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Validates standard format cache patterns
   */
  private validateStandardFormatCache(systemMap: SystemMap, mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Add validation for standard format if needed
    // This can be expanded based on standard format requirements
    
    return issues;
  }
}