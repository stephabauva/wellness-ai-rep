import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Enable WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with proper limits and cleanup
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit concurrent connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Connection timeout
  maxUses: 7500, // Max uses per connection before recycling
  allowExitOnIdle: true // Allow process to exit when idle
});

// Create drizzle instance with our schema
export const db = drizzle(pool, { schema });

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