import { HealthData, InsertHealthData } from '@shared/schema';
import { storage } from '../storage';

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedRecord?: HealthData;
  confidence: number;
  reason: string;
}

export interface DeduplicationOptions {
  timeWindowHours?: number; // Default: 1 hour
  exactValueMatch?: boolean; // Default: true
  checkSource?: boolean; // Default: true
}

export class HealthDataDeduplicationService {
  private static readonly DEFAULT_TIME_WINDOW_HOURS = 1;
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.9;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Check if a new health data point is a duplicate of existing data
   */
  static async checkForDuplicates(
    newDataPoint: InsertHealthData,
    options: DeduplicationOptions = {}
  ): Promise<DuplicateDetectionResult> {
    const {
      timeWindowHours = this.DEFAULT_TIME_WINDOW_HOURS,
      exactValueMatch = true,
      checkSource = true
    } = options;

    try {
      // Get existing data for the user within the time window
      const existingData = await storage.getHealthData(newDataPoint.userId, '30days');
      
      if (!existingData || existingData.length === 0) {
        return {
          isDuplicate: false,
          confidence: 0,
          reason: 'No existing data to compare against'
        };
      }

      // Create timestamp for comparison
      const newTimestamp = new Date();
      const timeWindowMs = timeWindowHours * 60 * 60 * 1000;

      // Find potential duplicates
      const potentialDuplicates = existingData.filter(existing => {
        // Must be same data type
        if (existing.dataType !== newDataPoint.dataType) return false;

        // Must be within time window
        if (!existing.timestamp) return false;
        const existingTime = new Date(existing.timestamp).getTime();
        const timeDiff = Math.abs(newTimestamp.getTime() - existingTime);
        
        return timeDiff <= timeWindowMs;
      });

      if (potentialDuplicates.length === 0) {
        return {
          isDuplicate: false,
          confidence: 0,
          reason: 'No records found within time window'
        };
      }

      // Analyze each potential duplicate
      let bestMatch: HealthData | undefined;
      let highestConfidence = 0;
      let matchReason = '';

      for (const existing of potentialDuplicates) {
        const analysis = this.analyzeDuplicate(newDataPoint, existing, {
          exactValueMatch,
          checkSource
        });

        if (analysis.confidence > highestConfidence) {
          highestConfidence = analysis.confidence;
          bestMatch = existing;
          matchReason = analysis.reason;
        }
      }

      return {
        isDuplicate: highestConfidence >= this.MEDIUM_CONFIDENCE_THRESHOLD,
        matchedRecord: bestMatch,
        confidence: highestConfidence,
        reason: matchReason
      };

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return {
        isDuplicate: false,
        confidence: 0,
        reason: `Error during duplicate check: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze similarity between two health data points
   */
  private static analyzeDuplicate(
    newData: InsertHealthData,
    existingData: HealthData,
    options: { exactValueMatch: boolean; checkSource: boolean }
  ): { confidence: number; reason: string } {
    let confidence = 0;
    const reasons: string[] = [];

    // Exact value match (high weight)
    if (options.exactValueMatch && newData.value === existingData.value) {
      confidence += 0.6;
      reasons.push('exact value match');
    } else if (this.isValueSimilar(newData.value, existingData.value)) {
      confidence += 0.3;
      reasons.push('similar value');
    }

    // Unit match (medium weight)
    if (newData.unit === existingData.unit) {
      confidence += 0.2;
      reasons.push('unit match');
    }

    // Source match (medium weight)
    if (options.checkSource && newData.source === existingData.source) {
      confidence += 0.15;
      reasons.push('source match');
    }

    // Category match (low weight - should always match for same dataType)
    if (newData.category === existingData.category) {
      confidence += 0.05;
      reasons.push('category match');
    }

    return {
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      reason: reasons.length > 0 ? reasons.join(', ') : 'no significant matches'
    };
  }

  /**
   * Check if two values are similar (for numeric values)
   */
  private static isValueSimilar(value1: string, value2: string): boolean {
    // Try to parse as numbers
    const num1 = parseFloat(value1);
    const num2 = parseFloat(value2);

    if (!isNaN(num1) && !isNaN(num2)) {
      // For numeric values, allow small variance (1% or 0.1 units)
      const diff = Math.abs(num1 - num2);
      const percentDiff = diff / Math.max(num1, num2);
      
      return diff <= 0.1 || percentDiff <= 0.01;
    }

    // For non-numeric values, check string similarity
    return value1.toLowerCase().trim() === value2.toLowerCase().trim();
  }

  /**
   * Batch process multiple data points for duplicates
   */
  static async batchCheckDuplicates(
    dataPoints: InsertHealthData[],
    options: DeduplicationOptions = {}
  ): Promise<Array<{ dataPoint: InsertHealthData; duplicateCheck: DuplicateDetectionResult }>> {
    const results = [];

    for (const dataPoint of dataPoints) {
      const duplicateCheck = await this.checkForDuplicates(dataPoint, options);
      results.push({ dataPoint, duplicateCheck });
    }

    return results;
  }

  /**
   * Filter out duplicates from a batch of data points
   */
  static async filterDuplicates(
    dataPoints: InsertHealthData[],
    options: DeduplicationOptions = {}
  ): Promise<{
    unique: InsertHealthData[];
    duplicates: Array<{ dataPoint: InsertHealthData; duplicateCheck: DuplicateDetectionResult }>;
  }> {
    const batchResults = await this.batchCheckDuplicates(dataPoints, options);
    
    const unique: InsertHealthData[] = [];
    const duplicates: Array<{ dataPoint: InsertHealthData; duplicateCheck: DuplicateDetectionResult }> = [];

    for (const result of batchResults) {
      if (result.duplicateCheck.isDuplicate) {
        duplicates.push(result);
      } else {
        unique.push(result.dataPoint);
      }
    }

    return { unique, duplicates };
  }

  /**
   * Get confidence level description
   */
  static getConfidenceDescription(confidence: number): string {
    if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      return 'High - Very likely duplicate';
    } else if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      return 'Medium - Possible duplicate';
    } else {
      return 'Low - Unlikely duplicate';
    }
  }

  /**
   * Suggest action based on confidence level
   */
  static getSuggestedAction(confidence: number): 'auto_skip' | 'user_review' | 'auto_import' {
    if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      return 'auto_skip';
    } else if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      return 'user_review';
    } else {
      return 'auto_import';
    }
  }
}