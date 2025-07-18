import { db } from "@shared/database/db";
import { 
  users, 
  chatMessages, 
  healthData, 
  connectedDevices,
  conversations,
  conversationMessages,
  memoryEntries,
  files
} from '@shared/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

/**
 * Prepared Statements Service
 * Optimizes database performance by using prepared statements for frequently executed queries
 */
export class PreparedStatementsService {
  private static instance: PreparedStatementsService;
  private preparedStatements: any = {};

  private constructor() {
    this.initializePreparedStatements();
  }

  private initializePreparedStatements() {
    if (!db) {
      console.warn('Database not initialized, deferring prepared statement creation');
      return;
    }

    this.preparedStatements = {
      // User queries
      getUserById: db.select().from(users).where(eq(users.id, sql.placeholder("id"))).prepare("ps_get_user_by_id"),
      getUserByUsername: db.select().from(users).where(eq(users.username, sql.placeholder("username"))).prepare("ps_get_user_by_username"),
      
      // Message queries
      getMessagesByUserId: db.select().from(chatMessages)
        .where(eq(chatMessages.userId, sql.placeholder("userId")))
        .orderBy(chatMessages.timestamp)
        .prepare("ps_get_messages_by_user_id"),
      
      getConversationMessages: db.select().from(conversationMessages)
        .where(eq(conversationMessages.conversationId, sql.placeholder("conversationId")))
        .orderBy(conversationMessages.createdAt)
        .prepare("ps_get_conversation_messages"),
      
      // Health data queries
      getHealthDataByUserAndTimeRange: db.select().from(healthData)
        .where(and(
          eq(healthData.userId, sql.placeholder("userId")),
          gte(healthData.timestamp, sql.placeholder("startDate"))
        ))
        .orderBy(desc(healthData.timestamp))
        .prepare("ps_get_health_data_by_user_and_time_range"),
      
      getHealthDataByUserAndType: db.select().from(healthData)
        .where(and(
          eq(healthData.userId, sql.placeholder("userId")),
          eq(healthData.dataType, sql.placeholder("dataType"))
        ))
        .orderBy(desc(healthData.timestamp))
        .prepare("ps_get_health_data_by_user_and_type"),
      
      // Device queries
      getDevicesByUserId: db.select().from(connectedDevices)
        .where(eq(connectedDevices.userId, sql.placeholder("userId")))
        .prepare("ps_get_devices_by_user_id"),
      
      getActiveDevicesByUserId: db.select().from(connectedDevices)
        .where(and(
          eq(connectedDevices.userId, sql.placeholder("userId")),
          eq(connectedDevices.isActive, true)
        ))
        .prepare("ps_get_active_devices_by_user_id"),
      
      // Memory queries
      getMemoryEntriesByUser: db.select().from(memoryEntries)
        .where(eq(memoryEntries.userId, sql.placeholder("userId")))
        .orderBy(desc(memoryEntries.importanceScore))
        .prepare("ps_get_memory_entries_by_user"),
      
      getMemoryEntriesByUserAndCategory: db.select().from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, sql.placeholder("userId")),
          eq(memoryEntries.category, sql.placeholder("category"))
        ))
        .orderBy(desc(memoryEntries.importanceScore))
        .prepare("ps_get_memory_entries_by_user_and_category"),
      
      // File queries
      getFilesByUserId: db.select().from(files)
        .where(and(
          eq(files.userId, sql.placeholder("userId")),
          eq(files.isDeleted, false)
        ))
        .orderBy(desc(files.createdAt))
        .prepare("ps_get_files_by_user_id"),
      
      getFilesByConversation: db.select().from(files)
        .where(and(
          eq(files.conversationId, sql.placeholder("conversationId")),
          eq(files.isDeleted, false)
        ))
        .orderBy(desc(files.createdAt))
        .prepare("ps_get_files_by_conversation")
    };
  }

  public reinitialize() {
    this.initializePreparedStatements();
  }

  static getInstance(): PreparedStatementsService {
    if (!PreparedStatementsService.instance) {
      PreparedStatementsService.instance = new PreparedStatementsService();
    }
    return PreparedStatementsService.instance;
  }

  // Optimized query methods using prepared statements
  async getUserById(id: number) {
    const results = await this.preparedStatements.getUserById.execute({ id });
    return results[0] || undefined;
  }

  async getUserByUsername(username: string) {
    const results = await this.preparedStatements.getUserByUsername.execute({ username });
    return results[0] || undefined;
  }

  async getMessagesByUserId(userId: number) {
    return await this.preparedStatements.getMessagesByUserId.execute({ userId });
  }

  async getConversationMessages(conversationId: string) {
    return await this.preparedStatements.getConversationMessages.execute({ conversationId });
  }

  async getHealthDataByUserAndTimeRange(userId: number, startDate: Date) {
    return await this.preparedStatements.getHealthDataByUserAndTimeRange.execute({ 
      userId, 
      startDate 
    });
  }

  async getHealthDataByUserAndType(userId: number, dataType: string) {
    return await this.preparedStatements.getHealthDataByUserAndType.execute({ 
      userId, 
      dataType 
    });
  }

  async getDevicesByUserId(userId: number) {
    return await this.preparedStatements.getDevicesByUserId.execute({ userId });
  }

  async getActiveDevicesByUserId(userId: number) {
    return await this.preparedStatements.getActiveDevicesByUserId.execute({ userId });
  }

  async getMemoryEntriesByUser(userId: number) {
    return await this.preparedStatements.getMemoryEntriesByUser.execute({ userId });
  }

  async getMemoryEntriesByUserAndCategory(userId: number, category: string) {
    return await this.preparedStatements.getMemoryEntriesByUserAndCategory.execute({ 
      userId, 
      category 
    });
  }

  async getFilesByUserId(userId: number) {
    return await this.preparedStatements.getFilesByUserId.execute({ userId });
  }

  async getFilesByConversation(conversationId: string) {
    return await this.preparedStatements.getFilesByConversation.execute({ conversationId });
  }

  // Batch operations for improved performance
  async batchInsertHealthData(healthDataEntries: any[]) {
    return await db.insert(healthData).values(healthDataEntries).returning();
  }

  async batchInsertMessages(messageEntries: any[]) {
    return await db.insert(chatMessages).values(messageEntries).returning();
  }

  // Performance monitoring
  async getQueryPerformanceStats() {
    try {
      const stats = await db.execute(sql`
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time
        FROM pg_stat_statements 
        WHERE query LIKE '%users%' OR query LIKE '%messages%' OR query LIKE '%health_data%'
        ORDER BY total_exec_time DESC 
        LIMIT 10
      `);
      return stats;
    } catch (error) {
      // pg_stat_statements extension might not be available
      return [];
    }
  }

  // Connection pool monitoring
  async getConnectionPoolStats() {
    try {
      const stats = await db.execute(sql`
        SELECT 
          state,
          count(*) as connection_count
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state
      `);
      return stats;
    } catch (error) {
      return [];
    }
  }
}

export const preparedStatementsService = PreparedStatementsService.getInstance();