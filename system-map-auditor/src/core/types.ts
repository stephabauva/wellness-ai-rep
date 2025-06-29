export interface AuditResult {
  feature: string;
  status: 'pass' | 'fail' | 'warning';
  issues: ValidationIssue[];
  metrics: AuditMetrics;
}

export interface ValidationIssue {
  type: 'missing-component' | 'api-mismatch' | 'circular-dependency' | 'flow-inconsistency' | 'invalid-reference' | 'file-not-found' | 'cross-reference-error' | 'integration-point-error' | 'performance-issue' | 'architecture-violation' | 'missing-system-map' | 'cache-invalidation-missing' | 'ui-refresh-missing' | 'api-call-tracing' | 'integration-evidence-missing' | 'cache-key-inconsistency' | 'broken-feature-status' | 'missing-component-definition' | 'handler-file-mismatch' | 'incomplete-cache-chain';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location: string;
  suggestion?: string;
  metadata?: Record<string, any>;
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

// Base system map interface that can handle all variations
export interface SystemMap {
  name?: string;
  appName?: string; // for root.map.json
  version?: string;
  description?: string;
  lastUpdated?: string;
  
  // Standard format
  components?: ComponentDef[];
  apis?: ApiEndpoint[];
  flows?: UserFlow[];
  dependencies?: string[] | DependencyDef[];
  references?: SystemMapReference[];
  _metadata?: FeatureMetadata;
  
  // Custom format support (metrics-management style)
  tableOfContents?: TableOfContents;
  integrationStatus?: IntegrationStatus;
  featureGroups?: FeatureGroups;
  apiEndpoints?: ApiEndpointMap;
  
