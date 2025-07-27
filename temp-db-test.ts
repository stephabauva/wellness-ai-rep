
      import { db, initializeDatabase } from './shared/database/db';
      import { memoryEntries, users } from './shared/schema';
      import { count, eq } from 'drizzle-orm';
      
      async function test() {
        try {
          // Initialize database connection
          await initializeDatabase();
          
          // Test basic connection
          const userCount = await db.select({ count: count() }).from(users);
          console.log('✅ Database Connection: PASS');
          console.log('   Users in database:', userCount[0].count);
          
          // Test memory table access
          const memoryCount = await db.select({ count: count() }).from(memoryEntries);
          console.log('✅ Memory Table Access: PASS');
          console.log('   Memories in database:', memoryCount[0].count);
          
          // Test active memories for user 1
          const activeMemories = await db.select({ count: count() })
            .from(memoryEntries)
            .where(eq(memoryEntries.userId, 1));
          console.log('✅ User Memory Query: PASS');
          console.log('   Active memories for user 1:', activeMemories[0].count);
          
          process.exit(0);
        } catch (error) {
          console.log('❌ Database Test: FAIL');
          console.error('   Error:', error.message);
          process.exit(1);
        }
      }
      
      test();
    