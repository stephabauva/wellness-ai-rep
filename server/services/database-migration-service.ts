import { db, pool } from "@shared/database/db";
import { sql } from 'drizzle-orm';
import { logger } from "@shared/services/logger-service";

export class DatabaseMigrationService {
  private static instance: DatabaseMigrationService;
  
  static getInstance(): DatabaseMigrationService {
    if (!DatabaseMigrationService.instance) {
      DatabaseMigrationService.instance = new DatabaseMigrationService();
    }
    return DatabaseMigrationService.instance;
  }

  async createPerformanceIndexes(): Promise<void> {
    logger.debug('Starting: Create performance indexes for PostgreSQL...', { service: 'database' });
    const startTime = Date.now();
    
    const indexes = [
      // Core message indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_user_timestamp ON chat_messages(user_id, timestamp DESC)',
      
      // Conversation message indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_timestamp ON conversation_messages(created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_conv_timestamp ON conversation_messages(conversation_id, created_at DESC)',
      
      // Memory indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_entries_user_id ON memory_entries(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_entries_category ON memory_entries(category)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_entries_user_category ON memory_entries(user_id, category)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_entries_importance ON memory_entries(importance_score DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_entries_labels_gin ON memory_entries USING GIN (labels)',
      
      // Health data indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_data_user_id ON health_data(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_data_timestamp ON health_data(timestamp DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_data_user_timestamp ON health_data(user_id, timestamp DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_data_data_type ON health_data(data_type)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_data_category ON health_data(category)',
      
      // Device indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connected_devices_user_id ON connected_devices(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connected_devices_active ON connected_devices(user_id, last_sync DESC) WHERE is_active = true',
      
      // File indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_id ON files(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_conversation_id ON files(conversation_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_not_deleted ON files(user_id, created_at DESC) WHERE is_deleted = false',
      
      // Conversation indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC)',
      
      // JSONB indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_preferences_gin ON users USING GIN(preferences)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_health_data_metadata_gin ON health_data USING GIN(metadata)',
      
      // Full-text search indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_content_fts ON chat_messages USING GIN(to_tsvector(\'english\', content))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_messages_content_fts ON conversation_messages USING GIN(to_tsvector(\'english\', content))'
    ];

    let createdCount = 0;
    let failedCount = 0;

    for (const indexQuery of indexes) {
      try {
        await db.execute(sql.raw(indexQuery));
        createdCount++;
      } catch (error: any) {
        // Skip if index already exists
        if (!error.message?.includes('already exists')) {
          logger.warn(`Failed to create index: ${error.message}`, { service: 'database' });
          failedCount++;
        } else {
          createdCount++;
        }
      }
    }
    
    logger.debug(`Performance indexes: ${createdCount} created/verified, ${failedCount} failed`, { service: 'database' });
    const endTime = Date.now();
    logger.debug(`Finished: Create performance indexes. Duration: ${endTime - startTime}ms`, { service: 'database' });
  }

  async optimizeDatabase(): Promise<void> {
    logger.debug('Starting: Optimize PostgreSQL database...', { service: 'database' });
    const startTime = Date.now();
    // console.log('Optimizing PostgreSQL database...'); // Replaced by logger
    
    const optimizations = [
      // Update table statistics
      'ANALYZE users',
      'ANALYZE chat_messages', 
      'ANALYZE health_data',
      'ANALYZE connected_devices',
      'ANALYZE conversations',
      'ANALYZE conversation_messages',
      'ANALYZE memory_entries',
      'ANALYZE files',
      
      // Vacuum tables to reclaim space
      'VACUUM ANALYZE users',
      'VACUUM ANALYZE chat_messages',
      'VACUUM ANALYZE health_data'
    ];

    let successCount = 0;
    let failedCount = 0;

    for (const optimization of optimizations) {
      try {
        await db.execute(sql.raw(optimization));
        successCount++;
      } catch (error: any) {
        logger.warn(`Optimization failed: ${optimization} - ${error.message}`, { service: 'database' });
        failedCount++;
      }
    }
    
    logger.debug(`Database optimization: ${successCount} completed, ${failedCount} failed`, { service: 'database' });
    const endTime = Date.now();
    logger.debug(`Finished: Optimize PostgreSQL database. Duration: ${endTime - startTime}ms`, { service: 'database' });
  }

  async checkDatabaseHealth(): Promise<{
    connectionStatus: string;
    tableCount: number;
    indexCount: number;
    performance: 'good' | 'warning' | 'critical';
  }> {
    logger.debug('Starting: Check database health...', { service: 'database' });
    const startTime = Date.now();
    try {
      // Test connection
      await db.execute(sql`SELECT 1 as test`);
      
      // Use the exported pool for reliable count queries
      let tableCount = 0;
      let indexCount = 0;
      
      try {
        const client = await pool.connect();
        
        // Get public schema table count
        const tablesResult = await client.query(
          'SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = $1',
          ['public']
        );
        tableCount = parseInt(tablesResult.rows[0]?.count ?? '0', 10);
        
        // Get performance index count (excluding primary keys)
        const indexesResult = await client.query(
          "SELECT COUNT(DISTINCT indexname) as count FROM pg_indexes WHERE schemaname = $1 AND indexname NOT LIKE '%_pkey'",
          ['public']
        );
        indexCount = parseInt(indexesResult.rows[0]?.count ?? '0', 10);
        
        client.release();
      } catch (error) {
        logger.debug(`Database count query failed: ${error}`, { service: 'database' });
      }

      // Performance assessment based on table/index existence
      let performance: 'good' | 'warning' | 'critical' = 'good';
      if (tableCount === 0) performance = 'critical';
      else if (tableCount < 5 || indexCount < 10) performance = 'warning';

      logger.debug(`Database health check: ${tableCount} public schema tables, ${indexCount} performance indexes`, { service: 'database' });

      return {
        connectionStatus: 'connected',
        tableCount,
        indexCount,
        performance
      };
    } catch (error) {
      logger.error('Database health check failed', error as Error, { service: 'database' });
      return {
        connectionStatus: 'error',
        tableCount: 0,
        indexCount: 0,
        performance: 'critical'
      };
    } finally {
      const endTime = Date.now();
      logger.debug(`Finished: Check database health. Duration: ${endTime - startTime}ms`, { service: 'database' });
    }
  }

  async initializeDatabase(): Promise<void> {
    logger.debug('Starting: Full database initialization method...', { service: 'database' });
    const startTime = Date.now();
    // logger.debug('Initializing PostgreSQL database...', { service: 'database' }); // Redundant with new log
    
    try {
      // Ensure performance indexes exist
      await this.createPerformanceIndexes();
      
      // Optimize database performance
      await this.optimizeDatabase();
      
      logger.debug('Database initialization completed successfully.', { service: 'database' });
    } catch (error) {
      logger.error('Database initialization failed', error as Error, { service: 'database' });
      throw error; // Re-throw error after logging
    } finally {
      const endTime = Date.now();
      logger.debug(`Finished: Full database initialization method. Duration: ${endTime - startTime}ms`, { service: 'database' });
    }
  }
}

export const databaseMigrationService = DatabaseMigrationService.getInstance();