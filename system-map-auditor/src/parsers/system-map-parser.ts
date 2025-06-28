import { FileUtils } from '../utils/file-utils.js';
import { PathResolver } from '../utils/path-resolver.js';
import type { SystemMap, SystemMapReference, ValidationIssue } from '../core/types.js';

export class SystemMapParser {
  private pathResolver: PathResolver;
  private parsedMaps: Map<string, SystemMap> = new Map();
  private parseStack: Set<string> = new Set(); // Track parsing to detect circular refs

  constructor(projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
  }

  /**
   * Parse a single system map file
   */
  async parseSystemMap(mapPath: string): Promise<{ map: SystemMap | null; issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];
    
    // Check if file exists
    if (!FileUtils.fileExists(mapPath)) {
      issues.push({
        type: 'file-not-found',
        severity: 'error',
        message: `System map file not found: ${mapPath}`,
        location: mapPath,
        suggestion: 'Check if the file path is correct and the file exists'
      });
      return { map: null, issues };
    }

    // Check for circular references
    if (this.parseStack.has(mapPath)) {
      issues.push({
        type: 'circular-dependency',
        severity: 'error',
        message: `Circular reference detected in system map: ${mapPath}`,
        location: mapPath,
        suggestion: 'Remove circular $ref dependencies between system maps'
      });
      return { map: null, issues };
    }

    // Check cache
    if (this.parsedMaps.has(mapPath)) {
      return { map: this.parsedMaps.get(mapPath)!, issues };
    }

    this.parseStack.add(mapPath);

