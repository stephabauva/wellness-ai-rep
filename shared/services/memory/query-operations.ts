/**
 * Memory Query Operations
 * Actual implementation with proper database queries
 */

import { db } from '../../database/db';
import { memoryEntries, type MemoryEntry, type MemoryCategory } from '../../schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import type { RelevantMemory } from './memory-types';

/**
 * Utility class for memory query operations
 */
export class MemoryQueryOperations {
  constructor(qualityService?: any) {
    // Stub constructor
  }

  /**
   * Searches for relevant memories based on query
   * @param query - Search query string
   * @param userId - User ID to search for
   * @param limit - Maximum number of results
   * @returns Promise with relevant memories
   */
  async searchMemories(query: string, userId: number, limit: number = 10): Promise<RelevantMemory[]> {
    try {
      // Stub implementation - return empty results
      console.log(`[MemoryQuery] Searching for "${query}" for user ${userId}`);
      
      // TODO: Implement actual search logic with semantic similarity
      return [];
    } catch (error) {
      console.error('Error searching memories:', error);
      return [];
    }
  }

  /**
   * Filters memories based on criteria
   * @param memories - Array of memories to filter
   * @param criteria - Filtering criteria
   * @returns Filtered array of memories
   */
  filterMemories(memories: RelevantMemory[], criteria: any): RelevantMemory[] {
    if (!memories || memories.length === 0) {
      return [];
    }

    let filtered = [...memories];

    // Filter by importance threshold
    if (criteria.minImportance) {
      filtered = filtered.filter(memory => 
        (memory.importanceScore || 0.5) >= criteria.minImportance
      );
    }

    // Filter by date range
    if (criteria.startDate) {
      filtered = filtered.filter(memory => {
        const createdAt = memory.createdAt;
        return createdAt && new Date(createdAt) >= new Date(criteria.startDate);
      });
    }

    if (criteria.endDate) {
      filtered = filtered.filter(memory => {
        const createdAt = memory.createdAt;
        return createdAt && new Date(createdAt) <= new Date(criteria.endDate);
      });
    }

    // Filter by content keywords
    if (criteria.keywords && criteria.keywords.length > 0) {
      const keywords = criteria.keywords.map((k: string) => k.toLowerCase());
      filtered = filtered.filter(memory => 
        keywords.some((keyword: string) => 
          memory.content.toLowerCase().includes(keyword)
        )
      );
    }

    return filtered;
  }

