#!/usr/bin/env tsx

/**
 * Migration Helper Script
 * 
 * This script helps you update your server files to use the new database connection
 * that can switch between local and Neon databases automatically.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

console.log('🔄 Migrating server files to use local database connection...');

// Files to update
const serverFiles = [
  'server/index.ts',
  'server/routes/*.ts',
  'server/services/*.ts'
];

// Find all TypeScript files in server directory
const filesToUpdate: string[] = [];
for (const pattern of serverFiles) {
  const matches = glob.sync(pattern);
  filesToUpdate.push(...matches);
}

let updatedFiles = 0;

for (const filePath of filesToUpdate) {
  if (!existsSync(filePath)) continue;
  
  try {
    let content = readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Replace import from server/db.ts to server/db-local.ts
    if (content.includes('from "@/server/db"') || content.includes('from "./db"') || content.includes('from "../db"')) {
      console.log(`📝 Updating imports in ${filePath}`);
      
      // Update relative imports
      content = content.replace(/from ["']\.\.?\/db["']/g, 'from "./db-local"');
      content = content.replace(/from ["']@\/server\/db["']/g, 'from "@/server/db-local"');
      
      hasChanges = true;
    }
    
    if (hasChanges) {
      writeFileSync(filePath, content);
      updatedFiles++;
      console.log(`✅ Updated ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
  }
}

console.log(`\n🎉 Migration complete! Updated ${updatedFiles} files.`);

if (updatedFiles === 0) {
  console.log(`
ℹ️  No automatic updates were needed. 

To use the new database connection in your code, update your imports:

Before:
import { db } from './db';

After:
import { db } from './db-local';

The new connection automatically switches between local and Neon databases
based on your environment variables.
`);
} else {
  console.log(`
✅ Your server files have been updated to use the new database connection.

Next steps:
1. Run: npm run db:setup-local
2. Run: npm run dev:local
3. Test your application with the local database
`);
}