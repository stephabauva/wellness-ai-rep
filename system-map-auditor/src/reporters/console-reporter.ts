import chalk from 'chalk';
import type { AuditResult, ValidationIssue, AuditMetrics } from '../core/types.js';

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
}