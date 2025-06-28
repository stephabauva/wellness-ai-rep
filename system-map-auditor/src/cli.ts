#!/usr/bin/env node

import { Command } from 'commander';
import { SystemMapAuditor } from './core/auditor.js';

const program = new Command();

program
  .name('system-map-auditor')
  .description('Comprehensive system map validation and architecture analysis')
  .version('1.0.0');

// Main command - comprehensive audit (default behavior)
program
  .command('audit', { isDefault: true })
  .description('Run comprehensive audit (all validations)')
  .option('-d, --domain <domain>', 'Audit specific domain only')
  .option('-q, --quick', 'Skip advanced analysis for faster results')
  .option('-f, --format <format>', 'Output format (console|json)', 'console')
  .option('-o, --output <file>', 'Output to file')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    const auditor = new SystemMapAuditor();

    try {
      let results;

      if (options.domain) {
        // Domain-specific audit
        const result = await auditor.auditFeature(options.domain);
        results = result ? [result] : [];
      } else if (options.quick) {
        // Quick audit (basic validations only)
        results = await auditor.runFullAudit();
      } else {
        // Comprehensive audit (everything)
        results = await auditor.runComprehensiveAudit();
      }

      // Output results
      if (options.format === 'json') {
        const output = auditor.generateJsonReport(results, true);
        if (options.output) {
          require('fs').writeFileSync(options.output, output);
          console.log(`Results written to ${options.output}`);
        } else {
          console.log(output);
        }
      } else {
        const output = auditor.generateConsoleReport(results);
        if (options.output) {
          require('fs').writeFileSync(options.output, output);
          console.log(`Results written to ${options.output}`);
        } else {
          console.log(output);
        }
      }

      // Exit with appropriate code
      const hasErrors = auditor.shouldFailCi(results);
      process.exit(hasErrors ? 1 : 0);

    } catch (error) {
      console.error('Audit failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse only command (for testing)
program
  .command('parse')
  .description('Parse system maps only (no validation)')
  .action(async () => {
    const auditor = new SystemMapAuditor();

    try {
      const { success, issues } = await auditor.parseOnly();

      if (issues.length > 0) {
        console.log('Parse issues found:');
        issues.forEach(issue => {
          console.log(`  ${issue.severity.toUpperCase()}: ${issue.message}`);
        });
      }

      console.log(success ? 'Parse successful' : 'Parse failed');
      process.exit(success ? 0 : 1);

    } catch (error) {
      console.error('Parse failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();