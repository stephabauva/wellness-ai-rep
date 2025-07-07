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

// Environment detection
const useLocalDb = process.env.USE_LOCAL_DB === 'true';
const nodeEnv = process.env.NODE_ENV;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database connection setup with async initialization
let pool: NeonPool | any;
let db: ReturnType<typeof drizzleNeon> | any;

// Initialize database connection
async function initializeDatabase() {
  const isLocalDatabase = useLocalDb && databaseUrl.includes('localhost');

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
      console.log('🔄 Falling back to Neon serverless...');
      // Fallback to Neon if local connection fails
      setupNeonConnection();
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

// Initialize database with proper environment detection
const isLocalDatabase = useLocalDb && databaseUrl.includes('localhost');
const isReplitEnvironment = !!(process.env.REPLIT_DB_URL || process.env.REPL_ID);

if (isLocalDatabase && !isReplitEnvironment) {
  console.log('🔧 Local development mode detected');
  // Try to initialize local database asynchronously
  initializeDatabase().catch((error) => {
    console.error('❌ Failed to initialize local database:', error);
    console.log('🔄 Falling back to Neon serverless...');
    setupNeonConnection();
  });
} else {
  // Neon serverless connection (default for Replit and production)
  setupNeonConnection();
}

// Export the database instance and pool
export { db, pool };

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});