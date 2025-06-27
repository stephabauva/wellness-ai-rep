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

    // Check required name field
    if (!map.name || typeof map.name !== 'string') {
      issues.push({
        type: 'invalid-reference',
        severity: 'warning',
        message: 'System map missing required "name" field',
        location: mapPath,
        suggestion: 'Add a "name" field to identify the system map'
      });
    }

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
    if (map.components) {
      map.components.forEach((component, index) => {
        if (!component.name || !component.path) {
          issues.push({
            type: 'invalid-reference',
            severity: 'error',
            message: `Component at index ${index} missing required "name" or "path" field`,
            location: `${mapPath}:components[${index}]`,
            suggestion: 'Ensure all components have name and path fields'
          });
        }
      });
    }

    // Validate individual APIs
    if (map.apis) {
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