    try {
      const rawMap = FileUtils.readJsonFile<SystemMap>(mapPath);
      if (!rawMap) {
        issues.push({
          type: 'invalid-reference',
          severity: 'error',
          message: `Failed to parse JSON in system map: ${mapPath}`,
          location: mapPath,
          suggestion: 'Validate JSON syntax in the system map file'
        });
        return { map: null, issues };
      }

      // Validate basic structure
      const structureIssues = this.validateMapStructure(rawMap, mapPath);
      issues.push(...structureIssues);

      // Resolve references if present
      if (rawMap.references && rawMap.references.length > 0) {
        const { resolvedMap, refIssues } = await this.resolveReferences(rawMap, mapPath);
        issues.push(...refIssues);
        rawMap.components = resolvedMap.components || rawMap.components;
        rawMap.apis = resolvedMap.apis || rawMap.apis;
        rawMap.flows = resolvedMap.flows || rawMap.flows;
        rawMap.dependencies = resolvedMap.dependencies || rawMap.dependencies;
      }

      // Cache the parsed map
      this.parsedMaps.set(mapPath, rawMap);
      
      return { map: rawMap, issues };
    } catch (error) {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: `Error parsing system map: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: mapPath,
        suggestion: 'Check file format and JSON validity'
      });
      return { map: null, issues };
    } finally {
      this.parseStack.delete(mapPath);
    }
  }

  /**
   * Parse all system maps in the project
   */
  async parseAllSystemMaps(): Promise<{ maps: Map<string, SystemMap>; issues: ValidationIssue[] }> {
    const allIssues: ValidationIssue[] = [];
    const mapFiles = FileUtils.findSystemMaps(this.pathResolver.getProjectRoot());
    
    if (mapFiles.length === 0) {
      allIssues.push({
        type: 'file-not-found',
        severity: 'warning',
        message: 'No system map files found in .system-maps directory',
        location: this.pathResolver.getSystemMapsDir(),
        suggestion: 'Create system map files (.map.json) in the .system-maps directory'
      });
    }

    // Parse each map file
    for (const mapFile of mapFiles) {
      const { map, issues } = await this.parseSystemMap(mapFile);
      allIssues.push(...issues);
      
      if (map) {
        this.parsedMaps.set(mapFile, map);
      }
    }

    return { maps: this.parsedMaps, issues: allIssues };
  }

  /**
   * Validate basic system map structure
   */
  private validateMapStructure(map: SystemMap, mapPath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if this is a feature file
    if (mapPath.endsWith('.feature.json')) {
      return this.validateFeatureFileStructure(map as any, mapPath, issues);
    }

    // Check for name field (can be in different locations)
    const hasName = map.name || 
                   (map as any).appName || 
                   (map as any).featureGroups ||
                   (map as any).domains;
    
    if (!hasName) {
      issues.push({
        type: 'invalid-reference',
        severity: 'warning',
        message: 'System map missing required "name" field',
        location: mapPath,
        suggestion: 'Add a "name" field to identify the system map'
      });
    }

    // Handle different system map formats
    if ((map as any).domains) {
      // Root system map format
      return this.validateRootMapStructure(map as any, mapPath, issues);
    } else if ((map as any).featureGroups) {
      // Feature-based system map format
      return this.validateFeatureMapStructure(map as any, mapPath, issues);
    } else {
      // Legacy format validation
      return this.validateLegacyMapStructure(map, mapPath, issues);
    }
  }

  /**
   * Validate root system map structure (domains format)
   */
  private validateRootMapStructure(map: any, mapPath: string, issues: ValidationIssue[]): ValidationIssue[] {
    if (map.domains && typeof map.domains !== 'object') {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'Root system map "domains" field must be an object',
        location: mapPath,
        suggestion: 'Ensure domains is defined as an object with domain definitions'
      });
    }

    // Validate individual domains
    if (map.domains) {
      Object.entries(map.domains).forEach(([domainName, domain]: [string, any]) => {
        if (!domain.description || !domain.path) {
          issues.push({
            type: 'invalid-reference',
            severity: 'error',
            message: `Domain "${domainName}" missing required "description" or "path" field`,
            location: `${mapPath}:domains.${domainName}`,
            suggestion: 'Ensure all domains have description and path fields'
          });
        }
      });
    }

    return issues;
  }

  /**
   * Validate feature-based system map structure
   */
  private validateFeatureMapStructure(map: any, mapPath: string, issues: ValidationIssue[]): ValidationIssue[] {
    if (map.featureGroups && typeof map.featureGroups !== 'object') {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'System map "featureGroups" field must be an object',
        location: mapPath,
        suggestion: 'Ensure featureGroups is defined as an object'
      });
    }

    // Validate components object
    if (map.components && typeof map.components !== 'object') {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'System map "components" field must be an object',
        location: mapPath,
        suggestion: 'Ensure components is defined as an object'
      });
    }

    // Validate apiEndpoints object
    if (map.apiEndpoints && typeof map.apiEndpoints !== 'object') {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'System map "apiEndpoints" field must be an object',
        location: mapPath,
        suggestion: 'Ensure apiEndpoints is defined as an object'
      });
    }

    // Validate individual components
    if (map.components) {
      Object.entries(map.components).forEach(([componentName, component]: [string, any]) => {
        if (typeof component === 'object' && component !== null) {
          // Handle nested component groups (e.g., routeModules: { chat-routes: "path" })
          const hasNestedComponents = Object.values(component).some(value => 
            typeof value === 'string' && value.includes('/')
          );
          
          if (hasNestedComponents) {
            // Validate nested components (skip metadata fields like description, type)
            Object.entries(component).forEach(([nestedKey, nestedValue]: [string, any]) => {
              if (typeof nestedValue === 'string') {
                // Skip metadata fields and script files
                const isMetadataField = ['description', 'type', 'version', 'status'].includes(nestedKey);
                const isScriptFile = nestedKey === 'script' && (nestedValue.endsWith('.sh') || nestedValue.endsWith('.js'));
                if (!isMetadataField && !isScriptFile && !nestedValue.includes('/')) {
                  issues.push({
                    type: 'invalid-reference',
                    severity: 'error',
                    message: `Component "${componentName}.${nestedKey}" missing valid path in value "${nestedValue}"`,
                    location: `${mapPath}:components.${componentName}.${nestedKey}`,
                    suggestion: 'Ensure component values contain valid file paths'
                  });
                }
              }
            });
          } else {
            // Standard component object validation
            if (!component.path) {
              issues.push({
                type: 'invalid-reference',
                severity: 'error',
                message: `Component "${componentName}" missing required "path" field`,
                location: `${mapPath}:components.${componentName}`,
                suggestion: 'Ensure all components have path fields'
              });
            }
          }
        } else if (typeof component === 'string') {
          // Simple string path format
          if (!component.includes('/')) {
            issues.push({
              type: 'invalid-reference',
              severity: 'error',
              message: `Component "${componentName}" has invalid path format "${component}"`,
              location: `${mapPath}:components.${componentName}`,
              suggestion: 'Ensure component path contains directory separators'
            });
          }
        } else {
          issues.push({
            type: 'invalid-reference',
            severity: 'error',
            message: `Component "${componentName}" must be either an object with path field or a string path`,
            location: `${mapPath}:components.${componentName}`,
            suggestion: 'Ensure components are objects with path fields or string paths'
          });
        }
      });
    }

    // Validate individual API endpoints
    if (map.apiEndpoints) {
      Object.entries(map.apiEndpoints).forEach(([endpoint, api]: [string, any]) => {
        // Handle nested API structures (e.g., chat: { conversations: "GET /api/..." })
        if (typeof api === 'object' && api !== null) {
          // Check if this is a grouped API structure
          const hasNestedEndpoints = Object.values(api).some(value => 
            typeof value === 'string' && value.match(/^(GET|POST|PUT|PATCH|DELETE)\s/)
          );
          
          if (hasNestedEndpoints) {
            // Validate nested endpoints
            Object.entries(api).forEach(([nestedKey, nestedValue]: [string, any]) => {
              if (typeof nestedValue === 'string') {
                const hasMethod = nestedValue.match(/^(GET|POST|PUT|PATCH|DELETE)\s/);
                if (!hasMethod) {
                  issues.push({
                    type: 'invalid-reference',
                    severity: 'error',
                    message: `API endpoint "${endpoint}.${nestedKey}" missing HTTP method in value "${nestedValue}"`,
                    location: `${mapPath}:apiEndpoints.${endpoint}.${nestedKey}`,
                    suggestion: 'Ensure API endpoint values start with HTTP method (GET, POST, etc.)'
                  });
                }
              }
            });
          } else {
            // Standard API object validation
            const hasMethod = api.method || endpoint.match(/^(GET|POST|PUT|PATCH|DELETE)\s/);
            const hasDescription = api.description || api.handler || api.handlerFile;
            
            if (!hasMethod || !hasDescription) {
              issues.push({
                type: 'invalid-reference',
                severity: 'error',
                message: `API endpoint "${endpoint}" missing required "method" or "description" field`,
                location: `${mapPath}:apiEndpoints.${endpoint}`,
                suggestion: 'Ensure all API endpoints have method and description fields'
              });
            }
          }
        }
      });
    }

    return issues;
  }

  /**
   * Validate feature file structure with metadata
   */
  private validateFeatureFileStructure(featureFile: any, mapPath: string, issues: ValidationIssue[]): ValidationIssue[] {
    // Check for required metadata
    if (!featureFile._metadata) {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'Feature file missing required "_metadata" field',
        location: mapPath,
        suggestion: 'Add a "_metadata" object with featureName, featureGroup, parentFile, and domain fields'
      });
    } else {
      // Validate metadata fields
      const metadata = featureFile._metadata;
      const requiredFields = ['featureName', 'featureGroup', 'parentFile', 'domain'];
      
      for (const field of requiredFields) {
        if (!metadata[field]) {
          issues.push({
            type: 'invalid-reference',
            severity: 'error',
            message: `Feature file metadata missing required "${field}" field`,
            location: `${mapPath}:_metadata.${field}`,
            suggestion: `Add "${field}" to the _metadata object`
          });
        }
      }
    }

    // Check for description
    if (!featureFile.description) {
      issues.push({
        type: 'invalid-reference',
        severity: 'warning',
        message: 'Feature file missing "description" field',
        location: mapPath,
        suggestion: 'Add a "description" field to explain the feature purpose'
      });
    }

    // Check for userFlow
    if (!featureFile.userFlow) {
      issues.push({
        type: 'invalid-reference',
        severity: 'warning',
        message: 'Feature file missing "userFlow" field',
        location: mapPath,
        suggestion: 'Add a "userFlow" array to document user interaction steps'
      });
    } else if (!Array.isArray(featureFile.userFlow)) {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'Feature file "userFlow" must be an array',
        location: mapPath,
        suggestion: 'Ensure userFlow is defined as an array of step descriptions'
      });
    }

    // Check for components
    if (!featureFile.components) {
      issues.push({
        type: 'invalid-reference',
        severity: 'warning',
        message: 'Feature file missing "components" field',
        location: mapPath,
        suggestion: 'Add a "components" array to list involved components'
      });
    } else if (!Array.isArray(featureFile.components)) {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'Feature file "components" must be an array',
        location: mapPath,
        suggestion: 'Ensure components is defined as an array of component names or objects'
      });
    }

    return issues;
  }

  /**
   * Validate legacy system map structure (array format)
   */
  private validateLegacyMapStructure(map: SystemMap, mapPath: string, issues: ValidationIssue[]): ValidationIssue[] {
    // Validate components array
    if (map.components && !Array.isArray(map.components)) {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'System map "components" field must be an array',
        location: mapPath,
        suggestion: 'Ensure components is defined as an array'
      });
    }

    // Validate APIs array
    if (map.apis && !Array.isArray(map.apis)) {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'System map "apis" field must be an array',
        location: mapPath,
        suggestion: 'Ensure apis is defined as an array'
      });
    }

    // Validate flows array
    if (map.flows && !Array.isArray(map.flows)) {
      issues.push({
        type: 'invalid-reference',
        severity: 'error',
        message: 'System map "flows" field must be an array',
        location: mapPath,
        suggestion: 'Ensure flows is defined as an array'
      });
    }

    // Validate individual components
    if (map.components && Array.isArray(map.components)) {
      map.components.forEach((component, index) => {
        // Handle both object format {name, path} and string format "ComponentName"
        const isObject = typeof component === 'object' && component !== null;
        const isString = typeof component === 'string';
        
        if (isObject) {
          if (!component.name || !component.path) {
            issues.push({
              type: 'invalid-reference',
              severity: 'error',
              message: `Component at index ${index} missing required "name" or "path" field`,
              location: `${mapPath}:components[${index}]`,
              suggestion: 'Ensure all components have name and path fields'
            });
          }
        } else if (!isString) {
          issues.push({
            type: 'invalid-reference',
            severity: 'error',
            message: `Component at index ${index} must be either an object with name/path or a string`,
            location: `${mapPath}:components[${index}]`,
            suggestion: 'Ensure components are either objects {name, path} or strings'
          });
        }
      });
    }

    // Validate individual APIs
    if (map.apis && Array.isArray(map.apis)) {
      map.apis.forEach((api, index) => {
        if (!api.path || !api.method || !api.handler) {
          issues.push({
            type: 'invalid-reference',
            severity: 'error',
            message: `API at index ${index} missing required fields (path, method, handler)`,
            location: `${mapPath}:apis[${index}]`,
            suggestion: 'Ensure all APIs have path, method, and handler fields'
          });
        }
      });
    }

    return issues;
  }

  /**
   * Resolve $ref references in system maps
   */
  private async resolveReferences(
    map: SystemMap, 
    currentMapPath: string
  ): Promise<{ resolvedMap: Partial<SystemMap>; refIssues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];
    const resolvedMap: Partial<SystemMap> = {
      components: [...(map.components || [])],
      apis: [...(map.apis || [])],
      flows: [...(map.flows || [])],
      dependencies: [...(map.dependencies || [])]
    };

    if (!map.references) {
      return { resolvedMap, refIssues: issues };
    }

    // Process each reference
    for (const ref of map.references) {
      if (!ref.$ref) {
        issues.push({
          type: 'invalid-reference',
          severity: 'error',
          message: 'Reference missing $ref field',
          location: currentMapPath,
          suggestion: 'Ensure all references have a $ref field pointing to another system map'
        });
        continue;
      }

      try {
        const refPath = this.pathResolver.resolveSystemMapRef(ref.$ref, currentMapPath);
        const { map: referencedMap, issues: refParseIssues } = await this.parseSystemMap(refPath);
        
        issues.push(...refParseIssues);

        if (referencedMap) {
          // Merge components, APIs, flows, and dependencies
          if (referencedMap.components) {
            resolvedMap.components!.push(...referencedMap.components);
          }
          if (referencedMap.apis) {
            resolvedMap.apis!.push(...referencedMap.apis);
          }
          if (referencedMap.flows) {
            resolvedMap.flows!.push(...referencedMap.flows);
          }
          if (referencedMap.dependencies) {
            resolvedMap.dependencies!.push(...referencedMap.dependencies);
          }
        }
      } catch (error) {
        issues.push({
          type: 'invalid-reference',
          severity: 'error',
          message: `Failed to resolve reference ${ref.$ref}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: currentMapPath,
          suggestion: 'Check if the referenced system map file exists and is valid'
        });
      }
    }

    return { resolvedMap, refIssues: issues };
  }

  /**
   * Get all parsed maps
   */
  getParsedMaps(): Map<string, SystemMap> {
    return this.parsedMaps;
  }

  /**
   * Clear parsed maps cache
   */
  clearCache(): void {
    this.parsedMaps.clear();
    this.parseStack.clear();
  }

  /**
   * Get system map by name
   */
  getMapByName(name: string): SystemMap | null {
    for (const map of this.parsedMaps.values()) {
      if (map.name === name) {
        return map;
      }
    }
    return null;
  }

  /**
   * Extract all unique component names from parsed maps
   */
  getAllComponentNames(): Set<string> {
    const componentNames = new Set<string>();
    
    for (const map of this.parsedMaps.values()) {
      if (map.components) {
        map.components.forEach(component => {
          componentNames.add(component.name);
        });
      }
    }
    
    return componentNames;
  }

  /**
   * Extract all unique API endpoints from parsed maps
   */
  getAllApiEndpoints(): Set<string> {
    const endpoints = new Set<string>();
    
    for (const map of this.parsedMaps.values()) {
      if (map.apis) {
        map.apis.forEach(api => {
          endpoints.add(`${api.method} ${api.path}`);
        });
      }
    }
    
    return endpoints;
  }
}