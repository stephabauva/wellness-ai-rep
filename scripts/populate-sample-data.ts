import { db } from "../server/db.js";
import { sampleHealthData } from "../shared/schema.js";
import { SampleHealthDataGenerator } from "../shared/sampleHealthDataGenerator.js";

async function populateSampleData() {
  try {
    console.log('Generating sample health data...');
    
    // Generate 90 days of sample data (without userId)
    const sampleData = SampleHealthDataGenerator.generateSampleDataForTimeRange('90days', 1);
    
    console.log(`Generated ${sampleData.length} sample records`);
    
    // Convert to insert format for sample table (no userId needed)
    const insertData = sampleData.map(sample => ({
      dataType: sample.dataType,
      value: sample.value,
      unit: sample.unit,
      timestamp: sample.timestamp,
      category: sample.category,
      source: "sample_generator",
      metadata: null
    }));
    
    // Clear existing sample data
    await db.delete(sampleHealthData);
    console.log('Cleared existing sample data');
    
    // Insert sample data in batches
    const BATCH_SIZE = 1000;
    let inserted = 0;
    
    for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
      const batch = insertData.slice(i, i + BATCH_SIZE);
      await db.insert(sampleHealthData).values(batch);
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${insertData.length} records`);
    }
    
    console.log('Sample data population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating sample data:', error);
    process.exit(1);
  }
}

// Run the script
populateSampleData();