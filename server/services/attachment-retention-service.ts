
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
  categorizeAttachment(fileName: string, fileType: string, context?: string): {
    category: 'high' | 'medium' | 'low';
    retentionDays: number;
    reason: string;
  } {
    const lowerFileName = fileName.toLowerCase();
    const lowerContext = context?.toLowerCase() || '';
    
    // High-value indicators
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
      return {
        category: 'high',
        retentionDays: this.durations.highValueRetentionDays,
        reason: 'Medical/health document detected'
      };
    }

    // Medium-value indicators
    if (
      lowerFileName.includes('plan') ||
      lowerFileName.includes('routine') ||
      lowerFileName.includes('workout') ||
      lowerContext.includes('nutrition plan') ||
      lowerContext.includes('exercise')
    ) {
      return {
        category: 'medium',
        retentionDays: this.durations.mediumValueRetentionDays,
        reason: 'Health plan or routine document'
      };
    }

    // Low-value (default for photos and temporary files)
    return {
      category: 'low',
      retentionDays: this.durations.lowValueRetentionDays,
      reason: 'Temporary or reference file'
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