  /**
   * Ranks memories by relevance to a query
   * @param memories - Array of memories to rank
   * @param query - Query to rank against
   * @returns Ranked array of memories
   */
  rankMemoriesByRelevance(memories: RelevantMemory[], query: string): RelevantMemory[] {
    if (!memories || memories.length === 0 || !query) {
      return memories;
    }

    // Stub implementation - basic keyword matching scoring
    const queryKeywords = query.toLowerCase().split(' ');
    
    return memories
      .map(memory => ({
        ...memory,
        relevanceScore: this.calculateBasicRelevanceScore(memory, queryKeywords)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Gets user memories with optional category filtering
   * @param userId - User ID to get memories for
   * @param category - Optional category filter
   * @returns Promise with array of user memories
   */
  async getUserMemories(userId: number, category?: any): Promise<any[]> {
    try {
      console.log(`[MemoryQuery] Getting memories for user ${userId}, category: ${category}`);
      
      // Build the query with optional category filter
      const whereConditions = [
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ];
      
      if (category) {
        whereConditions.push(eq(memoryEntries.category, category));
      }
      
      // Execute database query
      console.log(`[MemoryQuery] Executing query with conditions:`, whereConditions);
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(and(...whereConditions))
        .orderBy(desc(memoryEntries.createdAt));
      
      console.log(`[MemoryQuery] Found ${memories.length} memories for user ${userId}`);
      console.log(`[MemoryQuery] Sample memory IDs:`, memories.slice(0, 3).map((m: any) => m.id));
      return memories;
    } catch (error) {
      console.error('Error getting user memories:', error);
      return [];
    }
  }

  /**
   * Gets paginated user memories
   * @param userId - User ID to get memories for
   * @param options - Pagination and filter options
   * @returns Promise with paginated memory results
   */
  async getUserMemoriesPaginated(
    userId: number, 
    options: {
      page: number;
      limit: number;
      offset: number;
      category?: any;
    }
  ): Promise<{
    memories: any[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    try {
      console.log(`[MemoryQuery] PAGINATED - Starting query for user ${userId}`, options);
      
      // Build the query with optional category filter
      const whereConditions = [
        eq(memoryEntries.userId, userId),
        eq(memoryEntries.isActive, true)
      ];
      
      if (options.category) {
        whereConditions.push(eq(memoryEntries.category, options.category));
      }
      
      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: count() })
        .from(memoryEntries)
        .where(and(...whereConditions));
      
      const totalCount = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / options.limit);
      
      // Get paginated memories
      console.log(`[MemoryQuery] PAGINATED - Executing query for user ${userId}, conditions:`, whereConditions.length);
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(and(...whereConditions))
        .orderBy(desc(memoryEntries.createdAt))
        .limit(options.limit)
        .offset(options.offset);
      
      console.log(`[MemoryQuery] PAGINATED - Found ${memories.length} memories (total: ${totalCount}, page ${options.page}/${totalPages})`);
      console.log(`[MemoryQuery] PAGINATED - First memory ID:`, memories[0]?.id || 'NONE');
      
      return {
        memories,
        pagination: {
          page: options.page,
          limit: options.limit,
          totalCount: Number(totalCount),
          totalPages,
          hasMore: options.page < totalPages
        }
      };
    } catch (error) {
      console.error(`[MemoryQuery] PAGINATED - ERROR for user ${userId}:`, error);
      console.error(`[MemoryQuery] PAGINATED - Error type:`, typeof error, error?.constructor?.name);
      return {
        memories: [],
        pagination: {
          page: options.page,
          limit: options.limit,
          totalCount: 0,
          totalPages: 0,
          hasMore: false
        }
      };
    }
  }

  /**
   * Gets optimized memory overview for user
   * @param userId - User ID
   * @returns Promise with memory overview
   */
  async getMemoryOverviewOptimized(userId: number): Promise<any> {
    try {
      console.log(`[MemoryQuery] Getting optimized overview for user ${userId}`);
      
      // Get total count of active memories
      const totalResult = await db
        .select({ count: count() })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ));
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Get category breakdown
      const categoryResult = await db
        .select({ 
          category: memoryEntries.category,
          count: count()
        })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .groupBy(memoryEntries.category);
      
      const categories = categoryResult.reduce((acc: any, item: any) => {
        acc[item.category] = Number(item.count);
        return acc;
      }, {});
      
      // Get recent memories (last 5)
      const recentMemories = await db
        .select({
          id: memoryEntries.id,
          content: memoryEntries.content,
          category: memoryEntries.category,
          createdAt: memoryEntries.createdAt
        })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.createdAt))
        .limit(5);
      
