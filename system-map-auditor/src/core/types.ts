export interface AuditResult {
  feature: string;
  status: 'pass' | 'fail' | 'warning';
  issues: ValidationIssue[];
  metrics: AuditMetrics;
}

export interface ValidationIssue {
  type: 'missing-component' | 'api-mismatch' | 'circular-dependency' | 'flow-inconsistency' | 'invalid-reference' | 'file-not-found';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: string;
  suggestion?: string;
}

export interface AuditMetrics {
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  executionTime: number;
}

export interface FeatureMetadata {
  featureName: string;
  featureGroup: string;
  parentFile: string;
  domain: string;
}

export interface SystemMap {
  name: string;
  version?: string;
  description?: string;
  components?: ComponentDef[];
  apis?: ApiEndpoint[];
  flows?: UserFlow[];
  dependencies?: DependencyDef[];
  references?: SystemMapReference[];
  _metadata?: FeatureMetadata;
}

export interface ComponentDef {
  name: string;
  path: string;
  type: 'component' | 'hook' | 'service' | 'utility';
  dependencies?: string[];
  props?: Record<string, any>;
  description?: string;
}

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  description?: string;
  requestSchema?: any;
  responseSchema?: any;
}

export interface UserFlow {
  name: string;
  steps: FlowStep[];
  description?: string;
}

export interface FlowStep {
  action: string;
  component?: string;
  api?: string;
  description?: string;
}

export interface DependencyDef {
  from: string;
  to: string;
  type: 'import' | 'api-call' | 'component-usage';
}

export interface SystemMapReference {
  $ref: string;
  description?: string;
}

export interface FeatureFile extends SystemMap {
  _metadata: FeatureMetadata;
  userFlow?: string[];
}

export interface AuditConfig {
  validation: {
    components: {
      checkExistence: boolean;
      validateDependencies: boolean;
      checkUnusedComponents: boolean;
    };
    apis: {
      checkHandlerFiles: boolean;
      validateSchemas: boolean;
      checkOrphanedEndpoints: boolean;
    };
    flows: {
      validateSteps: boolean;
      checkComponentCapabilities: boolean;
      validateApiCalls: boolean;
    };
    references: {
      resolveSystemMapRefs: boolean;
      validateFileReferences: boolean;
    };
  };
  scanning: {
    includePatterns: string[];
    excludePatterns: string[];
    fileExtensions: string[];
  };
  reporting: {
    format: 'console' | 'json' | 'markdown';
    verbose: boolean;
    showSuggestions: boolean;
  };
  performance: {
    maxExecutionTime: number;
    parallel: boolean;
    cacheEnabled: boolean;
  };
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  metrics: {
    checksPerformed: number;
    executionTime: number;
  };
}

export interface ParsedCodebase {
  components: Map<string, ComponentInfo>;
  apis: Map<string, ApiInfo>;
  dependencies: DependencyGraph;
}

export interface ComponentInfo {
  filePath: string;
  exports: string[];
  imports: ImportInfo[];
  type: 'component' | 'hook' | 'service' | 'utility';
}

export interface ApiInfo {
  endpoint: string;
  method: string;
  handlerFile: string;
  handlerFunction?: string;
}

export interface ImportInfo {
  module: string;
  specifiers: string[];
  isDefault: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  type: 'component' | 'api' | 'file';
  metadata: Record<string, any>;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'api-call' | 'component-usage';
  weight?: number;
}