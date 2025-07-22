#!/usr/bin/env node

/**
 * Simple Database Connectivity Validation Script
 * Tests that database queries execute and return expected results
 */

const path = require('path');
const { execSync } = require('child_process');

// Simple database connectivity test using existing infrastructure
function testDatabaseConnection() {
  console.log('🔗 Testing Database Connectivity...\n');
  
  try {
    // Test 1: Check if we can connect to database
    const testScript = `
      const { db } = require('./shared/database/db');
      const { memoryEntries, users } = require('./shared/schema');
      const { count, eq } = require('drizzle-orm');
      
      async function test() {
        try {
          // Test basic connection
          const userCount = await db.select({ count: count() }).from(users);
          console.log('✅ Database Connection: PASS');
          console.log('   Users in database:', userCount[0].count);
          
          // Test memory table access
          const memoryCount = await db.select({ count: count() }).from(memoryEntries);
          console.log('✅ Memory Table Access: PASS');
          console.log('   Memories in database:', memoryCount[0].count);
          
          // Test active memories for user 1
          const activeMemories = await db.select({ count: count() })
            .from(memoryEntries)
            .where(eq(memoryEntries.userId, 1));
          console.log('✅ User Memory Query: PASS');
          console.log('   Active memories for user 1:', activeMemories[0].count);
          
          process.exit(0);
        } catch (error) {
          console.log('❌ Database Test: FAIL');
          console.error('   Error:', error.message);
          process.exit(1);
        }
      }
      
      test();
    `;
    
    // Write and execute the test
    require('fs').writeFileSync('/tmp/db-test.js', testScript);
    execSync('cd /Users/urdoom/wellness-ai-rep && node /tmp/db-test.js', { 
      stdio: 'inherit',
      timeout: 10000 
    });
    
  } catch (error) {
    console.log('❌ Database Connectivity: FAIL');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testDatabaseConnection();
}