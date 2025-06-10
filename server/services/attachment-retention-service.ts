
import { join } from 'path';
import { existsSync, unlinkSync, statSync } from 'fs';
import { db } from '../db';
import { conversations, conversationMessages } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

export interface AttachmentRetentionConfig {
  // High-value categories (keep indefinitely)
  medicalDocuments: string[];
  labResults: string[];
  prescriptions: string[];
  
  // Medium-value categories (keep for 90 days)
  nutritionPlans: string[];
  exerciseRoutines: string[];
  
  // Low-value categories (keep for 30 days)
  foodPhotos: string[];
  screenshots: string[];
  temporary: string[];
}

export interface RetentionDurations {
  highValueRetentionDays: number;    // -1 for indefinite
  mediumValueRetentionDays: number;  // default 90
  lowValueRetentionDays: number;     // default 30
}

const DEFAULT_RETENTION_CONFIG: AttachmentRetentionConfig = {
  medicalDocuments: ['pdf', 'doc', 'docx'],
  labResults: ['pdf', 'jpg', 'jpeg', 'png'],
  prescriptions: ['pdf', 'jpg', 'jpeg', 'png'],
  nutritionPlans: ['pdf', 'doc', 'docx'],
  exerciseRoutines: ['pdf', 'doc', 'docx'],
  foodPhotos: ['jpg', 'jpeg', 'png', 'webp'],
  screenshots: ['png', 'jpg', 'jpeg'],
  temporary: ['txt', 'csv']
};

export class AttachmentRetentionService {
  private config: AttachmentRetentionConfig;
  private durations: RetentionDurations;

  constructor(
    config: AttachmentRetentionConfig = DEFAULT_RETENTION_CONFIG,
    durations: RetentionDurations = {
      highValueRetentionDays: -1,
      mediumValueRetentionDays: 90,
      lowValueRetentionDays: 30
    }
  ) {
    this.config = config;
    this.durations = durations;
  }

  /**
   * Categorize attachment based on filename, content analysis, and context
   */
  async categorizeAttachment(fileName: string, fileType: string, context?: string): Promise<{
    category: 'high' | 'medium' | 'low';
    retentionDays: number;
    reason: string;
    suggestedCategoryId?: string;
    suggestedCategoryName?: string;
  }> {
    const lowerFileName = fileName.toLowerCase();
    const lowerContext = context?.toLowerCase() || '';
    const isImage = fileType.startsWith('image/');
    
    // Import database functions
    const { db } = await import('../db.js');
    const { fileCategories } = await import('../../shared/schema.js');
    const { eq, isNull } = await import('drizzle-orm');
    
    // Get system categories
    const systemCategories = await db
      .select()
      .from(fileCategories)
      .where(isNull(fileCategories.userId));
    
    const getCategory = (name: string) => systemCategories.find(cat => cat.name === name);
    
    // Medical/health indicators (high value)
    if (
      lowerFileName.includes('blood') ||
      lowerFileName.includes('lab') ||
      lowerFileName.includes('test') ||
      lowerFileName.includes('report') ||
      lowerFileName.includes('prescription') ||
      lowerFileName.includes('medical') ||
      lowerContext.includes('blood work') ||
      lowerContext.includes('lab result') ||
      lowerContext.includes('medical')
    ) {
      const medicalCategory = getCategory('Medical');
      return {
        category: 'high',
        retentionDays: this.durations.highValueRetentionDays,
        reason: 'Medical/health document detected',
        suggestedCategoryId: medicalCategory?.id,
        suggestedCategoryName: 'Medical'
      };
    }

    // Fitness indicators (medium value)
    if (
      lowerFileName.includes('plan') ||
      lowerFileName.includes('routine') ||
      lowerFileName.includes('workout') ||
      lowerFileName.includes('fitness') ||
      lowerContext.includes('nutrition plan') ||
      lowerContext.includes('exercise') ||
      lowerContext.includes('fitness')
    ) {
      const fitnessCategory = getCategory('Fitness');
      return {
        category: 'medium',
        retentionDays: this.durations.mediumValueRetentionDays,
        reason: 'Fitness plan or routine document',
        suggestedCategoryId: fitnessCategory?.id,
        suggestedCategoryName: 'Fitness'
      };
    }

    // Financial indicators (medium value)
    if (
      lowerFileName.includes('receipt') ||
      lowerFileName.includes('invoice') ||
      lowerFileName.includes('tax') ||
      lowerFileName.includes('financial') ||
      lowerContext.includes('receipt') ||
      lowerContext.includes('invoice') ||
      lowerContext.includes('financial')
    ) {
      const financialCategory = getCategory('Financial');
      return {
        category: 'medium',
        retentionDays: this.durations.mediumValueRetentionDays,
        reason: 'Financial document detected',
        suggestedCategoryId: financialCategory?.id,
        suggestedCategoryName: 'Financial'
      };
    }

    // Work indicators (medium value)
    if (
      lowerFileName.includes('work') ||
      lowerFileName.includes('project') ||
      lowerFileName.includes('meeting') ||
      lowerFileName.includes('presentation') ||
      lowerContext.includes('work') ||
      lowerContext.includes('project') ||
      lowerContext.includes('meeting')
    ) {
      const workCategory = getCategory('Work');
      return {
        category: 'medium',
        retentionDays: this.durations.mediumValueRetentionDays,
        reason: 'Work-related document',
        suggestedCategoryId: workCategory?.id,
        suggestedCategoryName: 'Work'
      };
    }

    // Photo/image files (low value by default, but categorized as Photo)
    if (isImage || lowerContext.includes('photo') || lowerContext.includes('image')) {
      const photoCategory = getCategory('Photo');
      return {
        category: 'low',
        retentionDays: this.durations.lowValueRetentionDays,
        reason: 'Photo or image file',
        suggestedCategoryId: photoCategory?.id,
        suggestedCategoryName: 'Photo'
      };
    }

    // Personal indicators
    if (
      lowerFileName.includes('personal') ||
      lowerFileName.includes('diary') ||
      lowerFileName.includes('journal') ||
      lowerContext.includes('personal')
    ) {
      const personalCategory = getCategory('Personal');
      return {
        category: 'medium',
        retentionDays: this.durations.mediumValueRetentionDays,
        reason: 'Personal document',
        suggestedCategoryId: personalCategory?.id,
        suggestedCategoryName: 'Personal'
      };
    }

    // Default to General category (low value)
    const generalCategory = getCategory('General');
    return {
      category: 'low',
      retentionDays: this.durations.lowValueRetentionDays,
      reason: 'General document or file',
      suggestedCategoryId: generalCategory?.id,
      suggestedCategoryName: 'General'
    };
  }

