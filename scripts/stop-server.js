#!/usr/bin/env node

/**
 * Port Cleanup Utility
 * Stops all processes running on port 5000 to resolve EADDRINUSE errors
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

async function stopServerProcesses() {
  console.log('🔍 Checking for processes on port 5000...');
  
  try {
    // First, try to kill any tsx/node processes related to the server
    const commands = [
      'pkill -f "tsx.*server/index.ts" || true',
      'pkill -f "node.*server" || true',
      'pkill -f "npm run dev" || true',
      'pkill -f "Start application" || true'
    ];
    
    for (const cmd of commands) {
      console.log(`🔨 Running: ${cmd}`);
      const process = spawn('bash', ['-c', cmd], { stdio: 'inherit' });
      
      await new Promise((resolve, reject) => {
        process.on('close', (code) => {
          console.log(`   └─ Completed with code ${code}`);
          resolve(code);
        });
        process.on('error', reject);
      });
      
      await sleep(500); // Brief pause between commands
    }
    
    console.log('✅ Port cleanup completed');
    console.log('💡 You can now restart your application');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  stopServerProcesses();
}

export { stopServerProcesses };