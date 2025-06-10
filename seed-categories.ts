
import { seedDefaultCategories } from './server/services/category-service';

console.log('Starting category seeding...');

async function runSeed() {
  try {
    await seedDefaultCategories();
    console.log('✅ Default categories seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

runSeed();
