import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load .env.local first if it exists, then fallback to .env
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
} else {
  config();
}

import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Environment detection - simplified logic
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database connection setup
let pool: NeonPool | any;
let db: ReturnType<typeof drizzleNeon> | any;

// Initialize database connection
async function initializeDatabase() {
  const isLocalDatabase = databaseUrl!.includes('localhost');

  if (isLocalDatabase) {
    // Local PostgreSQL connection - only import pg when needed
    console.log('🔧 Using local PostgreSQL database');
    try {
      // Use dynamic import for ES modules compatibility
      const pgModule = await import('pg');
      const nodePostgresModule = await import('drizzle-orm/node-postgres');
      
      const NodePool = pgModule.Pool;
      const drizzleNode = nodePostgresModule.drizzle;
      
      pool = new NodePool({
        connectionString: databaseUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      db = drizzleNode(pool, { schema });
      console.log('✅ Local PostgreSQL connection established');
    } catch (error) {
      console.error('❌ Failed to connect to local PostgreSQL:', error);
      console.error('💡 Make sure PostgreSQL is running: brew services start postgresql@14');
      console.error('💡 Or run database setup: npm run db:setup-local');
      throw error; // Don't fallback to Neon in local environment
    }
  } else {
    // Neon serverless connection (default for Replit)
    setupNeonConnection();
  }
}

function setupNeonConnection() {
  console.log('☁️ Using Neon serverless database');
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
    allowExitOnIdle: true
  });
  db = drizzleNeon(pool, { schema });
  console.log('✅ Neon serverless connection established');
}

// Initialize database with environment detection
const isLocalDatabase = databaseUrl.includes('localhost');
const hasLocalEnvFile = existsSync('.env.local');

if (isLocalDatabase && hasLocalEnvFile) {
  console.log('🔧 Local development mode detected (using .env.local)');
  // For local database, we need to wait for async initialization
  // This will be handled by the server startup process
} else {
  // Neon serverless connection (default for Replit and production)
  setupNeonConnection();
}

// Export the database instance and pool
export { db, pool, initializeDatabase };

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }
  process.exit(0);
});