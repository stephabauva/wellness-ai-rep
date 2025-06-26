import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from './logger-service';

export class DatabaseMigrationService {
  private static instance: DatabaseMigrationService;
  
  static getInstance(): DatabaseMigrationService {
    if (!DatabaseMigrationService.instance) {
      DatabaseMigrationService.instance = new DatabaseMigrationService();
    }
    return DatabaseMigrationService.instance;
  }

  async createPerformanceIndexes(): Promise<void> {
    logger.debug('Creating performance indexes for PostgreSQL...', { service: 'database' });
    
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
  }

  async optimizeDatabase(): Promise<void> {
    console.log('Optimizing PostgreSQL database...');
    
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
  }

  async checkDatabaseHealth(): Promise<{
    connectionStatus: string;
    tableCount: number;
    indexCount: number;
    performance: 'good' | 'warning' | 'critical';
  }> {
    try {
      // Test connection
      const connectionTest = await db.execute(sql`SELECT 1 as test`);
      
      // Count tables
      const tables = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      // Count indexes
      const indexes = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);

      // Check for slow queries (basic performance check)
      const slowQueries = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_stat_statements 
        WHERE mean_exec_time > 1000
        LIMIT 1
      `).catch(() => [{ count: 0 }]); // Fallback if pg_stat_statements not available

      const tableCount = Number(tables[0]?.count) || 0;
      const indexCount = Number(indexes[0]?.count) || 0;
      const slowQueryCount = Number(slowQueries[0]?.count) || 0;

      let performance: 'good' | 'warning' | 'critical' = 'good';
      if (slowQueryCount > 10) performance = 'critical';
      else if (slowQueryCount > 5 || indexCount < 10) performance = 'warning';

      return {
        connectionStatus: 'connected',
        tableCount,
        indexCount,
        performance
      };
    } catch (error) {
      return {
        connectionStatus: 'error',
        tableCount: 0,
        indexCount: 0,
        performance: 'critical'
      };
    }
  }

  async initializeDatabase(): Promise<void> {
    logger.debug('Initializing PostgreSQL database with sample data...', { service: 'database' });
    
    try {
      // Check if database is already initialized
      const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const hasUsers = Number(userCount[0]?.count) > 0;
      
      if (!hasUsers) {
        logger.debug('Database is empty, creating sample data...', { service: 'database' });
        
        // Create tables first (handled by Drizzle migrations)
        await this.createPerformanceIndexes();
        
        // Initialize sample data through DatabaseStorage
        const { DatabaseStorage } = await import('../storage');
        const storage = new DatabaseStorage();
        await storage.initializeSampleData();
        
        logger.debug('Database initialization completed', { service: 'database' });
      } else {
        logger.debug('Database already initialized, ensuring indexes exist...', { service: 'database' });
        await this.createPerformanceIndexes();
      }
      
      await this.optimizeDatabase();
    } catch (error) {
      logger.error('Database initialization failed', error as Error, { service: 'database' });
      throw error;
    }
  }
}

export const databaseMigrationService = DatabaseMigrationService.getInstance();