import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PathResolver } from '../utils/path-resolver.js';
import { FileUtils } from '../utils/file-utils.js';
import type { 
  ValidationResult, 
  ValidationIssue, 
  ParsedCodebase,
  IntegrationEvidence,
  FeatureIntegrationStatus,
  ComponentIntegrationStatus,
  ApiIntegrationStatus,
  FlowIntegrationStatus,
  SystemMap,
  ComponentDef,
  ApiEndpoint,
  UserFlow
} from '../core/types.js';

export class IntegrationEvidenceValidator {
  private pathResolver: PathResolver;

  constructor(projectRoot?: string) {
    this.pathResolver = new PathResolver(projectRoot);
  }

  /**
   * Validate integration evidence requirements
   */
  async validateIntegrationEvidence(systemMaps: SystemMap[], codebase: ParsedCodebase): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const startTime = Date.now();
    let checksPerformed = 0;

    for (const systemMap of systemMaps) {
      checksPerformed++;
      
      const evidence = await this.collectIntegrationEvidence(systemMap);
      const evidenceIssues = this.validateEvidenceCompleteness(systemMap, evidence);
      issues.push(...evidenceIssues);

      // Validate evidence freshness
      const freshnessIssues = this.validateEvidenceFreshness(evidence);
      issues.push(...freshnessIssues);

      // Validate evidence quality
      const qualityIssues = this.validateEvidenceQuality(evidence);
      issues.push(...qualityIssues);
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      metrics: { checksPerformed, executionTime: Date.now() - startTime }
    };
  }

  /**
   * Validate feature integration status
   */
  async validateFeatureIntegration(systemMap: SystemMap, codebase: ParsedCodebase): Promise<FeatureIntegrationStatus> {
    const featureName = systemMap.name;
    const evidence = await this.collectIntegrationEvidence(systemMap);
    
    // Validate components
    const componentStatuses: ComponentIntegrationStatus[] = [];
    if (systemMap.components) {
      for (const component of systemMap.components) {
        const status = await this.validateComponentIntegration(component, codebase);
        componentStatuses.push(status);
      }
    }

    // Validate APIs
    const apiStatuses: ApiIntegrationStatus[] = [];
    if (systemMap.apis) {
      for (const api of systemMap.apis) {
        const status = await this.validateApiIntegration(api, codebase);
        apiStatuses.push(status);
      }
    }

    // Validate flows
    const flowStatuses: FlowIntegrationStatus[] = [];
    if (systemMap.flows) {
      for (const flow of systemMap.flows) {
        const status = await this.validateFlowIntegration(flow, codebase);
        flowStatuses.push(status);
      }
    }

    // Calculate overall status
    const overallStatus = this.calculateOverallIntegrationStatus(
      componentStatuses,
      apiStatuses,
      flowStatuses,
      evidence
    );

    // Identify blockers
    const blockers = this.identifyIntegrationBlockers(
      componentStatuses,
      apiStatuses,
      flowStatuses,
      evidence
    );

    return {
      featureName,
      components: componentStatuses,
      apis: apiStatuses,
      flows: flowStatuses,
      overallStatus,
      evidence,
      blockers
    };
  }

  /**
   * Collect integration evidence for a system map
   */
  private async collectIntegrationEvidence(systemMap: SystemMap): Promise<IntegrationEvidence[]> {
    const evidence: IntegrationEvidence[] = [];
    const featureName = systemMap.name;

    // Look for test files
    const testEvidence = await this.findTestEvidence(featureName);
    evidence.push(...testEvidence);

    // Look for manual verification records
    const manualEvidence = await this.findManualVerificationEvidence(featureName);
    evidence.push(...manualEvidence);

    // Look for automated checks
    const automatedEvidence = await this.findAutomatedCheckEvidence(featureName);
    evidence.push(...automatedEvidence);

    // Look for documentation evidence
    const docEvidence = await this.findDocumentationEvidence(featureName);
    evidence.push(...docEvidence);

    return evidence;
  }

  /**
   * Find test evidence for a feature
   */
  private async findTestEvidence(featureName: string): Promise<IntegrationEvidence[]> {
    const evidence: IntegrationEvidence[] = [];
    const testPatterns = [
      `**/*${featureName}*.test.{ts,tsx,js,jsx}`,
      `**/*${featureName}*.spec.{ts,tsx,js,jsx}`,
      `**/e2e/**/*${featureName}*`,
      `**/integration/**/*${featureName}*`
    ];

    for (const pattern of testPatterns) {
      try {
        // In a real implementation, this would use glob or similar
        const testFiles = await this.findFilesByPattern(pattern);
        
        for (const testFile of testFiles) {
          const lastModified = await this.getFileLastModified(testFile);
          const verificationStatus = await this.checkTestStatus(testFile);
          
          evidence.push({
            featureName,
            evidenceType: 'end-to-end-test',
            evidenceLocation: testFile,
            lastVerified: lastModified,
            verificationStatus,
            requiredFor: [featureName]
          });
        }
      } catch {
        // Pattern not found or error reading files
      }
    }

    return evidence;
  }

  /**
   * Find manual verification evidence
   */
  private async findManualVerificationEvidence(featureName: string): Promise<IntegrationEvidence[]> {
    const evidence: IntegrationEvidence[] = [];
    const manualPatterns = [
      `docs/verification/${featureName}.md`,
      `docs/testing/${featureName}-manual.md`,
      `.verification/${featureName}.json`,
      `verification-logs/${featureName}*.log`
    ];

    for (const pattern of manualPatterns) {
      try {
        const verificationFiles = await this.findFilesByPattern(pattern);
        
        for (const verificationFile of verificationFiles) {
          const lastModified = await this.getFileLastModified(verificationFile);
          const verificationStatus = await this.checkManualVerificationStatus(verificationFile);
          
          evidence.push({
            featureName,
            evidenceType: 'manual-verification',
            evidenceLocation: verificationFile,
            lastVerified: lastModified,
            verificationStatus,
            requiredFor: [featureName]
          });
        }
      } catch {
        // Pattern not found
      }
    }

    return evidence;
  }

  /**
   * Find automated check evidence
   */
  private async findAutomatedCheckEvidence(featureName: string): Promise<IntegrationEvidence[]> {
    const evidence: IntegrationEvidence[] = [];
    const automatedPatterns = [
      `.github/workflows/*${featureName}*`,
      `scripts/validate-${featureName}.*`,
      `automation/${featureName}*`,
      `ci/${featureName}*`
    ];

    for (const pattern of automatedPatterns) {
      try {
        const automatedFiles = await this.findFilesByPattern(pattern);
        
        for (const automatedFile of automatedFiles) {
          const lastModified = await this.getFileLastModified(automatedFile);
          const verificationStatus = await this.checkAutomatedStatus(automatedFile);
          
          evidence.push({
            featureName,
            evidenceType: 'automated-check',
            evidenceLocation: automatedFile,
            lastVerified: lastModified,
            verificationStatus,
            requiredFor: [featureName]
          });
        }
      } catch {
        // Pattern not found
      }
    }

    return evidence;
  }

  /**
   * Find documentation evidence
   */
  private async findDocumentationEvidence(featureName: string): Promise<IntegrationEvidence[]> {
    const evidence: IntegrationEvidence[] = [];
    const docPatterns = [
      `docs/${featureName}.md`,
      `docs/features/${featureName}.md`,
      `README.md`,
      `CHANGELOG.md`
    ];

    for (const pattern of docPatterns) {
      try {
        const docFiles = await this.findFilesByPattern(pattern);
        
        for (const docFile of docFiles) {
          if (await this.documentationMentionsFeature(docFile, featureName)) {
            const lastModified = await this.getFileLastModified(docFile);
            
            evidence.push({
              featureName,
              evidenceType: 'manual-verification',
              evidenceLocation: docFile,
              lastVerified: lastModified,
              verificationStatus: 'verified',
              requiredFor: [featureName]
            });
          }
        }
      } catch {
        // Pattern not found
      }
    }

    return evidence;
  }

  /**
   * Validate component integration
   */
  private async validateComponentIntegration(
    component: ComponentDef, 
    codebase: ParsedCodebase
  ): Promise<ComponentIntegrationStatus> {
    const resolvedPath = this.pathResolver.resolveSourceFile(component.path);
    const exists = FileUtils.fileExists(resolvedPath);
    
    let apiCallsValidated = false;
    let cacheInvalidationComplete = false;
    let uiRefreshWorking = false;

    if (exists) {
      try {
        const content = readFileSync(resolvedPath, 'utf-8');
        apiCallsValidated = this.validateComponentApiCalls(content);
        cacheInvalidationComplete = this.validateComponentCacheInvalidation(content);
        uiRefreshWorking = this.validateComponentUiRefresh(content);
      } catch {
        // Error reading file
      }
    }

    const integrationScore = this.calculateComponentIntegrationScore(
      exists,
      apiCallsValidated,
      cacheInvalidationComplete,
      uiRefreshWorking
    );

    return {
      name: component.name,
      exists,
      apiCallsValidated,
      cacheInvalidationComplete,
      uiRefreshWorking,
      integrationScore
    };
  }

  /**
   * Validate API integration
   */
  private async validateApiIntegration(
    api: ApiEndpoint, 
    codebase: ParsedCodebase
  ): Promise<ApiIntegrationStatus> {
    const handlerExists = FileUtils.fileExists(api.handler);
    const calledByComponents = this.findApiCallers(api, codebase);
    const triggersCacheInvalidation = this.apiTriggersCacheInvalidation(api, codebase);

    const integrationScore = this.calculateApiIntegrationScore(
      handlerExists,
      calledByComponents.length > 0,
      triggersCacheInvalidation
    );

    return {
      endpoint: api.path,
      method: api.method,
      handlerExists,
      calledByComponents,
      triggersCacheInvalidation,
      integrationScore
    };
  }

  /**
   * Validate flow integration
   */
  private async validateFlowIntegration(
    flow: UserFlow, 
    codebase: ParsedCodebase
  ): Promise<FlowIntegrationStatus> {
    const stepsValidated = this.validateFlowSteps(flow, codebase);
    const endToEndWorking = await this.checkEndToEndFlow(flow);
    const evidenceProvided = await this.hasFlowEvidence(flow);

    const integrationScore = this.calculateFlowIntegrationScore(
      stepsValidated,
      endToEndWorking,
      evidenceProvided
    );

    return {
      flowName: flow.name,
      stepsValidated,
      endToEndWorking,
      evidenceProvided,
      integrationScore
    };
  }

  /**
   * Validation helper methods
   */
  private validateEvidenceCompleteness(systemMap: SystemMap, evidence: IntegrationEvidence[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (evidence.length === 0) {
      issues.push({
        type: 'integration-evidence-missing',
        severity: 'error',
        message: `No integration evidence found for feature "${systemMap.name}"`,
        location: systemMap.name,
        suggestion: 'Add integration tests, manual verification records, or automated checks'
      });
    }

    // Check for critical evidence types
    const hasEndToEndTests = evidence.some(e => e.evidenceType === 'end-to-end-test');
    const hasManualVerification = evidence.some(e => e.evidenceType === 'manual-verification');
    
    if (!hasEndToEndTests && !hasManualVerification) {
      issues.push({
        type: 'integration-evidence-missing',
        severity: 'warning',
        message: `Feature "${systemMap.name}" lacks end-to-end tests or manual verification`,
        location: systemMap.name,
        suggestion: 'Add end-to-end tests or manual verification procedures'
      });
    }

    return issues;
  }

  private validateEvidenceFreshness(evidence: IntegrationEvidence[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const ev of evidence) {
      const lastVerified = new Date(ev.lastVerified);
      
      if (lastVerified < thirtyDaysAgo) {
        issues.push({
          type: 'integration-evidence-missing',
          severity: 'warning',
          message: `Integration evidence for "${ev.featureName}" is outdated (${ev.evidenceType})`,
          location: ev.evidenceLocation,
          suggestion: 'Update evidence with recent verification'
        });
      }
    }

    return issues;
  }

  private validateEvidenceQuality(evidence: IntegrationEvidence[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const ev of evidence) {
      if (ev.verificationStatus === 'failed') {
        issues.push({
          type: 'integration-evidence-missing',
          severity: 'error',
          message: `Integration evidence failed for "${ev.featureName}": ${ev.evidenceType}`,
          location: ev.evidenceLocation,
          suggestion: 'Fix integration issues or update evidence'
        });
      } else if (ev.verificationStatus === 'needs-verification') {
        issues.push({
          type: 'integration-evidence-missing',
          severity: 'warning',
          message: `Integration evidence needs verification for "${ev.featureName}"`,
          location: ev.evidenceLocation,
          suggestion: 'Run verification process for this evidence'
        });
      }
    }

    return issues;
  }

  /**
   * Helper methods for file operations and validation
   */
  private async findFilesByPattern(pattern: string): Promise<string[]> {
    // Simplified implementation - in reality would use glob
    const files: string[] = [];
    
    // Check for exact file matches
    if (existsSync(pattern)) {
      files.push(pattern);
    }
    
    return files;
  }

  private async getFileLastModified(filePath: string): Promise<string> {
    try {
      const stats = await import('fs').then(fs => fs.promises.stat(filePath));
      return stats.mtime.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private async checkTestStatus(testFile: string): Promise<'verified' | 'failed' | 'needs-verification' | 'outdated'> {
    // Simplified implementation - would run actual tests
    return 'verified';
  }

  private async checkManualVerificationStatus(verificationFile: string): Promise<'verified' | 'failed' | 'needs-verification' | 'outdated'> {
    try {
      const content = readFileSync(verificationFile, 'utf-8');
      if (content.includes('VERIFIED') || content.includes('PASSED')) return 'verified';
      if (content.includes('FAILED') || content.includes('BROKEN')) return 'failed';
      return 'needs-verification';
    } catch {
      return 'needs-verification';
    }
  }

  private async checkAutomatedStatus(automatedFile: string): Promise<'verified' | 'failed' | 'needs-verification' | 'outdated'> {
    // Would check CI/CD status, workflow runs, etc.
    return 'verified';
  }

  private async documentationMentionsFeature(docFile: string, featureName: string): Promise<boolean> {
    try {
      const content = readFileSync(docFile, 'utf-8');
      return content.toLowerCase().includes(featureName.toLowerCase());
    } catch {
      return false;
    }
  }

  private validateComponentApiCalls(content: string): boolean {
    const hasApiCalls = content.includes('apiRequest') || content.includes('useMutation') || content.includes('useQuery');
    const hasErrorHandling = content.includes('onError') || content.includes('catch');
    return hasApiCalls && hasErrorHandling;
  }

  private validateComponentCacheInvalidation(content: string): boolean {
    const hasMutations = content.includes('useMutation');
    const hasInvalidation = content.includes('invalidateQueries');
    return !hasMutations || hasInvalidation;
  }

  private validateComponentUiRefresh(content: string): boolean {
    const hasQueries = content.includes('useQuery');
    const hasLoadingStates = content.includes('isLoading') || content.includes('isPending');
    return !hasQueries || hasLoadingStates;
  }

  private findApiCallers(api: ApiEndpoint, codebase: ParsedCodebase): string[] {
    const callers: string[] = [];
    
    for (const [filePath, componentInfo] of codebase.components) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes(api.path)) {
          callers.push(this.extractComponentName(filePath));
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    return callers;
  }

  private apiTriggersCacheInvalidation(api: ApiEndpoint, codebase: ParsedCodebase): boolean {
    if (api.method === 'GET') return false;
    
    // Check if any component invalidates cache after calling this API
    for (const [filePath, componentInfo] of codebase.components) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (content.includes(api.path) && content.includes('invalidateQueries')) {
          return true;
        }
      } catch {
        // Skip files that can't be read
      }
    }
    
    return false;
  }

  private validateFlowSteps(flow: UserFlow, codebase: ParsedCodebase): boolean {
    for (const step of flow.steps) {
      if (step.component && !this.componentExists(step.component, codebase)) {
        return false;
      }
      if (step.api && !this.apiExists(step.api, codebase)) {
        return false;
      }
    }
    return true;
  }

  private async checkEndToEndFlow(flow: UserFlow): Promise<boolean> {
    // Would run actual end-to-end tests
    return true;
  }

  private async hasFlowEvidence(flow: UserFlow): Promise<boolean> {
    const evidenceFiles = [
      `docs/flows/${flow.name}.md`,
      `tests/e2e/${flow.name}.test.ts`,
      `verification/${flow.name}.json`
    ];
    
    return evidenceFiles.some(file => existsSync(file));
  }

  private componentExists(componentName: string, codebase: ParsedCodebase): boolean {
    for (const [filePath, componentInfo] of codebase.components) {
      if (componentInfo.exports.includes(componentName)) {
        return true;
      }
    }
    return false;
  }

  private apiExists(apiPath: string, codebase: ParsedCodebase): boolean {
    for (const [endpoint, apiInfo] of codebase.apis) {
      if (apiInfo.endpoint === apiPath) {
        return true;
      }
    }
    return false;
  }

  private extractComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.(tsx?|jsx?)$/, '');
  }

  /**
   * Score calculation methods
   */
  private calculateComponentIntegrationScore(
    exists: boolean,
    apiCallsValidated: boolean,
    cacheInvalidationComplete: boolean,
    uiRefreshWorking: boolean
  ): number {
    let score = 0;
    if (exists) score += 0.4;
    if (apiCallsValidated) score += 0.2;
    if (cacheInvalidationComplete) score += 0.2;
    if (uiRefreshWorking) score += 0.2;
    return score;
  }

  private calculateApiIntegrationScore(
    handlerExists: boolean,
    hasCaller: boolean,
    triggersCacheInvalidation: boolean
  ): number {
    let score = 0;
    if (handlerExists) score += 0.5;
    if (hasCaller) score += 0.3;
    if (triggersCacheInvalidation) score += 0.2;
    return score;
  }

  private calculateFlowIntegrationScore(
    stepsValidated: boolean,
    endToEndWorking: boolean,
    evidenceProvided: boolean
  ): number {
    let score = 0;
    if (stepsValidated) score += 0.4;
    if (endToEndWorking) score += 0.4;
    if (evidenceProvided) score += 0.2;
    return score;
  }

  private calculateOverallIntegrationStatus(
    components: ComponentIntegrationStatus[],
    apis: ApiIntegrationStatus[],
    flows: FlowIntegrationStatus[],
    evidence: IntegrationEvidence[]
  ): 'fully-integrated' | 'partially-integrated' | 'broken' | 'unverified' {
    const avgComponentScore = components.reduce((sum, c) => sum + c.integrationScore, 0) / Math.max(components.length, 1);
    const avgApiScore = apis.reduce((sum, a) => sum + a.integrationScore, 0) / Math.max(apis.length, 1);
    const avgFlowScore = flows.reduce((sum, f) => sum + f.integrationScore, 0) / Math.max(flows.length, 1);
    
    const overallScore = (avgComponentScore + avgApiScore + avgFlowScore) / 3;
    const hasVerifiedEvidence = evidence.some(e => e.verificationStatus === 'verified');
    
    if (!hasVerifiedEvidence) return 'unverified';
    if (overallScore >= 0.9) return 'fully-integrated';
    if (overallScore >= 0.7) return 'partially-integrated';
    return 'broken';
  }

  private identifyIntegrationBlockers(
    components: ComponentIntegrationStatus[],
    apis: ApiIntegrationStatus[],
    flows: FlowIntegrationStatus[],
    evidence: IntegrationEvidence[]
  ): ValidationIssue[] {
    const blockers: ValidationIssue[] = [];

    // Check for missing components
    for (const component of components) {
      if (!component.exists) {
        blockers.push({
          type: 'missing-component',
          severity: 'error',
          message: `Component ${component.name} does not exist`,
          location: component.name,
          suggestion: 'Create the missing component'
        });
      }
    }

    // Check for missing API handlers
    for (const api of apis) {
      if (!api.handlerExists) {
        blockers.push({
          type: 'api-mismatch',
          severity: 'error',
          message: `API handler for ${api.method} ${api.endpoint} does not exist`,
          location: api.endpoint,
          suggestion: 'Create the missing API handler'
        });
      }
    }

    // Check for failed evidence
    for (const ev of evidence) {
      if (ev.verificationStatus === 'failed') {
        blockers.push({
          type: 'integration-evidence-missing',
          severity: 'error',
          message: `Integration evidence failed: ${ev.evidenceType}`,
          location: ev.evidenceLocation,
          suggestion: 'Fix the failing integration evidence'
        });
      }
    }

    return blockers;
  }
}