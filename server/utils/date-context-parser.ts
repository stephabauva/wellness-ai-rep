/**
 * Date Context Parser for Nutrition Inference
 * Parses relative dates from conversation context and converts to absolute timestamps
 */

// Helper function to log with service context
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  console[level](`[DateContextParser] ${message}`, data || '');
};

export interface DateContext {
  date: Date;
  confidence: 'high' | 'medium' | 'low';
  source: 'explicit' | 'relative' | 'inferred' | 'default';
  originalText?: string;
}

export class DateContextParser {
  private static readonly DAYS_OF_WEEK = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];

  private static readonly RELATIVE_PATTERNS = {
    // Today patterns
    today: /\b(?:today|this morning|this afternoon|this evening|right now|currently)\b/gi,
    
    // Yesterday patterns
    yesterday: /\b(?:yesterday|last night)\b/gi,
    
    // Days ago patterns
    daysAgo: /\b(\d+)\s+days?\s+ago\b/gi,
    
    // Day of week patterns
    lastDayOfWeek: /\blast\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
    thisDayOfWeek: /\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi,
    
    // Week patterns
    lastWeek: /\blast\s+week\b/gi,
    thisWeek: /\bthis\s+week\b/gi,
    
    // Month patterns
    lastMonth: /\blast\s+month\b/gi,
    thisMonth: /\bthis\s+month\b/gi,
    
    // Explicit date patterns (MM/DD, MM/DD/YYYY, etc.)
    explicitDate: /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g,
    
    // Time patterns (morning, afternoon, evening)
    timeOfDay: /\b(morning|afternoon|evening|night)\b/gi,
    
    // Meal time context
    mealTime: /\b(breakfast|lunch|dinner|brunch)\b/gi
  };

  /**
   * Parse date context from conversation text
   */
  public static parseDateContext(
    text: string,
    currentDate: Date = new Date(),
    timezone?: string
  ): DateContext {
    try {
      log('info', 'Parsing date context from text', { textLength: text.length });
      
      const lowerText = text.toLowerCase();
      
      // Check for explicit dates first (highest confidence)
      const explicitDate = this.parseExplicitDate(text, currentDate);
      if (explicitDate) {
        return {
          date: explicitDate,
          confidence: 'high',
          source: 'explicit',
          originalText: text
        };
      }

      // Check for "today" patterns
      if (this.RELATIVE_PATTERNS.today.test(lowerText)) {
        return {
          date: new Date(currentDate),
          confidence: 'high',
          source: 'relative',
          originalText: text
        };
      }

      // Check for "yesterday" patterns
      if (this.RELATIVE_PATTERNS.yesterday.test(lowerText)) {
        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          date: yesterday,
          confidence: 'high',
          source: 'relative',
          originalText: text
        };
      }

      // Check for "X days ago" patterns
      const daysAgoMatch = Array.from(lowerText.matchAll(this.RELATIVE_PATTERNS.daysAgo));
      if (daysAgoMatch.length > 0) {
        const daysAgo = parseInt(daysAgoMatch[0][1]);
        if (!isNaN(daysAgo) && daysAgo > 0 && daysAgo <= 30) {
          const pastDate = new Date(currentDate);
          pastDate.setDate(pastDate.getDate() - daysAgo);
          return {
            date: pastDate,
            confidence: 'high',
            source: 'relative',
            originalText: text
          };
        }
      }

      // Check for "last [day of week]" patterns
      const lastDayMatch = Array.from(lowerText.matchAll(this.RELATIVE_PATTERNS.lastDayOfWeek));
      if (lastDayMatch.length > 0) {
        const dayName = lastDayMatch[0][1].toLowerCase();
        const dayIndex = this.DAYS_OF_WEEK.indexOf(dayName);
        if (dayIndex !== -1) {
          const lastDay = this.getLastDayOfWeek(currentDate, dayIndex);
          return {
            date: lastDay,
            confidence: 'medium',
            source: 'relative',
            originalText: text
          };
        }
      }

      // Check for "this [day of week]" patterns
      const thisDayMatch = Array.from(lowerText.matchAll(this.RELATIVE_PATTERNS.thisDayOfWeek));
      if (thisDayMatch.length > 0) {
        const dayName = thisDayMatch[0][1].toLowerCase();
        const dayIndex = this.DAYS_OF_WEEK.indexOf(dayName);
        if (dayIndex !== -1) {
          const thisDay = this.getThisDayOfWeek(currentDate, dayIndex);
          return {
            date: thisDay,
            confidence: 'medium',
            source: 'relative',
            originalText: text
          };
        }
      }

      // Check for meal time context to infer time of day
      const mealTimeMatch = Array.from(lowerText.matchAll(this.RELATIVE_PATTERNS.mealTime));
      if (mealTimeMatch.length > 0) {
        const mealType = mealTimeMatch[0][1].toLowerCase();
        const dateWithMealTime = this.adjustDateForMealTime(new Date(currentDate), mealType);
        return {
          date: dateWithMealTime,
          confidence: 'medium',
          source: 'inferred',
          originalText: text
        };
      }

      // Default to current date if no specific date context found
      log('info', 'No specific date context found, defaulting to current date');
      return {
        date: new Date(currentDate),
        confidence: 'low',
        source: 'default',
        originalText: text
      };

    } catch (error) {
      log('error', 'Failed to parse date context:', error);
      return {
        date: new Date(currentDate),
        confidence: 'low',
        source: 'default',
        originalText: text
      };
    }
  }

  /**
   * Parse explicit date formats (MM/DD, MM/DD/YYYY)
   */
  private static parseExplicitDate(text: string, currentDate: Date): Date | null {
    const matches = Array.from(text.matchAll(this.RELATIVE_PATTERNS.explicitDate));
    
    for (const match of matches) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : currentDate.getFullYear();
      
      // Validate month and day
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        // Handle 2-digit years
        const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
        
        try {
          const parsedDate = new Date(fullYear, month - 1, day);
          // Verify the date is valid (handles cases like Feb 31)
          if (parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day) {
            return parsedDate;
          }
        } catch (error) {
          log('warn', 'Invalid explicit date format:', { month, day, year });
        }
      }
    }
    
    return null;
  }

  /**
   * Get the last occurrence of a specific day of the week
   */
  private static getLastDayOfWeek(currentDate: Date, targetDay: number): Date {
    const current = new Date(currentDate);
    const currentDay = current.getDay();
    
    // Calculate days to subtract to get to the target day
    let daysBack = currentDay - targetDay;
    if (daysBack <= 0) {
      daysBack += 7; // Go back to previous week
    }
    
    current.setDate(current.getDate() - daysBack);
    return current;
  }

  /**
   * Get the next or current occurrence of a specific day of the week in the current week
   */
  private static getThisDayOfWeek(currentDate: Date, targetDay: number): Date {
    const current = new Date(currentDate);
    const currentDay = current.getDay();
    
    // Calculate days to add/subtract to get to the target day
    let daysDiff = targetDay - currentDay;
    
    // If the target day is in the past this week, assume they mean next week
    if (daysDiff < 0) {
      daysDiff += 7;
    }
    
    current.setDate(current.getDate() + daysDiff);
    return current;
  }

  /**
   * Adjust date time based on meal type
   */
  private static adjustDateForMealTime(date: Date, mealType: string): Date {
    const adjustedDate = new Date(date);
    
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        adjustedDate.setHours(7, 0, 0, 0); // 7:00 AM
        break;
      case 'brunch':
        adjustedDate.setHours(10, 0, 0, 0); // 10:00 AM
        break;
      case 'lunch':
        adjustedDate.setHours(12, 0, 0, 0); // 12:00 PM
        break;
      case 'dinner':
        adjustedDate.setHours(18, 0, 0, 0); // 6:00 PM
        break;
      default:
        // Keep current time for unknown meal types
        break;
    }
    
    return adjustedDate;
  }

  /**
   * Parse relative time context (morning, afternoon, evening)
   */
  public static parseTimeContext(text: string, baseDate: Date): Date {
    const timeMatch = Array.from(text.toLowerCase().matchAll(this.RELATIVE_PATTERNS.timeOfDay));
    if (timeMatch.length === 0) {
      return baseDate;
    }

    const timeOfDay = timeMatch[0][1].toLowerCase();
    const adjustedDate = new Date(baseDate);

    switch (timeOfDay) {
      case 'morning':
        adjustedDate.setHours(8, 0, 0, 0); // 8:00 AM
        break;
      case 'afternoon':
        adjustedDate.setHours(14, 0, 0, 0); // 2:00 PM
        break;
      case 'evening':
        adjustedDate.setHours(19, 0, 0, 0); // 7:00 PM
        break;
      case 'night':
        adjustedDate.setHours(21, 0, 0, 0); // 9:00 PM
        break;
    }

    return adjustedDate;
  }

  /**
   * Utility function to handle timezone conversion
   */
  public static convertToTimezone(date: Date, timezone?: string): Date {
    if (!timezone) {
      return date;
    }

    try {
      // Use Intl.DateTimeFormat for timezone conversion
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(date);
      const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
      const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
      const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      log('warn', 'Failed to convert timezone, using original date:', error);
      return date;
    }
  }

  /**
   * Validate that a parsed date is reasonable (not too far in the past or future)
   */
  public static validateDateRange(date: Date, currentDate: Date = new Date()): boolean {
    const timeDiff = date.getTime() - currentDate.getTime();
    const daysDiff = Math.abs(timeDiff / (1000 * 60 * 60 * 24));
    
    // Allow dates within 30 days in the past
    if (date <= currentDate && daysDiff <= 30) {
      return true;
    }
    
    // Allow dates within 7 days in the future
    if (date > currentDate && daysDiff <= 7) {
      return true;
    }
    
    return false;
  }

  /**
   * Extract all potential date references from text
   */
  public static extractAllDateReferences(text: string): string[] {
    const references: string[] = [];
    const lowerText = text.toLowerCase();

    // Extract all matches for different patterns
    Object.entries(this.RELATIVE_PATTERNS).forEach(([key, pattern]) => {
      const matches = lowerText.match(pattern);
      if (matches) {
        references.push(...matches);
      }
    });

    return Array.from(new Set(references)); // Remove duplicates
  }
}

// Export singleton instance for convenience
export const dateContextParser = DateContextParser;