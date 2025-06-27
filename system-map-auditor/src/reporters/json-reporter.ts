import type { AuditResult, ValidationIssue, AuditMetrics } from '../core/types.js';

export interface JsonReport {
  metadata: {
    timestamp: string;
    version: string;
    totalFeatures: number;
    totalExecutionTime: number;
  };
  summary: {
    totalChecks: number;
    passedFeatures: number;
    failedFeatures: number;
    warningFeatures: number;
    totalIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
  };
  results: AuditResult[];
  recommendations: string[];
}

export class JsonReporter {
  /**
   * Generate JSON report for audit results
   */
  generateReport(results: AuditResult[]): JsonReport {
    const timestamp = new Date().toISOString();
    const summary = this.calculateSummary(results);
    const recommendations = this.generateRecommendations(results);

    return {
      metadata: {
        timestamp,
        version: '1.0.0',
        totalFeatures: results.length,
        totalExecutionTime: summary.totalExecutionTime
      },
      summary,
      results,
      recommendations
    };
  }

  /**
   * Generate JSON string with formatting
   */
  generateReportString(results: AuditResult[], pretty: boolean = true): string {
    const report = this.generateReport(results);
    return JSON.stringify(report, null, pretty ? 2 : 0);
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(results: AuditResult[]) {
    let totalChecks = 0;
    let passedFeatures = 0;
    let failedFeatures = 0;
    let warningFeatures = 0;
    let totalIssues = 0;
    let totalExecutionTime = 0;

    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {
      error: 0,
      warning: 0,
      info: 0
    };

    for (const result of results) {
      totalChecks += result.metrics.totalChecks;
      totalExecutionTime += result.metrics.executionTime;
      totalIssues += result.issues.length;

      // Count features by status
      switch (result.status) {
        case 'pass':
          passedFeatures++;
          break;
        case 'fail':
          failedFeatures++;
          break;
        case 'warning':
          warningFeatures++;
          break;
      }

      // Count issues by type and severity
      for (const issue of result.issues) {
        // Count by type
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
        
        // Count by severity
        issuesBySeverity[issue.severity]++;
      }
    }

    return {
      totalChecks,
      passedFeatures,
      failedFeatures,
      warningFeatures,
      totalIssues,
      totalExecutionTime,
      issuesByType,
      issuesBySeverity
    };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: AuditResult[]): string[] {
    const recommendations = new Set<string>();

    // Analyze common issues and generate recommendations
    for (const result of results) {
      for (const issue of result.issues) {
        switch (issue.type) {
          case 'missing-component':
            recommendations.add('Review component paths in system maps');
            recommendations.add('Ensure all components exist in the codebase');
            break;
          case 'api-mismatch':
            recommendations.add('Verify API endpoint implementations');
            recommendations.add('Update system maps to match actual API structure');
            break;
          case 'circular-dependency':
            recommendations.add('Resolve circular dependencies in system maps');
            break;
          case 'invalid-reference':
            recommendations.add('Fix invalid references in system maps');
            break;
          case 'file-not-found':
            recommendations.add('Check file paths and ensure referenced files exist');
            break;
          case 'flow-inconsistency':
            recommendations.add('Align user flows with actual component capabilities');
            break;
        }
      }
    }

    return Array.from(recommendations);
  }

  /**
   * Generate compact summary for quick analysis
   */
  generateSummary(results: AuditResult[]): object {
    const summary = this.calculateSummary(results);
    
    return {
      timestamp: new Date().toISOString(),
      features: {
        total: results.length,
        passed: summary.passedFeatures,
        failed: summary.failedFeatures,
        warnings: summary.warningFeatures
      },
      issues: {
        total: summary.totalIssues,
        errors: summary.issuesBySeverity.error,
        warnings: summary.issuesBySeverity.warning,
        info: summary.issuesBySeverity.info
      },
      performance: {
        totalChecks: summary.totalChecks,
        executionTime: summary.totalExecutionTime
      }
    };
  }

  /**
   * Extract issues only for integration with other tools
   */
  extractIssues(results: AuditResult[]): ValidationIssue[] {
    const allIssues: ValidationIssue[] = [];
    
    for (const result of results) {
      allIssues.push(...result.issues);
    }
    
    return allIssues;
  }

  /**
   * Generate metrics-only report
   */
  generateMetricsReport(results: AuditResult[]): AuditMetrics {
    const summary = this.calculateSummary(results);
    
    return {
      totalChecks: summary.totalChecks,
      passedChecks: summary.totalChecks - summary.totalIssues,
      warningChecks: summary.issuesBySeverity.warning,
      failedChecks: summary.issuesBySeverity.error,
      executionTime: summary.totalExecutionTime
    };
  }

  /**
   * Filter results by severity
   */
  filterBySeverity(results: AuditResult[], severity: 'error' | 'warning' | 'info'): AuditResult[] {
    return results.map(result => ({
      ...result,
      issues: result.issues.filter(issue => issue.severity === severity)
    })).filter(result => result.issues.length > 0);
  }

  /**
   * Filter results by issue type
   */
  filterByType(results: AuditResult[], type: string): AuditResult[] {
    return results.map(result => ({
      ...result,
      issues: result.issues.filter(issue => issue.type === type)
    })).filter(result => result.issues.length > 0);
  }

  /**
   * Generate diff-friendly format for CI/CD integration
   */
  generateCiReport(results: AuditResult[]): object {
    const summary = this.calculateSummary(results);
    const errors = this.extractIssues(results).filter(issue => issue.severity === 'error');
    
    return {
      success: errors.length === 0,
      summary: {
        features_audited: results.length,
        errors_found: summary.issuesBySeverity.error,
        warnings_found: summary.issuesBySeverity.warning,
        execution_time_ms: summary.totalExecutionTime
      },
      errors: errors.map(error => ({
        message: error.message,
        location: error.location,
        type: error.type,
        suggestion: error.suggestion
      })),
      exit_code: errors.length > 0 ? 1 : 0
    };
  }
}