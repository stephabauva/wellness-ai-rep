import { db, initializeDatabase } from '../db';
import { memoryEntries } from '../../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Memory Categories Migration Script
 * Converts old 8-category system to new 5-category + labels system
 */

// Category mappings from old to new
const categoryMappings = {
  // Old category -> { newCategory, labels }
  'preference': { newCategory: 'preferences', labels: ['general'] },
  'personal_info': { newCategory: 'personal_context', labels: ['background'] },
  'context': { newCategory: 'personal_context', labels: ['lifestyle'] },
  'instruction': { newCategory: 'instructions', labels: ['behavior'] },
  'food_preferences': { newCategory: 'food_diet', labels: ['preference'] },
  'dietary_restrictions': { newCategory: 'food_diet', labels: ['restriction', 'allergy'] },
  'meal_patterns': { newCategory: 'food_diet', labels: ['meal-timing'] },
  'nutrition_goals': { newCategory: 'goals', labels: ['nutrition', 'macro'] },
  // Handle the specific case where "background" is incorrectly used as a category
  'background': { newCategory: 'personal_context', labels: ['background'] },
};

/**
 * Adds labels column to memory_entries table if it doesn't exist
 */
async function addLabelsColumn() {
  try {
    // Check if labels column exists
    const columnExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'memory_entries' AND column_name = 'labels'
    `);

    if (columnExists.rows.length === 0) {
      // Add labels column
      await db.execute(sql`
        ALTER TABLE memory_entries 
        ADD COLUMN labels text[]
      `);
      console.log('✅ Added labels column to memory_entries table');
    } else {
      console.log('✅ Labels column already exists');
    }
  } catch (error) {
    console.error('❌ Error adding labels column:', error);
    throw error;
  }
}

/**
 * Migrates existing memory entries to new category + label system
 */
async function migrateMemoryEntries() {
  try {
    // Get all memory entries
    const entries = await db.execute(sql`
      SELECT id, category, content 
      FROM memory_entries 
      WHERE is_active = true
    `);

    console.log(`📝 Found ${entries.rows.length} memory entries to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const entry of entries.rows) {
      const oldCategory = entry.category;
      const mapping = categoryMappings[oldCategory as keyof typeof categoryMappings];

      if (mapping) {
        // Update the entry with new category and labels
        await db.execute(sql`
          UPDATE memory_entries 
          SET category = ${mapping.newCategory}, 
              labels = ${mapping.labels},
              updated_at = NOW()
          WHERE id = ${entry.id}
        `);
        
        console.log(`  ✅ Migrated: ${oldCategory} → ${mapping.newCategory} [${mapping.labels.join(', ')}]`);
        migratedCount++;
      } else {
        console.log(`  ⚠️  Skipped unknown category: ${oldCategory}`);
        skippedCount++;
      }
    }

    console.log(`📊 Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);
  } catch (error) {
    console.error('❌ Error migrating memory entries:', error);
    throw error;
  }
}

/**
 * Validates the migration by checking category distribution
 */
async function validateMigration() {
  try {
    const stats = await db.execute(sql`
      SELECT category, COUNT(*) as count, array_agg(DISTINCT labels) as all_labels
      FROM memory_entries 
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `);

    console.log('\n📊 Migration validation results:');
    console.log('=====================================');
    
    for (const row of stats.rows) {
      const uniqueLabels = [...new Set(row.all_labels.flat())].filter(Boolean);
      console.log(`${row.category}: ${row.count} entries`);
      console.log(`  Labels: ${uniqueLabels.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error validating migration:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
export async function runMemoryCategoriesMigration() {
  console.log('🚀 Starting Memory Categories Migration...');
  console.log('==========================================');
  
  try {
    // Initialize database connection first
    await initializeDatabase();
    
    await addLabelsColumn();
    await migrateMemoryEntries();
    await validateMigration();
    
    console.log('\n✅ Memory Categories Migration completed successfully!');
    console.log('New categories: preferences, personal_context, instructions, food_diet, goals');
    console.log('Labels system implemented for subcategorization');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
runMemoryCategoriesMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));