
import { seedDefaultCategories } from './server/services/category-service.js';

console.log('Starting category seeding...');
try {
  await seedDefaultCategories();
  console.log('✅ Default categories seeded successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error seeding categories:', error);
  process.exit(1);
}
