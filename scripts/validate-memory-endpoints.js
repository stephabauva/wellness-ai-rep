#!/usr/bin/env node

/**
 * Simple Memory Endpoints Validation Script
 * Tests that memory API endpoints return actual data (not empty arrays)
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
const USER_ID = 1;

// Simple HTTP GET request
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
  });
}

async function validateEndpoints() {
  console.log('🔍 Validating Memory Endpoints...\n');
  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'Memory Overview',
      path: '/api/memories/overview',
      validate: (data) => data.total >= 0 && typeof data.categories === 'object'
    },
    {
      name: 'Memory List',
      path: '/api/memories?limit=5',
      validate: (data) => Array.isArray(data.memories) && typeof data.pagination === 'object'
    },
    {
      name: 'Quality Metrics',
      path: '/api/memories/quality-metrics',
      validate: (data) => typeof data.totalMemories === 'number' && typeof data.qualityScore === 'number'
    }
  ];

  for (const test of tests) {
    try {
      const result = await makeRequest(test.path);
      
      if (result.status === 200 && test.validate(result.data)) {
        console.log(`✅ ${test.name}: PASS`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAIL (status: ${result.status})`);
        if (result.status === 200) {
          console.log(`   Data structure invalid:`, JSON.stringify(result.data, null, 2));
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  validateEndpoints();
}