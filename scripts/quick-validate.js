#!/usr/bin/env node

/**
 * Quick Validation Script - Simple functional checks
 * Run this before/after refactoring to catch stub implementations
 */

import { execSync } from 'child_process';

console.log('🚀 Quick Functional Validation\n');

const checks = [
  { name: 'Database Connectivity', cmd: 'node scripts/validate-db-connectivity.cjs' },
  { name: 'Memory Data Services', cmd: 'node scripts/validate-memory-data.cjs' },
  { name: 'Memory API Endpoints', cmd: 'node scripts/validate-memory-endpoints.cjs' }
];

let allPassed = true;

for (const check of checks) {
  console.log(`⏳ Running ${check.name}...`);
  try {
    execSync(check.cmd, { cwd: '/Users/urdoom/wellness-ai-rep', stdio: 'pipe' });
    console.log(`✅ ${check.name}: PASS\n`);
  } catch (error) {
    console.log(`❌ ${check.name}: FAIL`);
    console.log('Output:', error.stdout?.toString() || error.stderr?.toString() || error.message);
    console.log('');
    allPassed = false;
  }
}

console.log('📋 Summary:');
if (allPassed) {
  console.log('✅ All functional validations passed!');
  process.exit(0);
} else {
  console.log('❌ Some validations failed - check issues before refactoring');
  process.exit(1);
}