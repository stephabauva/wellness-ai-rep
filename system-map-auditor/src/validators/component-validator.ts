import { FileUtils } from '../utils/file-utils.js';
import { PathResolver } from '../utils/path-resolver.js';
import type { 
  ComponentDef, 
  ValidationResult, 
  ValidationIssue, 
  ParsedCodebase,
  ComponentInfo 
} from '../core/types.js';

export class ComponentValidator {
  private pathResolver: PathResolver;

  constructor(projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
  }

  /**
   * Validate that a component exists in the codebase
   */
  validateExists(component: ComponentDef, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    // First, try to resolve the exact path
    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    
    if (FileUtils.fileExists(resolvedPath)) {
      // File exists, check if it exports the expected component
      const componentInfo = codebase.components.get(resolvedPath);
      
      if (!componentInfo) {
        issues.push({
          type: 'missing-component',
          severity: 'warning',
          message: `Component file exists but was not scanned: ${component.name}`,
          location: resolvedPath,
          suggestion: 'Ensure the file exports the component properly or check scanning patterns'
        });
      } else if (!componentInfo.exports.includes(component.name) && 
                 !componentInfo.exports.includes('default')) {
        issues.push({
          type: 'missing-component',
          severity: 'error',
          message: `Component ${component.name} not found in exports of ${resolvedPath}`,
          location: resolvedPath,
          suggestion: `Ensure the file exports a component named "${component.name}" or as default export`
        });
      }
    } else {
      // File doesn't exist at specified path, try to find it
      const possibleLocations = this.pathResolver.findComponentLocations(component.name);
      
      if (possibleLocations.length === 0) {
        issues.push({
          type: 'missing-component',
          severity: 'error',
          message: `Component ${component.name} not found at ${component.path}`,
          location: component.path,
          suggestion: `Create the component file or update the path in the system map`
        });
      } else if (possibleLocations.length === 1) {
        issues.push({
          type: 'missing-component',
          severity: 'warning',
          message: `Component ${component.name} not found at specified path, but found at: ${possibleLocations[0]}`,
          location: component.path,
          suggestion: `Update system map path to: ${this.pathResolver.getRelativeFromRoot(possibleLocations[0])}`
        });
      } else {
        issues.push({
          type: 'missing-component',
          severity: 'warning',
          message: `Component ${component.name} not found at specified path. Multiple matches found: ${possibleLocations.map(p => this.pathResolver.getRelativeFromRoot(p)).join(', ')}`,
          location: component.path,
          suggestion: 'Specify the correct path in the system map or ensure unique component naming'
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
   * Validate component dependencies
   */
  validateDependencies(component: ComponentDef, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();
    let checksPerformed = 0;

    if (!component.dependencies || component.dependencies.length === 0) {
      return {
        passed: true,
        issues: [],
        metrics: {
          checksPerformed: 0,
          executionTime: Date.now() - startTime
        }
      };
    }

    // Find the component in the codebase
    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    const componentInfo = codebase.components.get(resolvedPath);

    if (!componentInfo) {
      issues.push({
        type: 'missing-component',
        severity: 'error',
        message: `Cannot validate dependencies for ${component.name}: component not found in codebase`,
        location: component.path,
        suggestion: 'Ensure the component exists and is properly scanned'
      });
      return {
        passed: false,
        issues,
        metrics: {
          checksPerformed: 1,
          executionTime: Date.now() - startTime
        }
      };
    }

    // Check each declared dependency
    for (const dependencyName of component.dependencies) {
      checksPerformed++;
      
      // Check if the dependency is imported
      const isImported = componentInfo.imports.some(importInfo => 
        importInfo.specifiers.includes(dependencyName) ||
        (importInfo.isDefault && dependencyName === 'default')
      );

      if (!isImported) {
        // Try to find the dependency in the codebase
        const dependencyComponents = this.findComponentByName(codebase, dependencyName);
        
        if (dependencyComponents.length === 0) {
          issues.push({
            type: 'missing-component',
            severity: 'error',
            message: `Dependency ${dependencyName} declared in system map but not found in codebase`,
            location: `${component.path}:dependencies`,
            suggestion: `Create component ${dependencyName} or remove from dependencies`
          });
        } else {
          issues.push({
            type: 'missing-component',
            severity: 'warning',
            message: `Dependency ${dependencyName} exists but is not imported in ${component.name}`,
            location: component.path,
            suggestion: `Add import for ${dependencyName} or remove from system map dependencies`
          });
        }
      }
    }

    // Check for undeclared dependencies (imports not in system map)
    const actualDependencies = new Set<string>();
    for (const importInfo of componentInfo.imports) {
      // Skip external libraries and focus on local components
      if (importInfo.module.startsWith('./') || importInfo.module.startsWith('../')) {
        for (const specifier of importInfo.specifiers) {
          actualDependencies.add(specifier);
        }
      }
    }

    for (const actualDep of actualDependencies) {
      if (!component.dependencies?.includes(actualDep)) {
        issues.push({
          type: 'missing-component',
          severity: 'info',
          message: `Component ${component.name} imports ${actualDep} but it's not declared in system map dependencies`,
          location: component.path,
          suggestion: `Add ${actualDep} to system map dependencies or remove import if unused`
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        checksPerformed,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Validate component usage patterns
   */
  validateUsagePatterns(component: ComponentDef, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    // Find where this component is used
    const usageLocations = this.findComponentUsage(component.name, codebase);
    
    if (usageLocations.length === 0) {
      issues.push({
        type: 'missing-component',
        severity: 'warning',
        message: `Component ${component.name} is not used anywhere in the codebase`,
        location: component.path,
        suggestion: 'Consider removing unused component or add usage if needed'
      });
    }

    // Check for proper component type usage
    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    const componentInfo = codebase.components.get(resolvedPath);
    
    if (componentInfo && component.type) {
      if (componentInfo.type !== component.type) {
        issues.push({
          type: 'missing-component',
          severity: 'warning',
          message: `Component ${component.name} type mismatch: system map says "${component.type}", codebase indicates "${componentInfo.type}"`,
          location: component.path,
          suggestion: `Update system map type to "${componentInfo.type}" or verify component implementation`
        });
      }
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: {
        checksPerformed: 2,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Validate component props (if specified)
   */
  validateProps(component: ComponentDef, codebase: ParsedCodebase): ValidationResult {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();

    if (!component.props || Object.keys(component.props).length === 0) {
      return {
        passed: true,
        issues: [],
        metrics: {
          checksPerformed: 0,
          executionTime: Date.now() - startTime
        }
      };
    }

    // For now, this is a basic validation
    // In a full implementation, this would parse TypeScript interfaces
    // and validate prop types against actual component definitions
    
    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    if (!FileUtils.fileExists(resolvedPath)) {
      issues.push({
        type: 'missing-component',
        severity: 'error',
        message: `Cannot validate props for ${component.name}: component file not found`,
        location: component.path,
        suggestion: 'Ensure component file exists before validating props'
      });
    }

    // TODO: Implement TypeScript AST parsing for prop validation
    // This would require a TypeScript compiler API integration

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
   * Find component by name in codebase
   */
  private findComponentByName(codebase: ParsedCodebase, componentName: string): ComponentInfo[] {
    const matches: ComponentInfo[] = [];
    
    for (const componentInfo of codebase.components.values()) {
      if (componentInfo.exports.includes(componentName) || 
          (componentInfo.exports.includes('default') && 
           componentInfo.filePath.toLowerCase().includes(componentName.toLowerCase()))) {
        matches.push(componentInfo);
      }
    }
    
    return matches;
  }

  /**
   * Find where a component is used in the codebase
   */
  private findComponentUsage(componentName: string, codebase: ParsedCodebase): string[] {
    const usageLocations: string[] = [];
    
    for (const [filePath, componentInfo] of codebase.components) {
      // Check if any imports reference this component
      for (const importInfo of componentInfo.imports) {
        if (importInfo.specifiers.includes(componentName)) {
          usageLocations.push(filePath);
          break;
        }
      }
    }
    
    return usageLocations;
  }

  /**
   * Validate all components in a system map
   */
  async validateAllComponents(
    components: ComponentDef[], 
    codebase: ParsedCodebase,
    enabledChecks: {
      checkExistence: boolean;
      validateDependencies: boolean;
      checkUnusedComponents: boolean;
    }
  ): Promise<ValidationResult> {
    const allIssues: ValidationIssue[] = [];
    const startTime = Date.now();
    let totalChecks = 0;

    for (const component of components) {
      if (enabledChecks.checkExistence) {
        const existsResult = this.validateExists(component, codebase);
        allIssues.push(...existsResult.issues);
        totalChecks += existsResult.metrics.checksPerformed;
      }

      if (enabledChecks.validateDependencies) {
        const depsResult = this.validateDependencies(component, codebase);
        allIssues.push(...depsResult.issues);
        totalChecks += depsResult.metrics.checksPerformed;
      }

      if (enabledChecks.checkUnusedComponents) {
        const usageResult = this.validateUsagePatterns(component, codebase);
        allIssues.push(...usageResult.issues);
        totalChecks += usageResult.metrics.checksPerformed;
      }
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
}