  // Root format support
  domains?: DomainsMap;
  globalComponents?: ComponentMap;
  architecture?: ArchitectureInfo;
}

export interface TableOfContents {
  [groupName: string]: {
    features?: string[];
    components?: string[];
    endpoints?: string[];
  };
}

export interface IntegrationStatus {
  [featureName: string]: {
    status: 'active' | 'partial' | 'planned' | 'broken';
    lastVerified: string;
    knownIssues: string[];
  };
}

export interface FeatureGroups {
  [groupName: string]: {
    description: string;
    features: {
      [featureName: string]: FeatureDefinition;
    };
  };
}

export interface FeatureDefinition {
  description: string;
  userFlow?: string[];
  systemFlow?: string[];
  components?: string[];
  apiIntegration?: ApiIntegration;
  cacheDependencies?: CacheDependencies;
  uiConsistencyValidation?: UiConsistencyValidation;
  logging?: SystemMapReference;
  performance?: SystemMapReference;
  tests?: string[];
}

export interface ApiIntegration {
  expectedEndpoints?: string[];
  actualEndpoints?: string[];
  integrationGaps?: string[];
  cacheDependencies?: CacheDependencies;
  uiConsistencyValidation?: UiConsistencyValidation;
}

export interface CacheDependencies {
  invalidates?: string[];
  refreshesComponents?: string[];
  missingInvalidations?: string[];
  triggerEvents?: string[];
}

export interface UiConsistencyValidation {
  tested: boolean;
  knownIssues?: string[];
}

export interface ApiEndpointMap {
  [endpoint: string]: {
    description: string;
    handlerFile?: string;
    handler?: string;
    requestBody?: string;
    response?: string;
    readsFrom?: string[];
    modifies?: string[];
    consumedBy?: string[];
    calledBy?: string[];
    requiresRefresh?: string[];
  };
}

export interface ComponentMap {
  [componentName: string]: {
    path: string;
    type?: string;
    description?: string;
    calls?: string[];
    uses?: string[];
    invalidates?: string[];
    dependsOn?: string[];
    refreshTrigger?: string;
    cachingStrategy?: string;
    criticalIssue?: string;
  };
}

export interface DomainsMap {
  [domainName: string]: {
    description: string;
    path: string;
    dependencies: string[];
  };
}

export interface ArchitectureInfo {
  frontend?: string;
  backend?: string;
  database?: string;
  ai?: string;
  testing?: string;
  microservices?: string[];
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
    cacheResults?: boolean;
    cacheDirectory?: string;
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
  name?: string;
  path?: string;
  filePath: string;
  exports: string[];
  imports: ImportInfo[];
  type: 'component' | 'hook' | 'service' | 'utility';
}

export interface ApiInfo {
  path?: string;
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

// Phase 2 Types - Flow Validation
export interface FlowValidationResult {
  flowName: string;
  valid: boolean;
  stepResults: FlowStepResult[];
  issues: ValidationIssue[];
}

export interface FlowStepResult {
  step: FlowStep;
  valid: boolean;
  componentExists: boolean;
  apiExists: boolean;
  capabilityMatch: boolean;
  issues: ValidationIssue[];
}

export interface ComponentCapability {
  name: string;
  actions: string[];
  apiCalls: string[];
  stateChanges: string[];
}

// Phase 2 Types - Dependency Analysis
export interface CircularDependency {
  path: string[];
  type: 'import' | 'api-call' | 'component-usage';
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface DependencyAnalysis {
  component: string;
  depth: number;
  dependencies: string[];
  dependents: string[];
  circularPaths: string[][];
  metrics: DependencyMetrics;
}

export interface DependencyMetrics {
  totalDependencies: number;
  directDependencies: number;
  maxDepth: number;
  circularCount: number;
  complexityScore: number;
}

export interface OptimizationSuggestion {
  type: 'reduce-dependencies' | 'break-circular' | 'lazy-load' | 'code-split';
  target: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

// Phase 2 Types - Performance Analysis
export interface PerformanceMetrics {
  bundleSize: BundleSizeMetrics;
  loadingMetrics: LoadingMetrics;
  complexityMetrics: ComplexityMetrics;
}

export interface BundleSizeMetrics {
  totalSize: number;
  componentSizes: Map<string, number>;
  largestComponents: Array<{component: string; size: number}>;
  unusedCode: number;
}

export interface LoadingMetrics {
  criticalPath: string[];
  loadingTime: number;
  lazyLoadableComponents: string[];
  preloadCandidates: string[];
}

export interface ComplexityMetrics {
  cognitiveComplexity: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
}

// Phase 2 Types - Cross-Reference Validation
export interface CrossReferenceResult {
  component: string;
  usageCount: number;
  features: string[];
  inconsistencies: ValidationIssue[];
  sharedUsagePattern: 'appropriate' | 'concerning' | 'problematic';
}

export interface IntegrationPoint {
  name: string;
  type: 'external-api' | 'third-party-service' | 'environment-variable' | 'configuration';
  dependencies: string[];
  verified: boolean;
  issues: ValidationIssue[];
}

// Phase 2 Types - Enhanced Reporting
export interface DetailedAuditReport {
  summary: AuditSummary;
  featureResults: FeatureAuditResult[];
  globalIssues: ValidationIssue[];
  performanceAnalysis: PerformanceMetrics;
  recommendations: OptimizationSuggestion[];
  metadata: ReportMetadata;
}

export interface AuditSummary {
  totalFeatures: number;
  passedFeatures: number;
  failedFeatures: number;
  warningFeatures: number;
  totalIssues: number;
  criticalIssues: number;
  overallScore: number;
}

export interface FeatureAuditResult {
  featureName: string;
  status: 'pass' | 'fail' | 'warning';
  componentValidation: ValidationResult;
  apiValidation: ValidationResult;
  flowValidation: FlowValidationResult[];
  crossReferenceValidation: CrossReferenceResult[];
  performanceMetrics: PerformanceMetrics;
  issues: ValidationIssue[];
}

export interface ReportMetadata {
  generatedAt: string;
  auditorVersion: string;
  projectPath: string;
  configurationUsed: Partial<AuditConfig>;
  executionTime: number;
}

// Enhanced Validation Types - Component-to-API Call Tracing
export interface ApiCallTrace {
  componentName: string;
  componentPath: string;
  apiCalls: ApiCallInfo[];
  cacheInvalidations: CacheInvalidationInfo[];
  uiRefreshPatterns: UiRefreshInfo[];
}

export interface ApiCallInfo {
  endpoint: string;
  method: string;
  lineNumber: number;
  functionName: string;
  isInMutation: boolean;
  hasErrorHandling: boolean;
  hasCacheInvalidation: boolean;
}

export interface CacheInvalidationInfo {
  queryKey: string;
  invalidationType: 'specific' | 'pattern' | 'all';
  lineNumber: number;
  relatedApiCall?: string;
  isImmediate: boolean;
}

export interface UiRefreshInfo {
  triggerType: 'query-invalidation' | 'refetch' | 'manual-update';
  affectedComponents: string[];
  isAutomatic: boolean;
  hasLoadingState: boolean;
}

// Cache Invalidation Chain Validation Types
export interface CacheInvalidationChain {
  startingAction: string;
  apiEndpoint: string;
  expectedInvalidations: string[];
  actualInvalidations: string[];
  missingInvalidations: string[];
  chainComplete: boolean;
  affectedComponents: string[];
}

export interface CacheConsistencyCheck {
  queryKey: string;
  expectedUpdaters: string[];
  actualUpdaters: string[];
  consistencyScore: number;
  issues: ValidationIssue[];
}

// UI Refresh Dependency Validation Types
export interface UiRefreshDependency {
  component: string;
  dependsOnQueries: string[];
  refreshTriggers: RefreshTrigger[];
  hasLoadingStates: boolean;
  hasErrorStates: boolean;
  refreshCompleteness: number;
}

export interface RefreshTrigger {
  type: 'automatic' | 'manual' | 'conditional';
  trigger: string;
  conditions?: string[];
  validated: boolean;
}

// Integration Evidence Requirements Types
export interface IntegrationEvidence {
  featureName: string;
  evidenceType: 'end-to-end-test' | 'manual-verification' | 'automated-check';
  evidenceLocation: string;
  lastVerified: string;
  verificationStatus: 'verified' | 'failed' | 'needs-verification' | 'outdated';
  requiredFor: string[];
}

export interface FeatureIntegrationStatus {
  featureName: string;
  components: ComponentIntegrationStatus[];
  apis: ApiIntegrationStatus[];
  flows: FlowIntegrationStatus[];
  overallStatus: 'fully-integrated' | 'partially-integrated' | 'broken' | 'unverified';
  evidence: IntegrationEvidence[];
  blockers: ValidationIssue[];
}

export interface ComponentIntegrationStatus {
  name: string;
  exists: boolean;
  apiCallsValidated: boolean;
  cacheInvalidationComplete: boolean;
  uiRefreshWorking: boolean;
  integrationScore: number;
}

export interface ApiIntegrationStatus {
  endpoint: string;
  method: string;
  handlerExists: boolean;
  calledByComponents: string[];
  triggersCacheInvalidation: boolean;
  integrationScore: number;
}

export interface FlowIntegrationStatus {
  flowName: string;
  stepsValidated: boolean;
  endToEndWorking: boolean;
  evidenceProvided: boolean;
  integrationScore: number;
}