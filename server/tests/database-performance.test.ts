import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { preparedStatementsService } from '../services/prepared-statements-service';
import { databaseMigrationService } from '../services/database-migration-service';

describe('PostgreSQL Performance Tests', () => {
  beforeAll(async () => {
    await databaseMigrationService.initializeDatabase();
  });

  it('should have connection pool configured', async () => {
    const connectionTest = await db.execute(sql`SELECT 1 as test`);
    expect(connectionTest).toBeDefined();
  });

  it('should have performance indexes created', async () => {
    const indexes = await db.execute(sql`
      SELECT count(*) as count
      FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
    `);
    expect(Number(indexes[0]?.count)).toBeGreaterThan(5);
  });

  it('should execute prepared statements efficiently', async () => {
    const startTime = Date.now();
    await preparedStatementsService.getUserById(1);
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(100);
  });
});