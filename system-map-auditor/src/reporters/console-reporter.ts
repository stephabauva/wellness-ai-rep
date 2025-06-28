import chalk from 'chalk';
import type { 
  AuditResult, 
  ValidationIssue, 
  AuditMetrics, 
  PerformanceMetrics,
  DetailedAuditReport,
  OptimizationSuggestion,
  FlowValidationResult,
  CircularDependency
} from '../core/types.js';

export class ConsoleReporter {
  private verbose: boolean;
  private showSuggestions: boolean;

  constructor(verbose: boolean = false, showSuggestions: boolean = true) {
    this.verbose = verbose;
    this.showSuggestions = showSuggestions;
  }

  /**
   * Generate console report for audit results
   */
  generateReport(results: AuditResult[]): string {
    const output: string[] = [];
    
    // Header
    output.push(chalk.bold.blue('🔍 System Map Auditor Report'));
    output.push(chalk.gray('='.repeat(50)));
    output.push('');

    // Summary statistics
    const summary = this.calculateSummary(results);
    output.push(this.formatSummary(summary));
    output.push('');

    // Individual feature results
    for (const result of results) {
      output.push(this.formatFeatureResult(result));
    }

    // Footer with recommendations
    if (summary.totalIssues > 0) {
      output.push('');
      output.push(chalk.bold.yellow('📋 Recommendations:'));
      output.push(this.generateRecommendations(results));
    }

    return output.join('\n');
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(results: AuditResult[]) {
    let totalChecks = 0;
    let totalIssues = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let passedFeatures = 0;
    let totalTime = 0;

    for (const result of results) {
      totalChecks += result.metrics.totalChecks;
      totalIssues += result.issues.length;
      totalTime += result.metrics.executionTime;
      
      if (result.status === 'pass') {
        passedFeatures++;
      }

      for (const issue of result.issues) {
        switch (issue.severity) {
          case 'error':
            errorCount++;
            break;
          case 'warning':
            warningCount++;
            break;
          case 'info':
            infoCount++;
            break;
        }
      }
    }

    return {
      totalFeatures: results.length,
      passedFeatures,
      totalChecks,
      totalIssues,
      errorCount,
      warningCount,
      infoCount,
      totalTime
    };
  }

  /**
   * Format summary section
   */
  private formatSummary(summary: any): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold('📊 Summary:'));
    lines.push(`   Features audited: ${summary.totalFeatures}`);
    lines.push(`   Features passed:  ${chalk.green(summary.passedFeatures)} / ${summary.totalFeatures}`);
    lines.push(`   Total checks:     ${summary.totalChecks}`);
    lines.push(`   Execution time:   ${summary.totalTime}ms`);
    lines.push('');
    
    if (summary.totalIssues > 0) {
      lines.push(chalk.bold('🚨 Issues found:'));
      if (summary.errorCount > 0) {
        lines.push(`   ${chalk.red('●')} Errors:   ${chalk.red(summary.errorCount)}`);
      }
      if (summary.warningCount > 0) {
        lines.push(`   ${chalk.yellow('●')} Warnings: ${chalk.yellow(summary.warningCount)}`);
      }
      if (summary.infoCount > 0) {
        lines.push(`   ${chalk.blue('●')} Info:     ${chalk.blue(summary.infoCount)}`);
      }
    } else {
      lines.push(chalk.green('✅ No issues found!'));
    }

