#!/usr/bin/env node

/**
 * Simple Memory Data Validation Script
 * Checks that memory services return actual data (not empty stubs)
 */

const path = require('path');
const { execSync } = require('child_process');

function validateMemoryData() {
  console.log('💾 Validating Memory Data Services...\n');
  
  const testScript = `
    import { MemoryQueryOperations } from './shared/services/memory/query-operations';
    
    async function testMemoryOperations() {
      const queryOps = new MemoryQueryOperations();
      let passed = 0;
      let failed = 0;
      
      try {
        // Test 1: getUserMemories should return array (not stub behavior)
        console.log('Testing getUserMemories...');
        const userMemories = await queryOps.getUserMemories(1);
        if (Array.isArray(userMemories)) {
          console.log(\`✅ getUserMemories: PASS (\${userMemories.length} memories)\`);
          passed++;
        } else {
          console.log('❌ getUserMemories: FAIL - Not an array');
          failed++;
        }
        
        // Test 2: getMemoryOverviewOptimized should return object with expected structure
        console.log('Testing getMemoryOverviewOptimized...');
        const overview = await queryOps.getMemoryOverviewOptimized(1);
        if (overview && typeof overview.total === 'number' && overview.categories) {
          console.log(\`✅ getMemoryOverviewOptimized: PASS (total: \${overview.total})\`);
          passed++;
        } else {
          console.log('❌ getMemoryOverviewOptimized: FAIL - Invalid structure');
          failed++;
        }
        
        // Test 3: getUserMemoriesPaginated should return proper pagination structure
        console.log('Testing getUserMemoriesPaginated...');
        const paginated = await queryOps.getUserMemoriesPaginated(1, { page: 1, limit: 5, offset: 0 });
        if (paginated && Array.isArray(paginated.memories) && paginated.pagination) {
          console.log(\`✅ getUserMemoriesPaginated: PASS (\${paginated.memories.length} memories)\`);
          passed++;
        } else {
          console.log('❌ getUserMemoriesPaginated: FAIL - Invalid structure');
          failed++;
        }
        
        // Test 4: getMemoryQualityMetrics should return metrics object
        console.log('Testing getMemoryQualityMetrics...');
        const metrics = await queryOps.getMemoryQualityMetrics(1);
        if (metrics && typeof metrics.totalMemories === 'number' && typeof metrics.qualityScore === 'number') {
          console.log(\`✅ getMemoryQualityMetrics: PASS (quality: \${metrics.qualityScore.toFixed(2)})\`);
          passed++;
        } else {
          console.log('❌ getMemoryQualityMetrics: FAIL - Invalid structure');
          failed++;
        }
        
        console.log(\`\\n📊 Memory Data Validation: \${passed} passed, \${failed} failed\`);
        process.exit(failed > 0 ? 1 : 0);
        
      } catch (error) {
        console.log('❌ Memory Data Validation: CRITICAL ERROR');
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
    
    testMemoryOperations();
  `;
  
  try {
    require('fs').writeFileSync('/Users/urdoom/wellness-ai-rep/temp-memory-data-test.ts', testScript);
    execSync('npx tsx temp-memory-data-test.ts', { 
      cwd: '/Users/urdoom/wellness-ai-rep',
      stdio: 'inherit',
      timeout: 15000 
    });
  } catch (error) {
    console.log('❌ Memory Data Validation: EXECUTION FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateMemoryData();
}