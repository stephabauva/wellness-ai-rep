/**
 * Memory quality metrics and analytics service
 * @used-by memory/memory-service - Quality analysis and metrics calculation
 */

import { db } from "@shared/database/db";
import { memoryEntries } from "../../schema";
import { eq, and } from 'drizzle-orm';
import { logger } from "@shared/services/logger-service";
import {
  calculateJaccardSimilarity,
  calculateAverageContentLength,
  calculateCategoryBalance,
  calculateQualityScore,
  normalizeContent
} from './memory-utils';

export interface MemoryQualityMetrics {
  totalMemories: number;
  duplicateRate: number;
  averageImportanceScore: number;
  averageFreshness: number;
  categoryDistribution: Record<string, number>;
  qualityScore: number;
  potentialDuplicates: number;
  memoryAgeDistribution: {
    lastWeek: number;
    lastMonth: number;
    lastYear: number;
    older: number;
  };
}

export class MemoryQualityService {

  /**
   * Calculate comprehensive memory quality metrics for a user
   */
  async getMemoryQualityMetrics(userId: number): Promise<MemoryQualityMetrics> {
    try {
      const memories = await db
        .select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.userId, userId),
          eq(memoryEntries.isActive, true)
        ));

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      // Calculate basic metrics
      const totalMemories = memories.length;
      const averageImportanceScore = totalMemories > 0 
        ? memories.reduce((sum: number, m: any) => sum + (m.importanceScore || 0), 0) / totalMemories 
        : 0;

      // Calculate freshness (based on last access vs creation date)
      const freshnessScores = memories.map((m: any) => {
        const created = new Date(m.createdAt);
        const accessed = m.lastAccessed ? new Date(m.lastAccessed) : created;
        const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceAccess = (now.getTime() - accessed.getTime()) / (1000 * 60 * 60 * 24);
        
        // Fresher memories that have been accessed recently get higher scores
        return Math.max(0, 1 - (daysSinceAccess / 30)) * (m.accessCount || 0 + 1);
      });
      
      const averageFreshness = freshnessScores.length > 0 
        ? freshnessScores.reduce((sum: number, score: number) => sum + score, 0) / freshnessScores.length 
        : 0;

      // Category distribution
      const categoryDistribution: Record<string, number> = {};
      memories.forEach((m: any) => {
        const category = m.category || 'unknown';
        categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      });

      // Age distribution
      const memoryAgeDistribution = {
        lastWeek: memories.filter((m: any) => new Date(m.createdAt) >= oneWeekAgo).length,
        lastMonth: memories.filter((m: any) => new Date(m.createdAt) >= oneMonthAgo && new Date(m.createdAt) < oneWeekAgo).length,
        lastYear: memories.filter((m: any) => new Date(m.createdAt) >= oneYearAgo && new Date(m.createdAt) < oneMonthAgo).length,
        older: memories.filter((m: any) => new Date(m.createdAt) < oneYearAgo).length
      };

      // Detect potential duplicates using simple content similarity
      const potentialDuplicates = this.detectPotentialDuplicates(memories);

      // Calculate duplicate rate
      const duplicateRate = totalMemories > 0 ? potentialDuplicates / totalMemories : 0;

      // Calculate overall quality score (0-1)
      const qualityScore = calculateQualityScore({
        duplicateRate,
        averageImportanceScore,
        averageFreshness,
        categoryBalance: calculateCategoryBalance(categoryDistribution),
        contentLength: calculateAverageContentLength(memories)
      });

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
      logger.error('Error calculating memory quality metrics', error as Error, { service: 'memory' });
      return {
        totalMemories: 0,
        duplicateRate: 0,
        averageImportanceScore: 0,
        averageFreshness: 0,
        categoryDistribution: {},
        qualityScore: 0,
        potentialDuplicates: 0,
        memoryAgeDistribution: { lastWeek: 0, lastMonth: 0, lastYear: 0, older: 0 }
      };
    }
  }

  /**
   * Detect potential duplicate memories using content similarity
   */
  private detectPotentialDuplicates(memories: any[]): number {
    const duplicates = new Set<string>();
    const processed = new Set<string>();
    
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      if (processed.has(memory.id)) continue;
      
      const normalizedContent = normalizeContent(memory.content);
      
      for (let j = i + 1; j < memories.length; j++) {
        const candidate = memories[j];
        if (processed.has(candidate.id)) continue;
        
        const candidateNormalized = normalizeContent(candidate.content);
        const similarity = calculateJaccardSimilarity(normalizedContent, candidateNormalized);
        
        if (similarity > 0.7) {
          duplicates.add(candidate.id);
          processed.add(candidate.id);
        }
      }
      
      processed.add(memory.id);
    }
    
    return duplicates.size;
  }
}