    return lines.join('\n');
  }

  /**
   * Format individual feature result
   */
  private formatFeatureResult(result: AuditResult): string {
    const lines: string[] = [];
    
    // Feature header
    const statusIcon = this.getStatusIcon(result.status);
    const statusColor = this.getStatusColor(result.status);
    
    lines.push(chalk.bold(`${statusIcon} Feature: ${result.feature}`));
    lines.push(`   Status: ${statusColor(result.status.toUpperCase())}`);
    lines.push(`   Checks: ${result.metrics.totalChecks} (${result.metrics.executionTime}ms)`);
    
    if (result.issues.length > 0) {
      lines.push(`   Issues: ${result.issues.length}`);
      lines.push('');
      
      // Group issues by severity
      const grouped = this.groupIssuesBySeverity(result.issues);
      
      for (const [severity, issues] of Object.entries(grouped)) {
        if (issues.length === 0) continue;
        
        const severityColor = this.getSeverityColor(severity as any);
        lines.push(`   ${severityColor('■')} ${severity.toUpperCase()} (${issues.length}):`);
        
        for (const issue of issues) {
          lines.push(`     • ${issue.message}`);
          if (this.verbose) {
            lines.push(`       Location: ${chalk.gray(issue.location)}`);
          }
          if (this.showSuggestions && issue.suggestion) {
            lines.push(`       ${chalk.cyan('💡 ' + issue.suggestion)}`);
          }
        }
        lines.push('');
      }
    }
    
    lines.push(chalk.gray('-'.repeat(40)));
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Get status icon for feature result
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '❓';
    }
  }

  /**
   * Get color function for status
   */
  private getStatusColor(status: string) {
    switch (status) {
      case 'pass':
        return chalk.green;
      case 'fail':
        return chalk.red;
      case 'warning':
        return chalk.yellow;
      default:
        return chalk.gray;
    }
  }

  /**
   * Get color function for severity
   */
  private getSeverityColor(severity: 'error' | 'warning' | 'info') {
    switch (severity) {
      case 'error':
        return chalk.red;
      case 'warning':
        return chalk.yellow;
      case 'info':
        return chalk.blue;
      default:
        return chalk.gray;
    }
  }

  /**
   * Group issues by severity
   */
  private groupIssuesBySeverity(issues: ValidationIssue[]) {
    return issues.reduce((groups, issue) => {
      const severity = issue.severity;
      if (!groups[severity]) {
        groups[severity] = [];
      }
      groups[severity].push(issue);
      return groups;
    }, {} as Record<string, ValidationIssue[]>);
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: AuditResult[]): string {
    const lines: string[] = [];
    const recommendations = new Set<string>();

    // Analyze common issues and generate recommendations
    for (const result of results) {
      for (const issue of result.issues) {
        if (issue.type === 'missing-component') {
          recommendations.add('• Review component paths in system maps');
          recommendations.add('• Ensure all components exist in the codebase');
        }
        if (issue.type === 'api-mismatch') {
          recommendations.add('• Verify API endpoint implementations');
          recommendations.add('• Update system maps to match actual API structure');
        }
        if (issue.type === 'circular-dependency') {
          recommendations.add('• Resolve circular dependencies in system maps');
        }
        if (issue.type === 'invalid-reference') {
          recommendations.add('• Fix invalid references in system maps');
        }
      }
    }

    if (recommendations.size === 0) {
      lines.push('• All validations passed successfully!');
    } else {
      lines.push(...Array.from(recommendations));
    }

    return lines.join('\n');
  }

  /**
   * Format a single issue for quick display
   */
  formatIssue(issue: ValidationIssue): string {
    const severityColor = this.getSeverityColor(issue.severity);
    const lines: string[] = [];
    
    lines.push(`${severityColor('●')} ${issue.message}`);
    if (this.verbose) {
      lines.push(`  Location: ${chalk.gray(issue.location)}`);
      lines.push(`  Type: ${chalk.gray(issue.type)}`);
    }
    if (this.showSuggestions && issue.suggestion) {
      lines.push(`  ${chalk.cyan('💡 ' + issue.suggestion)}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Format metrics for display
   */
  formatMetrics(metrics: AuditMetrics): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold('📈 Metrics:'));
    lines.push(`   Total checks: ${metrics.totalChecks}`);
    lines.push(`   Passed: ${chalk.green(metrics.passedChecks)}`);
    lines.push(`   Warnings: ${chalk.yellow(metrics.warningChecks)}`);
    lines.push(`   Failed: ${chalk.red(metrics.failedChecks)}`);
    lines.push(`   Execution time: ${metrics.executionTime}ms`);
    
    return lines.join('\n');
  }

  /**
   * Set reporting options
   */
  setOptions(verbose: boolean, showSuggestions: boolean): void {
    this.verbose = verbose;
    this.showSuggestions = showSuggestions;
  }

  // Phase 2 Enhanced Reporting Methods

  /**
   * Render detailed audit summary with performance metrics
   */
  renderSummary(results: AuditResult[]): string {
    const lines: string[] = [];
    const summary = this.calculateSummary(results);
    
    lines.push(chalk.bold.cyan('🔍 SYSTEM MAP AUDIT SUMMARY'));
    lines.push(chalk.gray('='.repeat(60)));
    lines.push('');
    
    // Feature summary
    lines.push(chalk.bold('📊 Feature Analysis:'));
    lines.push(`   Total Features:     ${summary.totalFeatures}`);
    lines.push(`   Passed:            ${chalk.green('✓')} ${summary.passedFeatures}`);
    lines.push(`   Failed:            ${chalk.red('✗')} ${summary.totalFeatures - summary.passedFeatures}`);
    lines.push(`   Success Rate:       ${this.calculateSuccessRate(summary)}%`);
    lines.push('');
    
    // Issue breakdown
    if (summary.totalIssues > 0) {
      lines.push(chalk.bold('🚨 Issue Breakdown:'));
      lines.push(`   Critical Errors:   ${chalk.red(summary.errorCount)}`);
      lines.push(`   Warnings:          ${chalk.yellow(summary.warningCount)}`);
      lines.push(`   Information:       ${chalk.blue(summary.infoCount)}`);
      lines.push(`   Total Issues:      ${summary.totalIssues}`);
    } else {
      lines.push(chalk.green.bold('✅ No Issues Found!'));
    }
    
    lines.push('');
    lines.push(chalk.bold('⚡ Performance:'));
    lines.push(`   Total Checks:      ${summary.totalChecks}`);
    lines.push(`   Execution Time:    ${summary.totalTime}ms`);
    lines.push(`   Avg per Feature:   ${Math.round(summary.totalTime / summary.totalFeatures)}ms`);
    
    return lines.join('\n');
  }

  /**
   * Render detailed errors with enhanced formatting
   */
  renderDetailedErrors(results: AuditResult[]): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.red('🔍 DETAILED ERROR ANALYSIS'));
    lines.push(chalk.gray('='.repeat(60)));
    lines.push('');
    
    let errorCount = 0;
    
    for (const result of results) {
      const errors = result.issues.filter(issue => issue.severity === 'error');
      if (errors.length === 0) continue;
      
      lines.push(chalk.bold(`📋 Feature: ${result.feature}`));
      lines.push(chalk.gray('-'.repeat(40)));
      
      for (const error of errors) {
        errorCount++;
        lines.push(`${chalk.red('●')} Error #${errorCount}: ${error.message}`);
        lines.push(`   ${chalk.gray('Type:')} ${error.type}`);
        lines.push(`   ${chalk.gray('Location:')} ${error.location}`);
        
        if (error.suggestion) {
          lines.push(`   ${chalk.cyan('💡 Solution:')} ${error.suggestion}`);
        }
        
        if (error.metadata) {
          lines.push(`   ${chalk.gray('Details:')} ${JSON.stringify(error.metadata, null, 2)}`);
        }
        
        lines.push('');
      }
    }
    
    if (errorCount === 0) {
      lines.push(chalk.green('✅ No errors found in any features!'));
    }
    
    return lines.join('\n');
  }

  /**
   * Render progressive output during audit execution
   */
  renderProgressiveOutput(feature: string, status: string): string {
    const statusIcon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
    const statusColor = status === 'pass' ? chalk.green : status === 'fail' ? chalk.red : chalk.yellow;
    
    return `${statusColor(statusIcon)} ${feature} - ${statusColor(status)}`;
  }

  /**
   * Render performance metrics with detailed breakdown
   */
  renderPerformanceMetrics(metrics: PerformanceMetrics): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.magenta('⚡ PERFORMANCE ANALYSIS'));
    lines.push(chalk.gray('='.repeat(60)));
    lines.push('');
    
    // Bundle Size Analysis
    lines.push(chalk.bold('📦 Bundle Size Metrics:'));
    lines.push(`   Total Size:        ${this.formatBytes(metrics.bundleSize.totalSize)}`);
    lines.push(`   Unused Code:       ${this.formatBytes(metrics.bundleSize.unusedCode)}`);
    lines.push(`   Efficiency:        ${this.calculateEfficiency(metrics.bundleSize)}%`);
    lines.push('');
    
    // Top Heavy Components
    if (metrics.bundleSize.largestComponents.length > 0) {
      lines.push(chalk.bold('🏋️ Largest Components:'));
      metrics.bundleSize.largestComponents.slice(0, 5).forEach((comp, index) => {
        lines.push(`   ${index + 1}. ${comp.component}: ${this.formatBytes(comp.size)}`);
      });
      lines.push('');
    }
    
    // Loading Metrics
    lines.push(chalk.bold('🚀 Loading Performance:'));
    lines.push(`   Critical Path:     ${metrics.loadingMetrics.criticalPath.length} steps`);
    lines.push(`   Loading Time:      ${metrics.loadingMetrics.loadingTime}ms`);
    lines.push(`   Lazy Loadable:     ${metrics.loadingMetrics.lazyLoadableComponents.length} components`);
    lines.push(`   Preload Candidates: ${metrics.loadingMetrics.preloadCandidates.length} components`);
    lines.push('');
    
    // Complexity Metrics
    lines.push(chalk.bold('🧮 Complexity Analysis:'));
    lines.push(`   Cognitive Complexity:   ${metrics.complexityMetrics.cognitiveComplexity}`);
    lines.push(`   Cyclomatic Complexity:  ${metrics.complexityMetrics.cyclomaticComplexity}`);
    lines.push(`   Maintainability Index:  ${metrics.complexityMetrics.maintainabilityIndex}/100`);
    lines.push(`   Technical Debt Score:   ${metrics.complexityMetrics.technicalDebt}`);
    
    return lines.join('\n');
  }

  /**
   * Render flow validation results
   */
  renderFlowValidation(flowResults: FlowValidationResult[]): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.blue('🔄 FLOW VALIDATION RESULTS'));
    lines.push(chalk.gray('='.repeat(60)));
    lines.push('');
    
    for (const flowResult of flowResults) {
      const statusIcon = flowResult.valid ? '✓' : '✗';
      const statusColor = flowResult.valid ? chalk.green : chalk.red;
      
      lines.push(`${statusColor(statusIcon)} Flow: ${flowResult.flowName}`);
      lines.push(`   Steps: ${flowResult.stepResults.length}`);
      lines.push(`   Valid: ${flowResult.stepResults.filter(s => s.valid).length}/${flowResult.stepResults.length}`);
      
      if (!flowResult.valid) {
        lines.push(`   Issues: ${flowResult.issues.length}`);
        for (const issue of flowResult.issues) {
          lines.push(`     • ${issue.message}`);
        }
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Render circular dependency analysis
   */
  renderCircularDependencies(circularDeps: CircularDependency[]): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.red('🔄 CIRCULAR DEPENDENCY ANALYSIS'));
    lines.push(chalk.gray('='.repeat(60)));
    lines.push('');
    
    if (circularDeps.length === 0) {
      lines.push(chalk.green('✅ No circular dependencies detected!'));
      return lines.join('\n');
    }
    
    lines.push(`Found ${circularDeps.length} circular dependencies:`);
    lines.push('');
    
    circularDeps.forEach((circular, index) => {
      const severityColor = circular.severity === 'error' ? chalk.red : chalk.yellow;
      lines.push(`${index + 1}. ${severityColor(circular.severity.toUpperCase())}: ${circular.type}`);
      lines.push(`   Path: ${circular.path.join(' → ')}`);
      if (circular.suggestion) {
        lines.push(`   ${chalk.cyan('💡 Fix:')} ${circular.suggestion}`);
      }
      lines.push('');
    });
    
    return lines.join('\n');
  }

  /**
   * Render optimization suggestions
   */
  renderOptimizationSuggestions(suggestions: OptimizationSuggestion[]): string {
    const lines: string[] = [];
    
    lines.push(chalk.bold.green('💡 OPTIMIZATION SUGGESTIONS'));
    lines.push(chalk.gray('='.repeat(60)));
    lines.push('');
    
    if (suggestions.length === 0) {
      lines.push('No optimization suggestions at this time.');
      return lines.join('\n');
    }
    
    // Group by impact level
    const grouped = this.groupSuggestionsByImpact(suggestions);
    
    for (const [impact, impactSuggestions] of Object.entries(grouped)) {
      if (impactSuggestions.length === 0) continue;
      
      const impactColor = impact === 'high' ? chalk.red : impact === 'medium' ? chalk.yellow : chalk.blue;
      lines.push(impactColor.bold(`${impact.toUpperCase()} IMPACT (${impactSuggestions.length}):`));
      
      impactSuggestions.forEach((suggestion, index) => {
        const effortIcon = suggestion.effort === 'high' ? '🔴' : suggestion.effort === 'medium' ? '🟡' : '🟢';
        lines.push(`   ${index + 1}. ${effortIcon} ${suggestion.description}`);
        lines.push(`      Target: ${suggestion.target}`);
        lines.push(`      Type: ${suggestion.type}`);
        lines.push(`      Effort: ${suggestion.effort}`);
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }

  // Helper methods for Phase 2 features

  private calculateSuccessRate(summary: any): number {
    if (summary.totalFeatures === 0) return 100;
    return Math.round((summary.passedFeatures / summary.totalFeatures) * 100);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private calculateEfficiency(bundleMetrics: any): number {
    if (bundleMetrics.totalSize === 0) return 100;
    const efficiency = ((bundleMetrics.totalSize - bundleMetrics.unusedCode) / bundleMetrics.totalSize) * 100;
    return Math.round(efficiency);
  }

  private groupSuggestionsByImpact(suggestions: OptimizationSuggestion[]): Record<string, OptimizationSuggestion[]> {
    return suggestions.reduce((groups, suggestion) => {
      const impact = suggestion.impact;
      if (!groups[impact]) {
        groups[impact] = [];
      }
      groups[impact].push(suggestion);
      return groups;
    }, {} as Record<string, OptimizationSuggestion[]>);
  }
}