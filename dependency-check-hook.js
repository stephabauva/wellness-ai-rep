#!/usr/bin/env node

/**
 * Pre-commit hook that warns about cross-domain impact
 * Checks modified files for cross-domain dependencies and warns developers
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import DependencyTracker from './dependency-tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DependencyCheckHook {
  constructor() {
    this.tracker = new DependencyTracker();
    this.warnings = [];
    this.blockers = [];
  }

  async run() {
    console.log(chalk.blue('🔍 Checking cross-domain dependencies...\n'));
    
    try {
      // Get list of modified files
      const modifiedFiles = this.getModifiedFiles();
      
      if (modifiedFiles.length === 0) {
        console.log(chalk.green('✅ No files modified\n'));
        return true;
      }
      
      // Build dependency map
      console.log(chalk.gray('Building dependency map...'));
      await this.tracker.scanProject();
      
      // Check each modified file
      for (const file of modifiedFiles) {
        await this.checkFile(file);
      }
      
      // Report findings
      return this.reportFindings();
    } catch (error) {
      console.error(chalk.red('❌ Hook failed:'), error.message);
      return false;
    }
  }

  getModifiedFiles() {
    try {
      // Get staged files
      const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', {
        encoding: 'utf8'
      }).trim().split('\n').filter(Boolean);
      
      // Filter for JS/TS files
      return stagedFiles.filter(file => 
        file.match(/\.(ts|tsx|js|jsx)$/) && 
        !file.includes('test.') &&
        !file.includes('spec.')
      );
    } catch (error) {
      return [];
    }
  }

  async checkFile(filePath) {
    // Check if file has @used-by annotations
    const annotations = await this.extractAnnotations(filePath);
    
    // Get actual dependencies from tracker
    const dependencies = this.tracker.dependencies.get(filePath);
    
    if (dependencies && dependencies.usedBy.length > 0) {
      const domains = new Set(dependencies.usedBy.map(u => u.domain));
      const fileDomain = this.tracker.getDomainFromPath(filePath);
      
      // Check for cross-domain usage
      const crossDomainUsage = dependencies.usedBy.filter(u => u.domain !== fileDomain);
      
      if (crossDomainUsage.length > 0) {
        this.warnings.push({
          file: filePath,
          domain: fileDomain,
          usedBy: crossDomainUsage,
          annotations: annotations,
          impact: this.assessImpact(filePath, crossDomainUsage)
        });
      }
      
      // Check for critical path modifications
      if (annotations.includes('@critical-path')) {
        this.blockers.push({
          file: filePath,
          reason: 'Critical path component - requires careful review',
          usedBy: dependencies.usedBy
        });
      }
    }
  }

  async extractAnnotations(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const annotationRegex = /@(used-by|cross-domain|critical-path|risk|behavior-note|impact)\s+([^\n]+)/g;
      const annotations = [];
      
      let match;
      while ((match = annotationRegex.exec(content)) !== null) {
        annotations.push(`@${match[1]} ${match[2].trim()}`);
      }
      
      return annotations;
    } catch (error) {
      return [];
    }
  }

  assessImpact(filePath, crossDomainUsage) {
    const impactLevel = {
      low: 0,
      medium: 0,
      high: 0
    };
    
    // Assess based on number of domains affected
    if (crossDomainUsage.length >= 3) {
      impactLevel.high++;
    } else if (crossDomainUsage.length >= 2) {
      impactLevel.medium++;
    } else {
      impactLevel.low++;
    }
    
    // Check for critical domains
    const criticalDomains = ['chat', 'health', 'memory'];
    const affectedCriticalDomains = crossDomainUsage.filter(u => 
      criticalDomains.includes(u.domain)
    );
    
    if (affectedCriticalDomains.length >= 2) {
      impactLevel.high++;
    } else if (affectedCriticalDomains.length === 1) {
      impactLevel.medium++;
    }
    
    // Determine overall impact
    if (impactLevel.high > 0) return 'high';
    if (impactLevel.medium > 0) return 'medium';
    return 'low';
  }

  reportFindings() {
    console.log('\n' + chalk.blue('📊 Cross-Domain Dependency Check Results\n'));
    
    if (this.warnings.length === 0 && this.blockers.length === 0) {
      console.log(chalk.green('✅ No cross-domain issues detected!\n'));
      return true;
    }
    
    // Report warnings
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('⚠️  Cross-Domain Dependencies Found:\n'));
      
      this.warnings.forEach((warning, index) => {
        const impactColor = warning.impact === 'high' ? chalk.red : 
                          warning.impact === 'medium' ? chalk.yellow : 
                          chalk.gray;
        
        console.log(chalk.white(`${index + 1}. ${warning.file}`));
        console.log(`   Domain: ${chalk.cyan(warning.domain)}`);
        console.log(`   Impact: ${impactColor(warning.impact.toUpperCase())}`);
        console.log(`   Used by:`);
        
        warning.usedBy.forEach(usage => {
          console.log(`     - ${chalk.magenta(usage.domain)}: ${usage.file}`);
        });
        
        if (warning.annotations.length > 0) {
          console.log(`   Annotations:`);
          warning.annotations.forEach(ann => {
            console.log(`     ${chalk.gray(ann)}`);
          });
        }
        
        console.log('');
      });
    }
    
    // Report blockers
    if (this.blockers.length > 0) {
      console.log(chalk.red('🚨 Critical Path Modifications:\n'));
      
      this.blockers.forEach((blocker, index) => {
        console.log(chalk.red(`${index + 1}. ${blocker.file}`));
        console.log(`   ${chalk.white(blocker.reason)}`);
        console.log(`   Affected components: ${blocker.usedBy.length}`);
        console.log('');
      });
    }
    
    // Recommendations
    console.log(chalk.blue('💡 Recommendations:\n'));
    console.log('1. Review all affected domains before committing');
    console.log('2. Update @used-by annotations if adding new usage');
    console.log('3. Consider running tests for affected domains');
    console.log('4. Document any behavioral changes in CHANGELOG\n');
    
    // Ask for confirmation
    if (this.warnings.some(w => w.impact === 'high') || this.blockers.length > 0) {
      console.log(chalk.yellow('⚠️  High impact changes detected!'));
      console.log(chalk.white('Do you want to proceed with the commit? (y/N)'));
      
      // In a real pre-commit hook, you'd read from stdin
      // For now, we'll return false to block the commit
      return false;
    }
    
    return true;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const hook = new DependencyCheckHook();
  hook.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export default DependencyCheckHook;