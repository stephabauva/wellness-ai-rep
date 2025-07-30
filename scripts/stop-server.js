#!/usr/bin/env node

/**
 * Port Cleanup Utility
 * Stops all processes running on port 5000 to resolve EADDRINUSE errors
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

async function stopServerProcesses() {
  console.log('🔍 Stopping server processes to resolve EADDRINUSE error...');
  
  try {
    // First, try to kill any tsx/node processes related to the server
    const commands = [
      'pkill -f "tsx.*server/index.ts" || true',
      'pkill -f "node.*server" || true', 
      'pkill -f "npm run dev" || true',
      'pkill -f "Start application" || true',
      'pkill -9 -f "node.*5000" || true' // Force kill any processes on port 5000
    ];
    
    let processesKilled = false;
    
    for (const cmd of commands) {
      console.log(`🔨 Running: ${cmd}`);
      const process = spawn('bash', ['-c', cmd], { stdio: 'pipe' });
      
      const result = await new Promise((resolve, reject) => {
        let output = '';
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.on('close', (code) => {
          console.log(`   └─ Completed with code ${code}`);
          if (code === 0 || output.trim() !== '') {
            processesKilled = true;
          }
          resolve(code);
        });
        process.on('error', reject);
      });
      
      await sleep(300); // Brief pause between commands
    }
    
    console.log('');
    console.log('✅ SERVER STOP COMPLETE');
    console.log('');
    if (processesKilled) {
      console.log('🎯 Processes were found and terminated');
    } else {
      console.log('ℹ️  No conflicting processes were found');
    }
    console.log('');
    console.log('💡 Port 5000 should now be available');
    console.log('🚀 You can now restart the "Start application" workflow');
    console.log('');
    
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