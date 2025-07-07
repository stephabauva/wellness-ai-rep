import { config } from 'dotenv';
import { existsSync } from 'fs';
import { defineConfig } from "drizzle-kit";

// Load .env.local first if it exists, then fallback to .env
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
} else {
  config();
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  // Add verbose logging for local development
  verbose: process.env.USE_LOCAL_DB === 'true',
  strict: true,
});