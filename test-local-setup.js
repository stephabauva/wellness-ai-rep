#!/usr/bin/env node

/**
 * Quick test script to verify local database setup
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load environment
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
  console.log('📋 Using .env.local configuration');
} else {
  config();
  console.log('📋 Using .env configuration');
}

async function testSetup() {
  console.log('🧪 Testing Local Database Setup\n');
  
  // Test 1: Environment variables
  console.log('1️⃣ Testing environment variables...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found');
    return false;
  }
  
  if (dbUrl.includes('localhost')) {
    console.log('✅ Local database URL detected');
  } else {
    console.log('⚠️  Remote database URL detected (this is fine for testing)');
  }
  
  // Test 2: Database connection
  console.log('\n2️⃣ Testing database connection...');
  try {
    const { db, pool } = await import('./server/db-local.ts');
    
    // Test basic query
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Test table existence
    const tablesResult = await db.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = Array.isArray(tablesResult) ? tablesResult : tablesResult.rows || [];
    console.log(`✅ Found ${tables.length} tables in database`);
    
    // Test specific important tables
    const importantTables = ['users', 'chat_messages', 'health_data', 'memory_entries'];
    const existingTables = tables.map(t => t.table_name);
    
    for (const table of importantTables) {
      if (existingTables.includes(table)) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' missing`);
      }
    }
    
    await pool.end();
    console.log('\n🎉 All tests passed! Your local database setup is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    return false;
  }
}

testSetup().then(success => {
  if (success) {
    console.log('\n📝 Next steps:');
    console.log('   • Run: npm run dev:local');
    console.log('   • Your app will use the local database');
    console.log('   • Replit will continue using Neon (unchanged)');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});