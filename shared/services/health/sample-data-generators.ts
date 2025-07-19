/**
 * Health Sample Data Generators
 * Extracted from native-health-service.ts for better organization
 * Provides realistic sample data for development and testing
 */

/**
 * Generates sample HealthKit data for development/testing
 */
export function generateSampleHealthKitData(query: any): Promise<any> {
  return new Promise((resolve) => {
    // Generate realistic sample data for development/testing
    const data = [];
    const daysDiff = Math.ceil((query.endDate - query.startDate) / (1000 * 60 * 60 * 24));
    
    for (const queryItem of query.queries || []) {
      for (let day = 0; day < Math.min(daysDiff, 30); day++) {
        const date = new Date(query.startDate);
        date.setDate(date.getDate() + day);
        
        switch (queryItem.friendlyName) {
          case 'steps':
            data.push({
              type: queryItem.type,
              value: Math.floor(Math.random() * 5000) + 3000,
              unit: 'count',
              startDate: date.toISOString(),
              endDate: date.toISOString()
            });
            break;
          case 'heart_rate':
            for (let i = 0; i < 5; i++) {
              const time = new Date(date);
              time.setHours(8 + i * 3);
              data.push({
                type: queryItem.type,
                value: Math.floor(Math.random() * 40) + 60,
                unit: 'count/min',
                startDate: time.toISOString(),
                endDate: time.toISOString()
              });
            }
            break;
        }
      }
    }
    
    resolve({ samples: data });
  });
}

/**
 * Generates sample Google Fit data for development/testing
 */
export function generateSampleGoogleFitData(query: any): Promise<any> {
  return new Promise((resolve) => {
    // Generate realistic sample data for development/testing
    const data = [];
    const daysDiff = Math.ceil((query.endTime - query.startTime) / (1000 * 60 * 60 * 24));
    
    for (const queryItem of query.queries || []) {
      for (let day = 0; day < Math.min(daysDiff, 30); day++) {
        const date = new Date(query.startTime + (day * 24 * 60 * 60 * 1000));
        
        switch (queryItem.friendlyName) {
          case 'steps':
            data.push({
              type: queryItem.type,
              value: Math.floor(Math.random() * 6000) + 2000,
              startTime: date.getTime(),
              endTime: date.getTime() + (24 * 60 * 60 * 1000)
            });
            break;
          case 'heart_rate':
            for (let i = 0; i < 6; i++) {
              const time = new Date(date);
              time.setHours(7 + i * 2.5);
              data.push({
                type: queryItem.type,
                value: Math.floor(Math.random() * 35) + 65,
                startTime: time.getTime(),
                endTime: time.getTime()
              });
            }
            break;
          case 'calories_burned':
            data.push({
              type: queryItem.type,
              value: Math.floor(Math.random() * 800) + 1200,
              startTime: date.getTime(),
              endTime: date.getTime() + (24 * 60 * 60 * 1000)
            });
            break;
        }
      }
    }
    
    resolve({ buckets: data });
  });
}