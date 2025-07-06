interface SampleHealthMetric {
  dataType: string;
  value: string;
  unit?: string;
  timestamp: Date;
  category: string;
  userId: number;
}

interface GeneratorOptions {
  timeRangeDays: number;
  userId: number;
}

export class SampleHealthDataGenerator {
  private static readonly HEALTH_DATA_TYPES = {
    body_composition: [
      { type: 'weight', unit: 'kg', baseValue: 70, variance: 3, category: 'body_composition' },
      { type: 'bmi', unit: 'kg/m²', baseValue: 23, variance: 1.5, category: 'body_composition' },
      { type: 'body_fat_percentage', unit: '%', baseValue: 18, variance: 3, category: 'body_composition' },
    ],
    cardiovascular: [
      { type: 'heart_rate', unit: 'bpm', baseValue: 72, variance: 15, category: 'cardiovascular' },
      { type: 'blood_pressure_systolic', unit: 'mmHg', baseValue: 120, variance: 10, category: 'cardiovascular' },
      { type: 'blood_pressure_diastolic', unit: 'mmHg', baseValue: 80, variance: 8, category: 'cardiovascular' },
      { type: 'resting_heart_rate', unit: 'bpm', baseValue: 65, variance: 8, category: 'cardiovascular' },
    ],
    lifestyle: [
      { type: 'steps', unit: 'steps', baseValue: 8500, variance: 2500, category: 'lifestyle' },
      { type: 'active_minutes', unit: 'minutes', baseValue: 45, variance: 20, category: 'lifestyle' },
      { type: 'calories_burned', unit: 'kcal', baseValue: 2200, variance: 400, category: 'lifestyle' },
      { type: 'distance', unit: 'km', baseValue: 6.5, variance: 2, category: 'lifestyle' },
      { type: 'sleep_total', unit: 'hours', baseValue: 7.5, variance: 1.2, category: 'lifestyle' },
      { type: 'sleep_deep', unit: 'hours', baseValue: 1.8, variance: 0.5, category: 'lifestyle' },
      { type: 'sleep_light', unit: 'hours', baseValue: 4.2, variance: 0.8, category: 'lifestyle' },
      { type: 'sleep_rem', unit: 'hours', baseValue: 1.5, variance: 0.4, category: 'lifestyle' },
    ],
    medical: [
      { type: 'calories', unit: 'kcal', baseValue: 2000, variance: 300, category: 'medical' },
      { type: 'protein', unit: 'g', baseValue: 100, variance: 25, category: 'medical' },
      { type: 'carbs', unit: 'g', baseValue: 225, variance: 50, category: 'medical' },
      { type: 'fat', unit: 'g', baseValue: 65, variance: 15, category: 'medical' },
      { type: 'water_intake', unit: 'L', baseValue: 2.2, variance: 0.8, category: 'medical' },
    ],
    advanced: [
      { type: 'vo2_max', unit: 'ml/kg/min', baseValue: 45, variance: 8, category: 'advanced' },
      { type: 'heart_rate_variability', unit: 'ms', baseValue: 35, variance: 10, category: 'advanced' },
    ],
  };

  static generateSampleData(options: GeneratorOptions): SampleHealthMetric[] {
    const { timeRangeDays, userId } = options;
    const sampleData: SampleHealthMetric[] = [];
    
    // Always generate data for the full 90 days to ensure all time ranges work
    const fullTimeRange = 90;
    
    // Generate data for each day in the full range
    for (let dayOffset = 0; dayOffset < fullTimeRange; dayOffset++) {
      // Create timestamp that properly accounts for time ranges
      // For recent days (0-7), add some entries at different times of day
      const entriesPerDay = dayOffset < 7 ? 3 : 1; // More entries for recent days
      
      for (let entryIndex = 0; entryIndex < entriesPerDay; entryIndex++) {
        const date = new Date();
        // Subtract days and add hours for variation within the day
        date.setDate(date.getDate() - dayOffset);
        date.setHours(8 + (entryIndex * 8)); // 8am, 4pm, midnight
        date.setMinutes(Math.floor(Math.random() * 60));
        date.setSeconds(0);
        date.setMilliseconds(0);
        
        // Generate data for each health metric type
        Object.values(this.HEALTH_DATA_TYPES).flat().forEach(metricConfig => {
          const value = this.generateRealisticValue(metricConfig, dayOffset, fullTimeRange);
          
          sampleData.push({
            dataType: metricConfig.type,
            value: this.formatValue(value),
            unit: metricConfig.unit,
            timestamp: new Date(date),
            category: metricConfig.category,
            userId,
          });
        });
      }
    }
    
    return sampleData;
  }

