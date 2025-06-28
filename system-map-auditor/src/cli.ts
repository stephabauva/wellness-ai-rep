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