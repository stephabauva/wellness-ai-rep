#!/usr/bin/env node

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { SystemMapAuditor } from './core/auditor.js';

const program = new Command();

program
  .name('system-map-auditor')
  .description('A tool to maintain integrity and accuracy of system maps through automated validation')
  .version('1.0.0');

// Global options
program
  .option('-c, --config <path>', 'custom configuration file path')
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress non-error output')
  .option('--dry-run', 'show what would be done without making changes')
  .option('--show-config', 'display configuration and exit');

// Help command
program
  .command('help')
  .description('display help information')
  .action(() => {
    program.help();
  });

// Version command
program
  .command('version')
  .description('display version information')
  .action(() => {
    console.log('1.0.0');
  });

// Parse only command
program
  .command('parse-only')
  .description('parse system maps without validation')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const result = await auditor.parseOnly();
      
      if (!options.quiet) {
        if (result.success) {
          console.log('✅ System maps parsed successfully');
        } else {
          console.log('❌ System map parsing failed');
          for (const issue of result.issues) {
            console.log(`  ${issue.severity}: ${issue.message}`);
          }
        }
      }
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Parse failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Show configuration command
program
  .command('show-config')
  .description('display current configuration')
  .action(async () => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      console.log(auditor.showConfig());
    } catch (error) {
      console.error('Failed to load configuration:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Scan for maps command
program
  .command('scan-for-maps')
  .description('find all system map files in the project')
  .action(async () => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const maps = await auditor.scanForMaps();
      
      if (maps.length === 0) {
        console.log('No system map files found');
      } else {
        console.log(`Found ${maps.length} system map files:`);
        for (const mapPath of maps) {
          console.log(`  ${mapPath}`);
        }
      }
    } catch (error) {
      console.error('Scan failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Full audit command
program
  .command('full-audit')
  .description('run complete audit of all system maps')
  .option('-f, --format <type>', 'output format (console, json, markdown)', 'console')
  .option('-o, --output <file>', 'output file path')
  .option('--fail-fast', 'exit on first error')
  .option('--show-progress', 'show progress indicators')
  .option('--timing', 'show timing information')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      
      // Update configuration based on options
      if (program.opts().verbose) {
        auditor.updateConfig({
          reporting: { ...auditor.getConfig().reporting, verbose: true }
        });
      }
      
      if (options.showProgress) {
        console.log('🔍 Starting system map audit...');
      }
      
      const startTime = Date.now();
      const results = await auditor.runFullAudit();
      const endTime = Date.now();
      
      if (options.timing) {
        console.log(`Execution time: ${endTime - startTime}ms`);
      }
      
      // Check for early exit
      if (options.failFast && auditor.shouldFailCi(results)) {
        console.error('❌ Audit failed (fail-fast mode)');
        process.exit(1);
      }
      
      // Generate report
      let report: string;
      switch (options.format) {
        case 'json':
          report = auditor.generateJsonReport(results);
          break;
        case 'console':
        default:
          report = auditor.generateConsoleReport(results);
          break;
      }
      
      // Output report
      if (options.output) {
        writeFileSync(resolve(options.output), report);
        if (!program.opts().quiet) {
          console.log(`Report saved to: ${options.output}`);
        }
      } else {
        console.log(report);
      }
      
      // Exit with appropriate code
      const shouldFail = auditor.shouldFailCi(results);
      process.exit(shouldFail ? 1 : 0);
      
    } catch (error) {
      console.error('Audit failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Validate components command
program
  .command('validate-components')
  .description('validate only component definitions')
  .option('-f, --filter <pattern>', 'filter components by pattern')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      
      // Update config to only validate components
      auditor.updateConfig({
        validation: {
          ...auditor.getConfig().validation,
          apis: {
            checkHandlerFiles: false,
            validateSchemas: false,
            checkOrphanedEndpoints: false
          },
          flows: {
            validateSteps: false,
            checkComponentCapabilities: false,
            validateApiCalls: false
          }
        }
      });
      
      const results = await auditor.runFullAudit();
      
      if (!options.quiet) {
        console.log(auditor.generateConsoleReport(results));
      }
      
      process.exit(auditor.shouldFailCi(results) ? 1 : 0);
    } catch (error) {
      console.error('Component validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Validate APIs command
program
  .command('validate-apis')
  .description('validate only API endpoint definitions')
  .option('-f, --filter <pattern>', 'filter APIs by pattern')
  .option('--show-suggestions', 'show fix suggestions')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      
      // Update config to only validate APIs
      auditor.updateConfig({
        validation: {
          ...auditor.getConfig().validation,
          components: {
            checkExistence: false,
            validateDependencies: false,
            checkUnusedComponents: false
          },
          flows: {
            validateSteps: false,
            checkComponentCapabilities: false,
            validateApiCalls: false
          }
        }
      });
      
      if (options.showSuggestions) {
        auditor.updateConfig({
          reporting: { ...auditor.getConfig().reporting, showSuggestions: true }
        });
      }
      
      const results = await auditor.runFullAudit();
      
      if (!options.quiet) {
        console.log(auditor.generateConsoleReport(results));
      }
      
      process.exit(auditor.shouldFailCi(results) ? 1 : 0);
    } catch (error) {
      console.error('API validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Feature-specific audit command
program
  .command('audit-feature <feature-name>')
  .description('audit a specific feature by name')
  .option('-f, --format <type>', 'output format (console, json)', 'console')
  .action(async (featureName, options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const result = await auditor.auditFeature(featureName);
      
      if (!result) {
        console.error(`Feature "${featureName}" not found`);
        process.exit(1);
      }
      
      const results = [result];
      let report: string;
      
      switch (options.format) {
        case 'json':
          report = auditor.generateJsonReport(results);
          break;
        case 'console':
        default:
          report = auditor.generateConsoleReport(results);
          break;
      }
      
      console.log(report);
      process.exit(auditor.shouldFailCi(results) ? 1 : 0);
      
    } catch (error) {
      console.error('Feature audit failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Phase 2 Commands - Flow Validation
program
  .command('validate-flows')
  .description('validate user flows against actual implementation')
  .option('-f, --feature <name>', 'validate flows for specific feature only')
  .option('--show-flow-mapping', 'show component capability mapping')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateFlows(options.feature);
      
      if (!options.quiet) {
        console.log(auditor.generateFlowValidationReport(results));
      }
      
      const hasErrors = results.some(result => !result.valid);
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Flow validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate-cross-refs')
  .description('validate cross-feature component references')
  .option('--shared-only', 'validate only shared components')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateCrossReferences(options.sharedOnly);
      
      if (!options.quiet) {
        console.log(auditor.generateCrossReferenceReport(results));
      }
      
      const hasIssues = results.some(result => result.inconsistencies.length > 0);
      process.exit(hasIssues ? 1 : 0);
    } catch (error) {
      console.error('Cross-reference validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate-integration-points')
  .description('validate external integration points')
  .option('--verify-connections', 'actually test external connections')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateIntegrationPoints(options.verifyConnections);
      
      if (!options.quiet) {
        console.log(auditor.generateIntegrationPointReport(results));
      }
      
      const hasFailures = results.some(result => !result.verified);
      process.exit(hasFailures ? 1 : 0);
    } catch (error) {
      console.error('Integration point validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Phase 2 Commands - Dependency Analysis
program
  .command('detect-circular')
  .description('detect circular dependencies in system maps')
  .option('--visualize', 'generate dependency visualization')
  .option('-f, --format <type>', 'output format (console, json, markdown)', 'console')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const circularDeps = await auditor.detectCircularDependencies();
      
      if (!options.quiet) {
        let report: string;
        switch (options.format) {
          case 'json':
            report = JSON.stringify(circularDeps, null, 2);
            break;
          case 'markdown':
            report = auditor.generateCircularDependencyMarkdown(circularDeps);
            break;
          case 'console':
          default:
            report = auditor.generateCircularDependencyReport(circularDeps);
            break;
        }
        console.log(report);
      }
      
      const hasErrors = circularDeps.some(dep => dep.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Circular dependency detection failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('analyze-dependency-depth')
  .description('analyze dependency depth for components')
  .option('-c, --component <name>', 'analyze specific component')
  .option('--max-depth <number>', 'maximum depth threshold', '5')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const analysis = await auditor.analyzeDependencyDepth(options.component, parseInt(options.maxDepth));
      
      if (!options.quiet) {
        console.log(auditor.generateDependencyDepthReport(analysis));
      }
      
      const hasDeepDependencies = analysis.some(a => a.depth > parseInt(options.maxDepth));
      process.exit(hasDeepDependencies ? 1 : 0);
    } catch (error) {
      console.error('Dependency depth analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('analyze-performance')
  .description('analyze performance impact of dependencies')
  .option('--show-bundle-analysis', 'include bundle size analysis')
  .option('--show-loading-metrics', 'include loading performance metrics')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const metrics = await auditor.analyzePerformance();
      
      if (!options.quiet) {
        console.log(auditor.generatePerformanceReport(metrics));
      }
      
      // Exit with warning if performance is concerning
      const hasPerformanceIssues = metrics.complexityMetrics.technicalDebt > 50;
      process.exit(hasPerformanceIssues ? 1 : 0);
    } catch (error) {
      console.error('Performance analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('analyze-critical-paths')
  .description('analyze critical dependency paths')
  .option('--max-length <number>', 'maximum path length to report', '10')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const paths = await auditor.analyzeCriticalPaths(parseInt(options.maxLength));
      
      if (!options.quiet) {
        console.log(auditor.generateCriticalPathsReport(paths));
      }
      
      const hasLongPaths = paths.some(path => path.length > parseInt(options.maxLength));
      process.exit(hasLongPaths ? 1 : 0);
    } catch (error) {
      console.error('Critical path analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Phase 2 Commands - Enhanced Reporting
program
  .command('generate-detailed-report')
  .description('generate comprehensive detailed audit report')
  .option('-f, --format <type>', 'output format (markdown, json)', 'markdown')
  .option('-o, --output <file>', 'output file path')
  .option('--include-performance', 'include performance analysis')
  .option('--include-recommendations', 'include optimization recommendations')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const detailedReport = await auditor.generateDetailedReport({
        includePerformance: options.includePerformance,
        includeRecommendations: options.includeRecommendations
      });
      
      let report: string;
      switch (options.format) {
        case 'json':
          report = JSON.stringify(detailedReport, null, 2);
          break;
        case 'markdown':
        default:
          report = auditor.generateDetailedMarkdownReport(detailedReport);
          break;
      }
      
      if (options.output) {
        writeFileSync(resolve(options.output), report);
        console.log(`Detailed report saved to: ${options.output}`);
      } else {
        console.log(report);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Report generation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Enhanced Validation Commands - Component-to-API Call Tracing
program
  .command('validate-api-call-tracing')
  .description('validate component-to-API call tracing and relationships')
  .option('-c, --component <name>', 'validate specific component')
  .option('--check-cache-invalidation', 'verify cache invalidation patterns')
  .option('--check-error-handling', 'verify error handling patterns')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateApiCallTracing({
        component: options.component,
        checkCacheInvalidation: options.checkCacheInvalidation,
        checkErrorHandling: options.checkErrorHandling
      });
      
      if (!options.quiet) {
        console.log(auditor.generateApiTracingReport(results));
      }
      
      const hasErrors = results.some((r: any) => r.issues.some((i: any) => i.severity === 'error'));
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('API call tracing validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Enhanced Validation Commands - Cache Invalidation Chain Validation
program
  .command('validate-cache-dependencies')
  .description('validate cache invalidation dependencies across components')
  .option('--check-timing', 'verify invalidation timing in callbacks')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateCacheDependencies({
        checkTiming: options.checkTiming
      });
      
      if (!options.quiet) {
        console.log(auditor.generateCacheValidationReport(results));
      }
      
      const hasErrors = results.issues.some((i: any) => i.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Cache dependency validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate-cache-invalidation-chains')
  .description('validate complete cache invalidation chains for mutations')
  .option('--check-completeness', 'verify all expected invalidations are present')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateCacheInvalidationChains({
        checkCompleteness: options.checkCompleteness
      });
      
      if (!options.quiet) {
        console.log(auditor.generateInvalidationChainReport(results));
      }
      
      const hasErrors = results.issues.some((i: any) => i.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Cache invalidation chain validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate-query-key-consistency')
  .description('validate query key consistency across the codebase')
  .option('--check-orphans', 'check for orphaned invalidations')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateQueryKeyConsistency({
        checkOrphans: options.checkOrphans
      });
      
      if (!options.quiet) {
        console.log(auditor.generateQueryKeyConsistencyReport(results));
      }
      
      const hasErrors = results.issues.some((i: any) => i.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Query key consistency validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Enhanced Validation Commands - UI Refresh Dependency Validation
program
  .command('validate-ui-refresh-chains')
  .description('validate UI refresh chains and dependency patterns')
  .option('--check-loading-states', 'verify loading state patterns')
  .option('--check-error-states', 'verify error state patterns')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateUiRefreshChains({
        checkLoadingStates: options.checkLoadingStates,
        checkErrorStates: options.checkErrorStates
      });
      
      if (!options.quiet) {
        console.log(auditor.generateUiRefreshReport(results));
      }
      
      const hasErrors = results.issues.some((i: any) => i.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('UI refresh chain validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate-component-data-sync')
  .description('validate component data synchronization patterns')
  .option('--build-dependency-graph', 'build and analyze data flow dependency graph')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateComponentDataSync({
        buildDependencyGraph: options.buildDependencyGraph
      });
      
      if (!options.quiet) {
        console.log(auditor.generateDataSyncReport(results));
      }
      
      const hasErrors = results.issues.some((i: any) => i.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Component data sync validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate-ui-consistency')
  .description('validate UI consistency after data changes')
  .option('--check-optimistic-updates', 'verify optimistic update patterns')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateUiConsistency({
        checkOptimisticUpdates: options.checkOptimisticUpdates
      });
      
      if (!options.quiet) {
        console.log(auditor.generateUiConsistencyReport(results));
      }
      
      const hasErrors = results.issues.some((i: any) => i.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('UI consistency validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Enhanced Validation Commands - Integration Evidence Requirements
program
  .command('validate-integration-evidence')
  .description('validate integration evidence requirements for features')
  .option('-f, --feature <name>', 'validate specific feature')
  .option('--check-freshness', 'verify evidence freshness (within 30 days)')
  .option('--require-end-to-end', 'require end-to-end test evidence')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateIntegrationEvidence({
        feature: options.feature,
        checkFreshness: options.checkFreshness,
        requireEndToEnd: options.requireEndToEnd
      });
      
      if (!options.quiet) {
        console.log(auditor.generateIntegrationEvidenceReport(results));
      }
      
      const hasErrors = results.issues.some((i: any) => i.severity === 'error');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Integration evidence validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate-feature-integration-status')
  .description('validate complete feature integration status with evidence')
  .option('-f, --feature <name>', 'validate specific feature')
  .option('--generate-status-report', 'generate detailed status report')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const results = await auditor.validateFeatureIntegrationStatus({
        feature: options.feature,
        generateStatusReport: options.generateStatusReport
      });
      
      if (!options.quiet) {
        console.log(auditor.generateFeatureIntegrationReport(results));
      }
      
      const hasBrokenFeatures = results.some(r => r.overallStatus === 'broken');
      process.exit(hasBrokenFeatures ? 1 : 0);
    } catch (error) {
      console.error('Feature integration status validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Handle global --show-config option
if (process.argv.includes('--show-config')) {
  try {
    const auditor = new SystemMapAuditor();
    console.log(auditor.showConfig());
    process.exit(0);
  } catch (error) {
    console.error('Failed to load configuration:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Phase 3 Commands - CI/CD Integration
program
  .command('changed-features-only')
  .description('validate only features that have changed (Git-aware)')
  .option('--fail-fast', 'exit on first error')
  .option('--simulate-git-hook', 'simulate pre-commit hook behavior')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const changedFeatures = await auditor.getChangedFeatures();
      
      if (changedFeatures.length === 0) {
        if (!options.quiet) {
          console.log('No changed features detected');
        }
        process.exit(0);
      }
      
      if (!options.quiet) {
        console.log(`Validating ${changedFeatures.length} changed features:`);
        changedFeatures.forEach(feature => console.log(`  - ${feature}`));
      }
      
      const results = await auditor.validateChangedFeatures(changedFeatures);
      
      if (options.failFast && results.some(r => r.status === 'fail')) {
        console.error('❌ Validation failed (fail-fast mode)');
        process.exit(1);
      }
      
      if (!options.quiet) {
        console.log(auditor.generateChangedFeaturesReport(results));
      }
      
      const hasErrors = results.some(result => result.status === 'fail');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Changed features validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('incremental')
  .description('run incremental validation using cache')
  .option('--cache-dir <path>', 'custom cache directory', './audit-cache')
  .option('--force-refresh', 'ignore cache and force full validation')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      
      // Configure caching
      auditor.updateConfig({
        performance: {
          ...auditor.getConfig().performance,
          cacheResults: !options.forceRefresh,
          cacheDirectory: options.cacheDir
        }
      });
      
      const results = await auditor.runIncrementalValidation();
      
      if (!options.quiet) {
        console.log(auditor.generateIncrementalReport(results));
      }
      
      const hasErrors = results.validationResults.some(r => r.status === 'fail');
      process.exit(hasErrors ? 1 : 0);
    } catch (error) {
      console.error('Incremental validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Phase 3 Commands - Advanced Analysis
program
  .command('detect-dead-code')
  .description('detect unused components and orphaned resources')
  .option('--include-apis', 'include orphaned API endpoints')
  .option('--include-files', 'include unused files')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const deadCodeResults = await auditor.detectDeadCode({
        includeApis: options.includeApis,
        includeFiles: options.includeFiles
      });
      
      if (!options.quiet) {
        console.log(auditor.generateDeadCodeReport(deadCodeResults));
      }
      
      const hasDeadCode = deadCodeResults.unusedComponents.length > 0 || 
                         deadCodeResults.orphanedApis.length > 0;
      process.exit(hasDeadCode ? 1 : 0);
    } catch (error) {
      console.error('Dead code detection failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('detect-orphaned-apis')
  .description('detect API endpoints not referenced in system maps')
  .option('--suggest-cleanup', 'suggest cleanup actions')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const orphanedApis = await auditor.detectOrphanedApis();
      
      if (!options.quiet) {
        console.log(auditor.generateOrphanedApisReport(orphanedApis, {
          suggestCleanup: options.suggestCleanup
        }));
      }
      
      const hasOrphanedApis = orphanedApis.length > 0;
      process.exit(hasOrphanedApis ? 1 : 0);
    } catch (error) {
      console.error('Orphaned API detection failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('suggest-cleanup')
  .description('suggest cleanup actions for unused resources')
  .option('-f, --format <type>', 'output format (console, markdown)', 'console')
  .option('--dry-run', 'show what would be cleaned up without making changes')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const cleanupSuggestions = await auditor.generateCleanupSuggestions();
      
      let report: string;
      switch (options.format) {
        case 'markdown':
          report = auditor.generateCleanupMarkdownReport(cleanupSuggestions);
          break;
        case 'console':
        default:
          report = auditor.generateCleanupConsoleReport(cleanupSuggestions);
          break;
      }
      
      console.log(report);
      
      if (options.dryRun && !program.opts().quiet) {
        console.log('\n📝 This was a dry run. No changes were made.');
      }
      
      const hasCleanupActions = cleanupSuggestions.actions.length > 0;
      process.exit(hasCleanupActions ? 0 : 1); // Exit 0 if cleanup suggestions found
    } catch (error) {
      console.error('Cleanup suggestion failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Phase 3 Commands - Completeness Analysis
program
  .command('analyze-completeness')
  .description('analyze system map completeness and coverage')
  .option('--min-coverage <percentage>', 'minimum coverage threshold', '80')
  .option('--show-missing', 'show missing components and APIs')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const completeness = await auditor.analyzeCompleteness();
      
      if (!options.quiet) {
        console.log(auditor.generateCompletenessReport(completeness, {
          showMissing: options.showMissing
        }));
      }
      
      const coverageThreshold = parseInt(options.minCoverage);
      const meetsCoverage = completeness.overallCoverage >= coverageThreshold;
      process.exit(meetsCoverage ? 0 : 1);
    } catch (error) {
      console.error('Completeness analysis failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('coverage-report')
  .description('generate detailed coverage report')
  .option('--min-coverage <percentage>', 'minimum coverage threshold', '80')
  .option('-f, --format <type>', 'output format (console, json, markdown)', 'console')
  .option('-o, --output <file>', 'output file path')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const coverage = await auditor.generateCoverageReport();
      
      let report: string;
      switch (options.format) {
        case 'json':
          report = JSON.stringify(coverage, null, 2);
          break;
        case 'markdown':
          report = auditor.generateCoverageMarkdownReport(coverage);
          break;
        case 'console':
        default:
          report = auditor.generateCoverageConsoleReport(coverage);
          break;
      }
      
      if (options.output) {
        writeFileSync(resolve(options.output), report);
        if (!program.opts().quiet) {
          console.log(`Coverage report saved to: ${options.output}`);
        }
      } else {
        console.log(report);
      }
      
      const coverageThreshold = parseInt(options.minCoverage);
      const meetsCoverage = coverage.overallCoverage >= coverageThreshold;
      process.exit(meetsCoverage ? 0 : 1);
    } catch (error) {
      console.error('Coverage report generation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('detect-missing-features')
  .description('detect features present in code but missing from system maps')
  .option('--suggest-additions', 'suggest system map additions')
  .option('--quiet', 'suppress output except errors')
  .action(async (options) => {
    try {
      const auditor = new SystemMapAuditor(program.opts().config);
      const missingFeatures = await auditor.detectMissingFeatures();
      
      if (!options.quiet) {
        console.log(auditor.generateMissingFeaturesReport(missingFeatures, {
          suggestAdditions: options.suggestAdditions
        }));
      }
      
      const hasMissingFeatures = missingFeatures.length > 0;
      process.exit(hasMissingFeatures ? 1 : 0);
    } catch (error) {
      console.error('Missing features detection failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  if (error instanceof Error) {
    console.error('CLI Error:', error.message);
  }
  process.exit(1);
}

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}