  private static generateRealisticValue(
    metricConfig: { baseValue: number; variance: number; type: string },
    dayOffset: number,
    totalDays: number
  ): number {
    const { baseValue, variance, type } = metricConfig;
    
    // Add daily variation using sine wave for natural patterns
    const dayOfWeek = (new Date().getDay() - dayOffset + 7) % 7;
    const weeklyPattern = Math.sin((dayOfWeek * Math.PI) / 3.5) * 0.1; // Small weekly variation
    
    // Add longer-term trend for some metrics
    const trendPattern = this.getTrendPattern(type, dayOffset, totalDays);
    
    // Add random variation
    const randomVariation = (Math.random() - 0.5) * 2; // -1 to 1
    
    // Calculate final value
    const finalValue = baseValue * (1 + weeklyPattern + trendPattern + (randomVariation * variance / baseValue));
    
    // Apply metric-specific constraints
    return this.applyMetricConstraints(type, finalValue);
  }

  private static getTrendPattern(type: string, dayOffset: number, totalDays: number): number {
    const progress = dayOffset / totalDays;
    
    switch (type) {
      case 'weight':
        // Slight weight loss trend over time
        return -progress * 0.02;
      case 'steps':
        // Slight increase in activity over time
        return progress * 0.05;
      case 'sleep_total':
        // Slight improvement in sleep over time
        return progress * 0.03;
      case 'vo2_max':
        // Slight fitness improvement
        return progress * 0.04;
      default:
        return 0;
    }
  }

  private static formatValue(value: number): string {
    // Round to 2 decimal places maximum
    return Math.round(value * 100) / 100 + '';
  }

  private static applyMetricConstraints(type: string, value: number): number {
    switch (type) {
      case 'weight':
        return Math.max(45, Math.min(120, value));
      case 'bmi':
        return Math.max(16, Math.min(35, value));
      case 'body_fat_percentage':
        return Math.max(8, Math.min(35, value));
      case 'heart_rate':
        return Math.max(50, Math.min(120, value));
      case 'blood_pressure_systolic':
        return Math.max(90, Math.min(160, value));
      case 'blood_pressure_diastolic':
        return Math.max(60, Math.min(100, value));
      case 'resting_heart_rate':
        return Math.max(45, Math.min(85, value));
      case 'steps':
        return Math.max(1000, Math.min(25000, value));
      case 'active_minutes':
        return Math.max(10, Math.min(120, value));
      case 'calories_burned':
        return Math.max(1500, Math.min(3500, value));
      case 'distance':
        return Math.max(1, Math.min(15, value));
      case 'sleep_total':
        return Math.max(5, Math.min(10, value));
      case 'sleep_deep':
        return Math.max(0.5, Math.min(3, value));
      case 'sleep_light':
        return Math.max(2, Math.min(6, value));
      case 'sleep_rem':
        return Math.max(0.5, Math.min(2.5, value));
      case 'calories':
        return Math.max(1200, Math.min(3000, value));
      case 'protein':
        return Math.max(50, Math.min(200, value));
      case 'carbs':
        return Math.max(100, Math.min(400, value));
      case 'fat':
        return Math.max(30, Math.min(150, value));
      case 'water_intake':
        return Math.max(1, Math.min(4, value));
      case 'vo2_max':
        return Math.max(25, Math.min(70, value));
      case 'heart_rate_variability':
        return Math.max(15, Math.min(60, value));
      default:
        return Math.max(0, value);
    }
  }

  static generateSampleDataForTimeRange(timeRange: '1day' | '7days' | '30days' | '90days', userId: number): SampleHealthMetric[] {
    // Always generate full 90 days of data, time filtering happens in the API
    return this.generateSampleData({
      timeRangeDays: 90,
      userId,
    });
  }
}