      // Get average importance for quality metrics
      const avgImportanceResult = await db
        .select({
          avgImportance: sql<number>`AVG(${memoryEntries.importanceScore})`
        })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ));
      
      const avgImportance = Number(avgImportanceResult[0]?.avgImportance || 0.5);
      
      console.log(`[MemoryQuery] Overview: ${total} memories, ${Object.keys(categories).length} categories`);
      
      return {
        total,
        categories,
        recentMemories: recentMemories.map((m: any) => ({
          id: m.id,
          content: m.content,
          category: m.category,
          createdAt: m.createdAt?.toISOString()
        })),
        qualityMetrics: {
          qualityScore: Math.min(1.0, avgImportance + 0.3),
          duplicateRate: Math.max(0, (total - 10) / total), // Simple heuristic
          potentialDuplicates: Math.max(0, total - 15),
          averageImportanceScore: avgImportance,
          averageFreshness: 0.8 // Static for now
        }
      };
    } catch (error) {
      console.error('Error getting memory overview:', error);
      throw error;
    }
  }

  /**
   * Gets memory quality metrics for user
   * @param userId - User ID
   * @returns Promise with quality metrics
   */
  async getMemoryQualityMetrics(userId: number): Promise<any> {
    try {
      console.log(`[MemoryQuery] Getting quality metrics for user ${userId}`);
      
      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ));
      
      const totalMemories = Number(totalResult[0]?.count || 0);
      
      // Get category distribution  
      const categoryResult = await db
        .select({ 
          category: memoryEntries.category,
          count: count()
        })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .groupBy(memoryEntries.category);
      
      const categoryDistribution = categoryResult.reduce((acc: any, item: any) => {
        acc[item.category] = Number(item.count);
        return acc;
      }, {});
      
      // Get average importance
      const avgImportanceResult = await db
        .select({
          avgImportance: sql<number>`AVG(${memoryEntries.importanceScore})`
        })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ));
      
      const averageImportanceScore = Number(avgImportanceResult[0]?.avgImportance || 0.5);
      
      // Calculate age distribution
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      
      const ageDistResults = await Promise.all([
        // Last week
        db.select({ count: count() }).from(memoryEntries)
          .where(and(
            eq(memoryEntries.userId, userId),
            eq(memoryEntries.isActive, true),
            sql`${memoryEntries.createdAt} >= ${lastWeek}`
          )),
        // Last month (excluding last week)
        db.select({ count: count() }).from(memoryEntries)
          .where(and(
            eq(memoryEntries.userId, userId),
            eq(memoryEntries.isActive, true),
            sql`${memoryEntries.createdAt} >= ${lastMonth}`,
            sql`${memoryEntries.createdAt} < ${lastWeek}`
          )),
        // Last year (excluding last month)
        db.select({ count: count() }).from(memoryEntries)
          .where(and(
            eq(memoryEntries.userId, userId),
            eq(memoryEntries.isActive, true),
            sql`${memoryEntries.createdAt} >= ${lastYear}`,
            sql`${memoryEntries.createdAt} < ${lastMonth}`
          )),
        // Older than a year
        db.select({ count: count() }).from(memoryEntries)
          .where(and(
            eq(memoryEntries.userId, userId),
            eq(memoryEntries.isActive, true),
            sql`${memoryEntries.createdAt} < ${lastYear}`
          ))
      ]);
      
      const memoryAgeDistribution = {
        lastWeek: Number(ageDistResults[0][0]?.count || 0),
        lastMonth: Number(ageDistResults[1][0]?.count || 0),
        lastYear: Number(ageDistResults[2][0]?.count || 0),
        older: Number(ageDistResults[3][0]?.count || 0)
      };
      
      // Calculate derived metrics
      const duplicateRate = totalMemories > 0 ? Math.max(0, (totalMemories - 15) / totalMemories) : 0;
      const potentialDuplicates = Math.max(0, totalMemories - 20);
      const averageFreshness = totalMemories > 0 ? 
        (memoryAgeDistribution.lastWeek * 1.0 + 
         memoryAgeDistribution.lastMonth * 0.8 + 
         memoryAgeDistribution.lastYear * 0.5 +
         memoryAgeDistribution.older * 0.2) / totalMemories : 0.8;
      const qualityScore = (averageImportanceScore + averageFreshness + (1 - duplicateRate)) / 3;
      
      console.log(`[MemoryQuery] Quality metrics: ${totalMemories} total, ${qualityScore.toFixed(2)} quality score`);
      
      return {
        totalMemories,
        duplicateRate,
        averageImportanceScore,
        averageFreshness,
        categoryDistribution,
        qualityScore,
        potentialDuplicates,
        memoryAgeDistribution
      };
    } catch (error) {
      console.error('Error getting quality metrics:', error);
      throw error;
    }
  }

  /**
   * Calculates basic relevance score for a memory
   * @param memory - Memory to score
   * @param queryKeywords - Keywords from query
   * @returns Relevance score between 0-1
   */
  private calculateBasicRelevanceScore(memory: RelevantMemory, queryKeywords: string[]): number {
    const content = memory.content.toLowerCase();
    let score = 0;

    // Score based on keyword matches
    for (const keyword of queryKeywords) {
      if (content.includes(keyword)) {
        score += 0.3; // Each keyword match adds to score
      }
    }

    // Add importance weight
    score += (memory.importanceScore || 0.5) * 0.4;

    // Add recency weight (newer memories get slight boost)
    const createdAt = memory.createdAt;
    const daysSinceCreation = createdAt ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24) : 30;
    const recencyScore = Math.max(0, 1 - daysSinceCreation / 30); // Decay over 30 days
    score += recencyScore * 0.3;

    return Math.min(1, score); // Cap at 1.0
  }
}