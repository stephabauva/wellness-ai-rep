#!/usr/bin/env node

import { execSync } from 'child_process';
import chalk from 'chalk';

const runCommand = (command, description, required = true) => {
  console.log(chalk.blue(`\n🔍 ${description}`));
  console.log(chalk.gray(`Running: ${command}`));
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8',
      cwd: process.cwd()
    });
    console.log(chalk.green(`✅ ${description} - PASSED`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ ${description} - FAILED`));
    if (required) {
      console.log(chalk.red(`\nCI pipeline failed at: ${description}`));
      process.exit(1);
    }
    return false;
  }
};

const main = async () => {
  console.log(chalk.yellow('🚀 Starting Local CI Pipeline Validation\n'));
  
  const startTime = Date.now();
  
  // Core validation steps (required)
  runCommand('npm run check:ports', 'Port Configuration Validation');
  runCommand('npm run check:imports', 'Import Path Validation');
  runCommand('npm run check', 'TypeScript Compilation Check');
  
  // Architecture validation
  runCommand('npm run check:dependencies', 'Cross-Domain Dependency Analysis');
  runCommand('npm run check:async', 'Async/Await Compatibility Check');
  runCommand('npm run check:filesize', 'File Size Analysis');
  
  // UI/UX validation
  runCommand('npm run check:ui', 'UI Component Analysis', false);
  runCommand('npm run check:visual', 'Visual Regression Detection', false);
  runCommand('npm run check:integration', 'Integration Test Analysis', false);
  
  // Test execution
  runCommand('npm run test', 'JavaScript/TypeScript Tests');
  runCommand('npm run test:go', 'Go Microservice Tests', false);
  
  // Build validation
  runCommand('npm run build', 'Production Build');
  
  // Functional validation
  runCommand('npm run validate:quick', 'Quick Functional Validation');
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(chalk.green(`\n🎉 Local CI Pipeline Completed Successfully!`));
  console.log(chalk.yellow(`⏱️  Total duration: ${duration}s`));
  console.log(chalk.blue(`\n📋 Next steps:`));
  console.log(chalk.blue(`   • Commit your changes`));
  console.log(chalk.blue(`   • Push to trigger GitHub Actions`));
  console.log(chalk.blue(`   • Monitor CI results in GitHub`));
};

main().catch(console.error);