  /**
   * Clean up expired attachments based on retention policy
   */
  async cleanupExpiredAttachments(): Promise<{
    deletedFiles: number;
    freedSpace: number;
  }> {
    const now = new Date();
    let deletedFiles = 0;
    let freedSpace = 0;

    try {
      // Get all conversations with their messages and attachments
      const conversationsWithMessages = await db
        .select()
        .from(conversations)
        .leftJoin(
          conversationMessages,
          eq(conversations.id, conversationMessages.conversationId)
        );

      const processedFiles = new Set<string>();

      for (const row of conversationsWithMessages) {
        const message = row.conversation_messages;
        if (!message?.metadata?.attachments) continue;

        const attachments = message.metadata.attachments as any[];
        
        for (const attachment of attachments) {
          if (processedFiles.has(attachment.fileName)) continue;
          processedFiles.add(attachment.fileName);

          const filePath = join(process.cwd(), 'uploads', attachment.fileName);
          if (!existsSync(filePath)) continue;

          const fileStats = statSync(filePath);
          const fileAge = now.getTime() - fileStats.mtime.getTime();
          const daysSinceCreation = Math.floor(fileAge / (1000 * 60 * 60 * 24));

          const categorization = this.categorizeAttachment(
            attachment.displayName || attachment.fileName,
            attachment.fileType,
            message.content
          );

          // Skip if file should be kept indefinitely
          if (categorization.retentionDays === -1) continue;

          // Delete if expired
          if (daysSinceCreation > categorization.retentionDays) {
            try {
              const fileSize = fileStats.size;
              unlinkSync(filePath);
              deletedFiles++;
              freedSpace += fileSize;
              
              console.log(`Deleted expired ${categorization.category}-value file: ${attachment.fileName} (${daysSinceCreation} days old)`);
            } catch (error) {
              console.error(`Failed to delete file ${attachment.fileName}:`, error);
            }
          }
        }
      }

      return { deletedFiles, freedSpace };
    } catch (error) {
      console.error('Error during attachment cleanup:', error);
      return { deletedFiles: 0, freedSpace: 0 };
    }
  }

  /**
   * Get retention info for a specific attachment
   */
  getRetentionInfo(fileName: string, fileType: string, context?: string) {
    return this.categorizeAttachment(fileName, fileType, context);
  }

  /**
   * Update retention durations
   */
  updateRetentionDurations(durations: Partial<RetentionDurations>) {
    this.durations = { ...this.durations, ...durations };
  }

  /**
   * Get current retention durations
   */
  getRetentionDurations(): RetentionDurations {
    return { ...this.durations };
  }
}

export const attachmentRetentionService = new AttachmentRetentionService();
