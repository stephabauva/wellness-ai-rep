#!/usr/bin/env tsx

/**
 * Seed Default User Script
 *
 * This script creates the default user (ID=1) that the application expects
 * for file uploads and other operations.
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
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL must be set');
  process.exit(1);
}

console.log('🚀 Creating default user...');

// Create connection pool for local PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const db = drizzle(pool, { schema });

async function seedDefaultUser() {
  try {
    // Check if user with ID=1 already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(sql`id = 1`)
      .limit(1);

    if (existingUser.length > 0) {
      console.log('✅ Default user (ID=1) already exists');
      console.log('   Username:', existingUser[0].username);
      return;
    }

    // Insert default user with specific ID=1
    // Using a simple placeholder password since the app uses FIXED_USER_ID
    await db.execute(sql`
      INSERT INTO users (id, username, password, name, email, preferences, created_at)
      VALUES (
        1,
        'default_user',
        'placeholder_password',
        'Default User',
        'default@example.com',
        '{}',
        NOW()
      )
    `);

    console.log('✅ Default user created successfully');
    console.log('   ID: 1');
    console.log('   Username: default_user');
    console.log('');
    console.log('ℹ️  Note: This app uses a fixed user ID without authentication');

    // Reset the sequence to ensure next user gets ID=2
    await db.execute(sql`
      SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
    `);

  } catch (error) {
    console.error('❌ Error creating default user:', error);
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

seedDefaultUser();