import { describe, it, expect, beforeEach } from 'vitest';
import { DateContextParser } from '../services/health/date-context-parser.js';

describe('DateContextParser', () => {
  let currentDate: Date;

  beforeEach(() => {
    // Use a fixed date for consistent testing: Wednesday, March 15, 2023, 10:00 AM
    currentDate = new Date('2023-03-15T10:00:00.000Z');
  });

  describe('parseDateContext', () => {
    describe('explicit date patterns', () => {
      it('should parse MM/DD format', () => {
        const result = DateContextParser.parseDateContext('I ate pizza on 03/10', currentDate);
        expect(result.confidence).toBe('high');
        expect(result.source).toBe('explicit');
        expect(result.date.getMonth()).toBe(2); // March (0-indexed)
        expect(result.date.getDate()).toBe(10);
        expect(result.date.getFullYear()).toBe(2023);
      });

      it('should parse MM/DD/YYYY format', () => {
        const result = DateContextParser.parseDateContext('I had lunch on 12/25/2022', currentDate);
        expect(result.confidence).toBe('high');
        expect(result.source).toBe('explicit');
        expect(result.date.getMonth()).toBe(11); // December (0-indexed)
        expect(result.date.getDate()).toBe(25);
        expect(result.date.getFullYear()).toBe(2022);
      });

      it('should handle invalid explicit dates gracefully', () => {
        const result = DateContextParser.parseDateContext('I ate on 02/30', currentDate);
        expect(result.source).toBe('default');
        expect(result.confidence).toBe('low');
      });
    });

    describe('relative date patterns', () => {
      it('should parse "today" references', () => {
        const testCases = [
          { text: 'today', confidence: 'high', source: 'relative' },
          { text: 'this morning', confidence: 'high', source: 'relative' },
          { text: 'this evening', confidence: 'high', source: 'relative' },
          { text: 'currently', confidence: 'high', source: 'relative' }
        ];

        testCases.forEach(({ text, confidence, source }) => {
          const result = DateContextParser.parseDateContext(text, currentDate);
          expect(result.confidence).toBe(confidence);
          expect(result.source).toBe(source);
          expect(result.date.toDateString()).toBe(currentDate.toDateString());
        });
      });

      it('should parse "yesterday" references', () => {
        const testCases = [
          { text: 'yesterday', confidence: 'high', source: 'relative' },
          { text: 'last night', confidence: 'high', source: 'relative' }
        ];

        testCases.forEach(({ text, confidence, source }) => {
          const result = DateContextParser.parseDateContext(text, currentDate);
          expect(result.confidence).toBe(confidence);
          expect(result.source).toBe(source);
          
          const expectedDate = new Date(currentDate);
          expectedDate.setDate(expectedDate.getDate() - 1);
          expect(result.date.toDateString()).toBe(expectedDate.toDateString());
        });
      });

      it('should parse "X days ago" patterns', () => {
        const result = DateContextParser.parseDateContext('I ate salad 3 days ago', currentDate);
        expect(result.confidence).toBe('high');
        expect(result.source).toBe('relative');
        
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() - 3);
        expect(result.date.toDateString()).toBe(expectedDate.toDateString());
      });

      it('should parse "last [day of week]" patterns', () => {
        // Current date is Wednesday, so "last Monday" should be 2 days ago
        const result = DateContextParser.parseDateContext('I had lunch last Monday', currentDate);
        expect(result.confidence).toBe('medium');
        expect(result.source).toBe('relative');
        
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() - 2); // Last Monday
        expect(result.date.toDateString()).toBe(expectedDate.toDateString());
      });

      it('should parse "this [day of week]" patterns for future days', () => {
        // Current date is Wednesday, so "this Friday" should be 2 days ahead
        const result = DateContextParser.parseDateContext('I will eat pizza this Friday', currentDate);
        expect(result.confidence).toBe('medium');
        expect(result.source).toBe('relative');
        
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() + 2); // This Friday
        expect(result.date.toDateString()).toBe(expectedDate.toDateString());
      });

      it('should handle edge cases for days ago', () => {
        // Test invalid values
        const invalidResult = DateContextParser.parseDateContext('I ate 50 days ago', currentDate);
        expect(invalidResult.source).toBe('default');

        // Test zero days
        const zeroResult = DateContextParser.parseDateContext('I ate 0 days ago', currentDate);
        expect(zeroResult.source).toBe('default');
      });
    });

    describe('meal time context', () => {
      it('should infer date from meal types', () => {
        const testCases = [
          { text: 'I had breakfast', hour: 7 },
          { text: 'Ate lunch', hour: 12 },
          { text: 'Had dinner', hour: 18 },
          { text: 'Enjoyed brunch', hour: 10 }
        ];

        testCases.forEach(({ text, hour }) => {
          const result = DateContextParser.parseDateContext(text, currentDate);
          expect(result.confidence).toBe('medium');
          expect(result.source).toBe('inferred');
          expect(result.date.getHours()).toBe(hour);
        });
      });
    });

    describe('default behavior', () => {
      it('should default to current date when no context found', () => {
        const result = DateContextParser.parseDateContext('I like food', currentDate);
        expect(result.confidence).toBe('low');
        expect(result.source).toBe('default');
        expect(result.date.toDateString()).toBe(currentDate.toDateString());
      });
    });
  });

  describe('parseTimeContext', () => {
    it('should adjust time based on time of day mentions', () => {
      const testCases = [
        { text: 'Good morning', hour: 8 },
        { text: 'This afternoon', hour: 14 },
        { text: 'At night', hour: 21 },
        { text: 'This evening', hour: 19 }
      ];

      testCases.forEach(({ text, hour }) => {
        const result = DateContextParser.parseTimeContext(text, currentDate);
        expect(result.getHours()).toBe(hour);
      });
    });

    it('should return original date if no time context found', () => {
      const result = DateContextParser.parseTimeContext('I ate food', currentDate);
      expect(result).toEqual(currentDate);
    });
  });

  describe('validateDateRange', () => {
    it('should accept dates within 30 days in the past', () => {
      const pastDate = new Date(currentDate);
      pastDate.setDate(pastDate.getDate() - 20);
      expect(DateContextParser.validateDateRange(pastDate, currentDate)).toBe(true);
    });

    it('should accept dates within 7 days in the future', () => {
      const futureDate = new Date(currentDate);
      futureDate.setDate(futureDate.getDate() + 5);
      expect(DateContextParser.validateDateRange(futureDate, currentDate)).toBe(true);
    });

    it('should reject dates too far in the past', () => {
      const farPastDate = new Date(currentDate);
      farPastDate.setDate(farPastDate.getDate() - 40);
      expect(DateContextParser.validateDateRange(farPastDate, currentDate)).toBe(false);
    });

    it('should reject dates too far in the future', () => {
      const farFutureDate = new Date(currentDate);
      farFutureDate.setDate(farFutureDate.getDate() + 10);
      expect(DateContextParser.validateDateRange(farFutureDate, currentDate)).toBe(false);
    });
  });

  describe('extractAllDateReferences', () => {
    it('should extract all date references from text', () => {
      const text = 'I ate breakfast today and had lunch yesterday. I will have dinner this Friday.';
      const references = DateContextParser.extractAllDateReferences(text);
      
      expect(references).toContain('today');
      expect(references).toContain('yesterday');
      expect(references).toContain('this friday');
      expect(references).toContain('breakfast');
      expect(references).toContain('lunch');
      expect(references).toContain('dinner');
    });

    it('should remove duplicate references', () => {
      const text = 'I ate lunch today and had another lunch today';
      const references = DateContextParser.extractAllDateReferences(text);
      
      const todayCount = references.filter(ref => ref === 'today').length;
      const lunchCount = references.filter(ref => ref === 'lunch').length;
      
      expect(todayCount).toBe(1);
      expect(lunchCount).toBe(1);
    });
  });

  describe('convertToTimezone', () => {
    it('should return original date when no timezone specified', () => {
      const result = DateContextParser.convertToTimezone(currentDate);
      expect(result).toEqual(currentDate);
    });

    it('should handle timezone conversion gracefully', () => {
      // Test with a known timezone
      const result = DateContextParser.convertToTimezone(currentDate, 'America/New_York');
      expect(result).toBeInstanceOf(Date);
    });

    it('should fallback to original date on invalid timezone', () => {
      const result = DateContextParser.convertToTimezone(currentDate, 'Invalid/Timezone');
      expect(result).toEqual(currentDate);
    });
  });

  describe('complex scenarios', () => {
    it('should handle combined date and time references', () => {
      const result = DateContextParser.parseDateContext('I had dinner yesterday evening', currentDate);
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('relative');
      
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      expect(result.date.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should prioritize explicit dates over relative dates', () => {
      const result = DateContextParser.parseDateContext('I ate on 03/10 but also had food yesterday', currentDate);
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('explicit');
      expect(result.date.getDate()).toBe(10);
      expect(result.date.getMonth()).toBe(2); // March
    });

    it('should handle case-insensitive parsing', () => {
      const testCases = [
        'I ATE TODAY',
        'Had LUNCH Yesterday',
        'BREAKFAST this MORNING'
      ];

      testCases.forEach(text => {
        const result = DateContextParser.parseDateContext(text, currentDate);
        expect(result.source).not.toBe('default');
        expect(result.confidence).not.toBe('low');
      });
    });

    it('should handle nutrition-specific context', () => {
      const nutritionTexts = [
        'I logged my calories yesterday',
        'Tracked my protein intake this morning',
        'Had 500 calories for lunch today'
      ];

      nutritionTexts.forEach(text => {
        const result = DateContextParser.parseDateContext(text, currentDate);
        expect(result.source).not.toBe('default');
        expect(['high', 'medium']).toContain(result.confidence);
      });
    });
  });
});