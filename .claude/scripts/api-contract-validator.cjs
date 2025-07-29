#!/usr/bin/env node

/**
 * API Contract Validator
 * Validates that Go service responses match frontend TypeScript interfaces
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const GO_SERVICE_PORT = 8081;
const FRONTEND_PORT = 5000;

// Test contracts between Go service and TypeScript interfaces
const API_CONTRACTS = [
  {
    name: 'Memory Overview',
    goEndpoint: `http://localhost:${GO_SERVICE_PORT}/api/memories/overview`,
    expectedShape: {
      total: 'number',
      categories: 'object',
      qualityMetrics: 'object',
      preferences: 'object'
    },
    transformedFromGo: true,
    goShape: {
      totalMemories: 'number',
      categoryCounts: 'object', 
      averageImportance: 'number',
      recentMemoriesCount: 'number'
    }
  },
  {
    name: 'Memory List (Infinite)',
    goEndpoint: `http://localhost:${GO_SERVICE_PORT}/api/memories?limit=5`,
    expectedShape: {
      memories: 'array',
      hasMore: 'boolean',
      page: 'number',
      limit: 'number',
      count: 'number'
    },
    transformedFromGo: false
  },
  {
    name: 'Quality Metrics',
    goEndpoint: `http://localhost:${GO_SERVICE_PORT}/api/memories/quality-metrics`,
    expectedShape: {
      totalMemories: 'number',
      qualityScore: 'number',
      averageImportanceScore: 'number',
      duplicateRate: 'number',
      potentialDuplicates: 'number',
      averageFreshness: 'number'
    },
    transformedFromGo: false
  }
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, parseError: e.message });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
  });
}

function validateShape(data, expectedShape, contractName) {
  const errors = [];
  
  for (const [key, expectedType] of Object.entries(expectedShape)) {
    if (!(key in data)) {
      errors.push(`Missing property: ${key}`);
      continue;
    }
    
    const actualType = Array.isArray(data[key]) ? 'array' : typeof data[key];
    if (actualType !== expectedType) {
      errors.push(`Property ${key}: expected ${expectedType}, got ${actualType}`);
    }
  }
  
  return errors;
}

async function validateContracts() {
  console.log('🔍 Validating API Contracts...\n');
  
  let passed = 0;
  let failed = 0;
  const criticalErrors = [];

  for (const contract of API_CONTRACTS) {
    try {
      console.log(`Testing: ${contract.name}`);
      const result = await makeRequest(contract.goEndpoint);
      
      if (result.status !== 200) {
        console.log(`❌ ${contract.name}: HTTP ${result.status}`);
        failed++;
        criticalErrors.push(`${contract.name}: Server returned ${result.status}`);
        continue;
      }
      
      if (result.parseError) {
        console.log(`❌ ${contract.name}: JSON Parse Error - ${result.parseError}`);
        failed++;
        criticalErrors.push(`${contract.name}: Invalid JSON response`);
        continue;
      }
      
      // Check if this is transformed data or raw Go service data
      const shapeToTest = contract.transformedFromGo ? 
        contract.goShape : contract.expectedShape;
        
      const errors = validateShape(result.data, shapeToTest, contract.name);
      
      if (errors.length === 0) {
        console.log(`✅ ${contract.name}: PASS`);
        passed++;
      } else {
        console.log(`❌ ${contract.name}: FAIL`);
        errors.forEach(error => console.log(`   - ${error}`));
        console.log(`   Actual structure:`, JSON.stringify(result.data, null, 2));
        failed++;
        criticalErrors.push(`${contract.name}: Shape mismatch - ${errors.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ ${contract.name}: ERROR - ${error.message}`);
      failed++;
      criticalErrors.push(`${contract.name}: Network/Runtime error - ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  console.log(`📊 Results: ${passed} passed, ${failed} failed\n`);
  
  if (criticalErrors.length > 0) {
    console.log('🚨 CRITICAL API CONTRACT VIOLATIONS:');
    criticalErrors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
    console.log('');
    console.log('💡 These errors will cause runtime TypeScript errors and blank pages!');
    console.log('💡 Fix by either:');
    console.log('   - Update Go service to match expected shape');
    console.log('   - Add response transformation in frontend');
    console.log('   - Update TypeScript interfaces to match Go service');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  validateContracts();
}

module.exports = { validateContracts };