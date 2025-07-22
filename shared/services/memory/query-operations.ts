/**
 * @used-by shared/memory-service - Memory query operations utilities
 * @service-type utility
 * @extracted-from memory-service.ts lines 323-544
 */
import { db } from "@shared/database/db";
import { 
  memoryEntries, 
  type MemoryEntry,
  type MemoryCategory
} from '../../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from "../logger-service";
import { mapAndSortMemories, mapMemoryFields, processRecentMemoriesForOverview } from './memory-mappers';
import { MemoryQualityService, type MemoryQualityMetrics } from './quality-metrics';

export class MemoryQueryOperations {
  constructor(private qualityService: MemoryQualityService) {}

  // Tier 2 C: Optimized user memories with caching and filtering
  async getUserMemories(userId: number, category?: MemoryCategory): Promise<MemoryEntry[]> {
    try {
      // Force fresh data by bypassing cache
      const allMemories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ))
        .orderBy(desc(memoryEntries.importanceScore));

      // Apply category filter if specified
      let filteredMemories = allMemories;
      if (category) {
        filteredMemories = allMemories.filter((memory: any) => memory.category === category);
      }

      // Map and sort memories using utility functions
      const sortedMemories = mapAndSortMemories(filteredMemories);
      
      logger.memory('getUserMemories', { userId, count: sortedMemories.length });
      return sortedMemories;
    } catch (error) {
      logger.error('Error getting user memories', error as Error, { service: 'memory' });
      return [];
    }
  }

  // Optimized paginated user memories for better performance
  async getUserMemoriesPaginated(userId: number, options: {
    page: number;
    limit: number;
    offset: number;
    category?: MemoryCategory;
  }): Promise<{
    memories: MemoryEntry[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    try {
      const { page, limit, offset, category } = options;
      
      // Build optimized query with database-level filtering and pagination
      let query = db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true),
          ...(category ? [eq(memoryEntries.category, category)] : [])
        ))
        .orderBy(desc(memoryEntries.importanceScore), desc(memoryEntries.createdAt));

      // Get total count for pagination info
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true),
          ...(category ? [eq(memoryEntries.category, category)] : [])
        ));

      // Execute both queries in parallel for better performance
      const [memories, countResult] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
      ]);

      const totalCount = countResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = offset + limit < totalCount;

      // Map database fields to frontend expected format
      const mappedMemories = memories.map(mapMemoryFields);

      logger.memory('getUserMemoriesPaginated', { 
        userId, 
        count: mappedMemories.length 
      });

      return {
        memories: mappedMemories,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore
        }
      };
    } catch (error) {
      logger.error('Error getting paginated user memories', error as Error, { service: 'memory' });
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

  // Optimized memory overview for faster performance
  async getMemoryOverviewOptimized(userId: number): Promise<{
    total: number;
    categories: Record<string, number>;
    recentMemories: Array<{
      id: string;
      content: string;
      category: string;
      createdAt: string;
    }>;
    qualityMetrics: {
      qualityScore: number;
      duplicateRate: number;
      potentialDuplicates: number;
      averageImportanceScore: number;
      averageFreshness: number;
    };
  }> {
    try {
      // Run optimized parallel queries for better performance
      const [categoryCounts, recentMemories, qualityMetrics] = await Promise.all([
        // Get category counts with single aggregation query
        db
          .select({
            category: memoryEntries.category,
            count: sql<number>`count(*)`
          })
          .from(memoryEntries)
          .where(and(
            eq(memoryEntries.userId, userId),
            eq(memoryEntries.isActive, true)
          ))
          .groupBy(memoryEntries.category),
        
        // Get only the 3 most recent memories
        db
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
          .limit(3),
        
        // Get quality metrics
        this.qualityService.getMemoryQualityMetrics(userId)
      ]);

      // Process category counts
      const categories: Record<string, number> = {
        preferences: 0,
        personal_context: 0,
        instructions: 0,
        food_diet: 0,
        goals: 0
      };

      let total = 0;
      for (const categoryCount of categoryCounts) {
        const count = Number(categoryCount.count);
        categories[categoryCount.category] = count;
        total += count;
      }

      // Process recent memories with truncated content
      const processedRecentMemories = processRecentMemoriesForOverview(recentMemories);

      logger.memory('getMemoryOverviewOptimized', { userId, count: processedRecentMemories.length });

      return {
        total,
        categories,
        recentMemories: processedRecentMemories,
        qualityMetrics: {
          qualityScore: qualityMetrics.qualityScore,
          duplicateRate: qualityMetrics.duplicateRate,
          potentialDuplicates: qualityMetrics.potentialDuplicates,
          averageImportanceScore: qualityMetrics.averageImportanceScore,
          averageFreshness: qualityMetrics.averageFreshness
        }
      };
    } catch (error) {
      logger.error('Error getting optimized memory overview', error as Error, { service: 'memory' });
      return {
        total: 0,
        categories: {
          preferences: 0,
          personal_context: 0,
          instructions: 0,
          food_diet: 0,
          goals: 0
        },
        recentMemories: [],
        qualityMetrics: {
          qualityScore: 0,
          duplicateRate: 0,
          potentialDuplicates: 0,
          averageImportanceScore: 0,
          averageFreshness: 0
        }
      };
    }
  }

  // Memory Quality Metrics wrapper
  async getMemoryQualityMetrics(userId: number): Promise<MemoryQualityMetrics> {
    return this.qualityService.getMemoryQualityMetrics(userId);
  }
}