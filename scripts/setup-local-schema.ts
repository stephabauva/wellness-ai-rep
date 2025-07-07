#!/usr/bin/env tsx

/**
 * Local Database Schema Setup Script
 *
 * This script creates the database schema and applies indexes for local development.
 * It replicates the exact structure from your Neon database
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load .env.local first if it exists, then fallback to .env
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
  console.log('📋 Loaded .env.local configuration');
} else {
  config();
  console.log('📋 Loaded .env configuration');
}
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../shared/schema.js';

// Use local database URL if available, fallback to regular DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or DATABASE_URL_LOCAL must be set');
  process.exit(1);
}

console.log('🚀 Setting up local database schema...');

// Create connection pool for local PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const db = drizzle(pool, { schema });

async function setupSchema() {
  try {
    console.log('📋 Creating database schema...');
    
    // Push schema using Drizzle
    const { execSync } = await import('child_process');
    
    // Set the DATABASE_URL for drizzle-kit to use local database
    const env = { ...process.env };
    
    execSync('npx drizzle-kit push --config=drizzle.config.local.ts', {
      stdio: 'inherit',
      env
    });
    
    console.log('✅ Schema created successfully');
    
    // Apply indexes
    console.log('📋 Creating performance indexes...');
    const indexSql = readFileSync(join(process.cwd(), 'migrations', 'create_indexes.sql'), 'utf8');
    
    await pool.query(indexSql);
    console.log('✅ Indexes created successfully');
    
    // Verify setup
    console.log('🔍 Verifying database setup...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log('🎉 Local database schema setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});

setupSchema();