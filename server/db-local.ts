import 'dotenv/config';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { Pool as NodePool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

// Determine if we're using local database
const useLocalDb = process.env.USE_LOCAL_DB === 'true' || process.env.NODE_ENV === 'development';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DATABASE_URL_LOCAL must be set. Did you forget to provision a database?",
  );
}

// Create database connection based on environment
let pool: NeonPool | NodePool;
let db: ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzleNode>;

if (useLocalDb) {
  console.log('🏠 Using local PostgreSQL database');
  
  // Use standard node-postgres for local development
  const nodePool = new NodePool({
    connectionString: databaseUrl,
    max: 10, // Higher limit for local development
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true
  });
  
  pool = nodePool;
  db = drizzleNode(nodePool, { schema });
} else {
  console.log('☁️ Using Neon serverless database');
  
  // Enable WebSocket for Neon serverless
  neonConfig.webSocketConstructor = ws;
  
  // Create Neon connection pool with proper limits and cleanup
  const neonPool = new NeonPool({
    connectionString: databaseUrl,
    max: 5, // Limit concurrent connections for Neon
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
    allowExitOnIdle: true
  });
  
  pool = neonPool;
  db = drizzleNeon(neonPool, { schema });
}

// Export the database instance and pool
export { db, pool };

// Graceful shutdown handler
const shutdown = async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Log database configuration
console.log(`Database configured: ${useLocalDb ? 'Local PostgreSQL' : 'Neon Serverless'}`);