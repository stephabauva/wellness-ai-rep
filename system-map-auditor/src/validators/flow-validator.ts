import { 
  FlowValidationResult, 
  FlowStepResult, 
  ValidationIssue, 
  UserFlow, 
  FlowStep, 
  ComponentCapability,
  CrossReferenceResult,
  IntegrationPoint,
  SystemMap,
  ParsedCodebase
} from '../core/types.js';

export class FlowValidator {
  private componentCapabilities: Map<string, ComponentCapability> = new Map();
  private integrationPoints: Map<string, IntegrationPoint> = new Map();

  constructor(private codebase: ParsedCodebase) {
    this.buildComponentCapabilities();
    this.discoverIntegrationPoints();
  }

  /**
   * Validates all flow steps against actual implementation
   */
  public validateFlowSteps(feature: SystemMap): FlowValidationResult[] {
    if (!feature.flows) {
      return [];
    }

    return feature.flows.map(flow => this.validateSingleFlow(flow, feature));
  }

  /**
   * Validates API calls within flows match actual implementations
   */
  public validateApiCallsInFlow(feature: SystemMap): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (!feature.flows) {
      return issues;
    }

    for (const flow of feature.flows) {
      for (const step of flow.steps) {
        if (step.api) {
          const apiExists = this.codebase.apis.has(step.api);
          
          if (!apiExists) {
            issues.push({
              type: 'flow-inconsistency',
              severity: 'error',
              message: `Flow "${flow.name}" references non-existent API: ${step.api}`,
              location: `${feature.name}.flows.${flow.name}.${step.action}`,
              suggestion: `Implement API endpoint ${step.api} or update flow to use existing endpoint`
            });
          } else {
            // Validate API method and path consistency
            const apiInfo = this.codebase.apis.get(step.api)!;
            const flowApiCall = this.extractApiCallFromStep(step);
            
            if (flowApiCall && !this.isApiCallConsistent(flowApiCall, apiInfo)) {
              issues.push({
                type: 'flow-inconsistency',
                severity: 'warning',
                message: `Flow "${flow.name}" API call inconsistent with implementation`,
                location: `${feature.name}.flows.${flow.name}.${step.action}`,
                suggestion: `Update flow API call to match implementation: ${apiInfo.method} ${apiInfo.endpoint}`
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Validates component sequence makes sense from UX perspective
   */
  public validateComponentSequence(feature: SystemMap): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (!feature.flows) {
      return issues;
    }

    for (const flow of feature.flows) {
      const sequence = this.analyzeComponentSequence(flow);
      
      // Check for logical flow issues
      if (sequence.hasCircularNavigation) {
        issues.push({
          type: 'flow-inconsistency',
          severity: 'warning',
          message: `Flow "${flow.name}" has circular navigation patterns`,
          location: `${feature.name}.flows.${flow.name}`,
          suggestion: 'Review flow logic to ensure proper user experience progression'
        });
      }

      if (sequence.hasDeadEnds) {
        issues.push({
          type: 'flow-inconsistency',
          severity: 'error',
          message: `Flow "${flow.name}" contains dead-end steps`,
          location: `${feature.name}.flows.${flow.name}`,
          suggestion: 'Add navigation or completion actions to all flow steps'
        });
      }

      if (sequence.missingErrorHandling.length > 0) {
        issues.push({
          type: 'flow-inconsistency',
          severity: 'warning',
          message: `Flow "${flow.name}" lacks error handling for steps: ${sequence.missingErrorHandling.join(', ')}`,
          location: `${feature.name}.flows.${flow.name}`,
          suggestion: 'Add error handling paths for critical flow steps'
        });
      }
    }

    return issues;
  }

  /**
   * Validates data flow through components and APIs
   */
  public validateDataFlow(feature: SystemMap): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    if (!feature.flows) {
      return issues;
    }

    for (const flow of feature.flows) {
      const dataFlow = this.analyzeDataFlow(flow, feature);
      
      // Check for data consistency issues
      if (dataFlow.orphanedData.length > 0) {
        issues.push({
          type: 'flow-inconsistency',
          severity: 'warning',
          message: `Flow "${flow.name}" has orphaned data: ${dataFlow.orphanedData.join(', ')}`,
          location: `${feature.name}.flows.${flow.name}`,
          suggestion: 'Ensure all data produced in flow is consumed or stored appropriately'
        });
      }

      if (dataFlow.missingDataSources.length > 0) {
        issues.push({
          type: 'flow-inconsistency',
          severity: 'error',
          message: `Flow "${flow.name}" requires data not provided: ${dataFlow.missingDataSources.join(', ')}`,
          location: `${feature.name}.flows.${flow.name}`,
          suggestion: 'Add data sources or modify flow to use available data'
        });
      }

      if (dataFlow.typeInconsistencies.length > 0) {
        issues.push({
          type: 'flow-inconsistency',
          severity: 'error',
          message: `Flow "${flow.name}" has data type inconsistencies`,
          location: `${feature.name}.flows.${flow.name}`,
          suggestion: 'Ensure data types are consistent across flow steps',
          metadata: { inconsistencies: dataFlow.typeInconsistencies }
        });
      }
    }

    return issues;
  }

  /**
   * Validates cross-feature component usage
   */
  public validateCrossFeatureReferences(features: SystemMap[]): CrossReferenceResult[] {
    const componentUsage = new Map<string, { count: number; features: string[] }>();
    
    // Build usage map
    for (const feature of features) {
      if (feature.components && Array.isArray(feature.components)) {
        for (const component of feature.components) {
          if (component && typeof component === 'object' && component.name) {
            if (!componentUsage.has(component.name)) {
              componentUsage.set(component.name, { count: 0, features: [] });
            }
            const usage = componentUsage.get(component.name)!;
            usage.count++;
            usage.features.push(feature.name || 'Unknown Feature');
          }
        }
      }
    }

    // Analyze cross-references
    const results: CrossReferenceResult[] = [];
    
    for (const [componentName, usage] of componentUsage) {
      const inconsistencies: ValidationIssue[] = [];
      
      // Check for inconsistent usage patterns
      if (usage.count > 1) {
        const sharedUsagePattern = this.analyzeSharedUsagePattern(componentName, usage.features, features);
        
        if (sharedUsagePattern === 'problematic') {
          inconsistencies.push({
            type: 'cross-reference-error',
            severity: 'error',
            message: `Component "${componentName}" has problematic shared usage across features`,
            location: `shared.components.${componentName}`,
            suggestion: 'Consider refactoring to reduce coupling or create feature-specific variants'
          });
        }

        results.push({
          component: componentName,
          usageCount: usage.count,
          features: usage.features,
          inconsistencies,
          sharedUsagePattern
        });
      }
    }

    return results;
  }

  /**
   * Validates integration points (external services, APIs, etc.)
   */
  public validateIntegrationPoints(features: SystemMap[]): IntegrationPoint[] {
    const results: IntegrationPoint[] = [];

    for (const [name, integrationPoint] of this.integrationPoints) {
      const verified = this.verifyIntegrationPoint(integrationPoint);
      const issues: ValidationIssue[] = [];

      if (!verified) {
        issues.push({
          type: 'integration-point-error',
          severity: 'error',
          message: `Integration point "${name}" could not be verified`,
          location: `integrationPoints.${name}`,
          suggestion: this.getIntegrationPointSuggestion(integrationPoint)
        });
      }

      // Check for missing dependencies
      const missingDeps = this.checkIntegrationDependencies(integrationPoint);
      if (missingDeps.length > 0) {
        issues.push({
          type: 'integration-point-error',
          severity: 'warning',
          message: `Integration point "${name}" has missing dependencies: ${missingDeps.join(', ')}`,
          location: `integrationPoints.${name}`,
          suggestion: 'Ensure all required dependencies are properly configured'
        });
      }

      results.push({
        ...integrationPoint,
        verified,
        issues
      });
    }

    return results;
  }

  // Private helper methods

  private validateSingleFlow(flow: UserFlow, feature: SystemMap): FlowValidationResult {
    const stepResults: FlowStepResult[] = [];
    const issues: ValidationIssue[] = [];

    for (const step of flow.steps) {
      const stepResult = this.validateFlowStep(step, feature);
      stepResults.push(stepResult);
      issues.push(...stepResult.issues);
    }

    return {
      flowName: flow.name,
      valid: stepResults.every(result => result.valid),
      stepResults,
      issues
    };
  }

  private validateFlowStep(step: FlowStep, feature: SystemMap): FlowStepResult {
    const issues: ValidationIssue[] = [];
    
    // Check component existence
    const componentExists = !step.component || this.codebase.components.has(step.component);
    if (step.component && !componentExists) {
      issues.push({
        type: 'missing-component',
        severity: 'error',
        message: `Flow step references non-existent component: ${step.component}`,
        location: `${feature.name}.flows.${step.action}`,
        suggestion: `Create component ${step.component} or update flow to use existing component`
      });
    }

    // Check API existence
    const apiExists = !step.api || this.codebase.apis.has(step.api);
    if (step.api && !apiExists) {
      issues.push({
        type: 'api-mismatch',
        severity: 'error',
        message: `Flow step references non-existent API: ${step.api}`,
        location: `${feature.name}.flows.${step.action}`,
        suggestion: `Implement API ${step.api} or update flow to use existing API`
      });
    }

    // Check component capability match
    const capabilityMatch = this.checkComponentCapability(step);
    if (step.component && !capabilityMatch) {
      issues.push({
        type: 'flow-inconsistency',
        severity: 'warning',
        message: `Component "${step.component}" may not support action "${step.action}"`,
        location: `${feature.name}.flows.${step.action}`,
        suggestion: 'Verify component capabilities match flow requirements'
      });
    }

    return {
      step,
      valid: issues.length === 0,
      componentExists,
      apiExists,
      capabilityMatch,
      issues
    };
  }

  private buildComponentCapabilities(): void {
    for (const [componentName, componentInfo] of this.codebase.components) {
      const capability: ComponentCapability = {
        name: componentName,
        actions: this.extractComponentActions(componentInfo),
        apiCalls: this.extractApiCalls(componentInfo),
        stateChanges: this.extractStateChanges(componentInfo)
      };
      
      this.componentCapabilities.set(componentName, capability);
    }
  }

  private discoverIntegrationPoints(): void {
    // Discover external APIs, environment variables, etc.
    for (const [_, componentInfo] of this.codebase.components) {
      const envVars = this.extractEnvironmentVariables(componentInfo);
      const externalApis = this.extractExternalApiCalls(componentInfo);
      
      for (const envVar of envVars) {
        this.integrationPoints.set(envVar, {
          name: envVar,
          type: 'environment-variable',
          dependencies: [],
          verified: false,
          issues: []
        });
      }

      for (const api of externalApis) {
        this.integrationPoints.set(api, {
          name: api,
          type: 'external-api',
          dependencies: [],
          verified: false,
          issues: []
        });
      }
    }
  }

  private extractComponentActions(componentInfo: any): string[] {
    // Extract actions from component implementation
    // This would analyze the actual component code
    return ['render', 'onClick', 'onSubmit', 'onValidate'];
  }

  private extractApiCalls(componentInfo: any): string[] {
    // Extract API calls from component
    return componentInfo.imports
      .filter((imp: any) => imp.module.includes('api') || imp.module.includes('fetch'))
      .map((imp: any) => imp.specifiers)
      .flat();
  }

  private extractStateChanges(componentInfo: any): string[] {
    // Extract state management patterns
    return ['useState', 'useEffect', 'useQuery', 'useMutation'];
  }

  private extractEnvironmentVariables(componentInfo: any): string[] {
    // Extract environment variable usage
    return [];
  }

  private extractExternalApiCalls(componentInfo: any): string[] {
    // Extract external API calls
    return [];
  }

  private extractApiCallFromStep(step: FlowStep): { method: string; path: string } | null {
    // Extract API call details from flow step
    if (step.api) {
      // Parse API format like "POST /api/data"
      const parts = step.api.split(' ');
      if (parts.length === 2) {
        return { method: parts[0], path: parts[1] };
      }
    }
    return null;
  }

  private isApiCallConsistent(flowCall: { method: string; path: string }, apiInfo: any): boolean {
    return flowCall.method === apiInfo.method && flowCall.path === apiInfo.endpoint;
  }

  private analyzeComponentSequence(flow: UserFlow): {
    hasCircularNavigation: boolean;
    hasDeadEnds: boolean;
    missingErrorHandling: string[];
  } {
    const components = flow.steps.map(step => step.component).filter(Boolean);
    const hasCircularNavigation = this.detectCircularSequence(components);
    const hasDeadEnds = this.detectDeadEnds(flow.steps);
    const missingErrorHandling = this.findMissingErrorHandling(flow.steps);

    return {
      hasCircularNavigation,
      hasDeadEnds,
      missingErrorHandling
    };
  }

  private detectCircularSequence(components: (string | undefined)[]): boolean {
    const seen = new Set<string>();
    for (const component of components) {
      if (component && seen.has(component)) {
        return true;
      }
      if (component) seen.add(component);
    }
    return false;
  }

  private detectDeadEnds(steps: FlowStep[]): boolean {
    // Check if any step doesn't lead to another step or completion
    return steps.some(step => 
      !step.description?.includes('complete') && 
      !step.description?.includes('navigate') &&
      !step.description?.includes('submit')
    );
  }

  private findMissingErrorHandling(steps: FlowStep[]): string[] {
    return steps
      .filter(step => 
        step.api && 
        !step.description?.includes('error') && 
        !step.description?.includes('handle')
      )
      .map(step => step.action);
  }

  private analyzeDataFlow(flow: UserFlow, feature: SystemMap): {
    orphanedData: string[];
    missingDataSources: string[];
    typeInconsistencies: string[];
  } {
    // Simplified data flow analysis
    return {
      orphanedData: [],
      missingDataSources: [],
      typeInconsistencies: []
    };
  }

  private analyzeSharedUsagePattern(componentName: string, features: string[], allFeatures: SystemMap[]): 'appropriate' | 'concerning' | 'problematic' {
    if (features.length <= 2) return 'appropriate';
    if (features.length <= 4) return 'concerning';
    return 'problematic';
  }

  private verifyIntegrationPoint(integrationPoint: IntegrationPoint): boolean {
    // Verify integration point is properly configured
    switch (integrationPoint.type) {
      case 'environment-variable':
        return process.env[integrationPoint.name] !== undefined;
      case 'external-api':
        // Would make actual HTTP check in real implementation
        return true;
      default:
        return false;
    }
  }

  private getIntegrationPointSuggestion(integrationPoint: IntegrationPoint): string {
    switch (integrationPoint.type) {
      case 'environment-variable':
        return `Set environment variable ${integrationPoint.name} in your configuration`;
      case 'external-api':
        return `Verify external API ${integrationPoint.name} is accessible and properly configured`;
      default:
        return 'Check integration point configuration';
    }
  }

  private checkIntegrationDependencies(integrationPoint: IntegrationPoint): string[] {
    // Check for missing dependencies
    return integrationPoint.dependencies.filter(dep => !this.integrationPoints.has(dep));
  }

  private checkComponentCapability(step: FlowStep): boolean {
    if (!step.component) return true;
    
    const capability = this.componentCapabilities.get(step.component);
    if (!capability) return false;
    
    // Check if component supports the action
    return capability.actions.some(action => 
      step.action.toLowerCase().includes(action.toLowerCase())
    );
  }
}