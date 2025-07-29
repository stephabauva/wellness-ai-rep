#!/usr/bin/env node
/**
 * Service Integration Validator - Detects missing methods, stub implementations, and service communication failures
 * Prevents issues like calling non-existent methods or stub functions that return empty data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

class ServiceIntegrationValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.services = [];
    this.methods = [];
    this.stubPatterns = [
      /return\s+\[\]/g,                    // return []
      /return\s+\{\}/g,                    // return {}
      /return\s+null/g,                    // return null
      /console\.log.*TODO/g,               // console.log("TODO: ...")
      /throw.*not.*implemented/g,          // throw new Error("not implemented")
      /\/\*\s*TODO.*\*\//g,               // /* TODO: ... */
      /\/\/\s*TODO/g,                     // // TODO: ...
      /\/\/\s*PLACEHOLDER/g,              // // PLACEHOLDER
      /\/\*\s*PLACEHOLDER.*\*\//g,        // /* PLACEHOLDER */
    ];
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  error(message) {
    this.log(`❌ ${message}`, COLORS.RED);
    this.issues.push(message);
  }

  warning(message) {
    this.log(`⚠️  ${message}`, COLORS.YELLOW);
    this.warnings.push(message);
  }

  success(message) {
    this.log(`✅ ${message}`, COLORS.GREEN);
  }

  info(message) {
    this.log(`ℹ️  ${message}`, COLORS.BLUE);
  }

  // Test actual service endpoints with HTTP requests
  async testServiceEndpoints() {
    this.log('\n🔍 Testing service endpoints...', COLORS.BOLD);
    
    const endpoints = [
      { name: 'Go Memory Service Health', url: 'http://localhost:8081/health' },
      { name: 'Go Memory Service Create', url: 'http://localhost:8081/api/memories/manual', method: 'POST', 
        body: { content: 'test memory for validation', category: 'preferences', importance: 0.5 }},
      { name: 'Node Server Health', url: 'http://localhost:5000/api/health' },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const method = endpoint.method || 'GET';
        const options = {
          timeout: 5000,
          encoding: 'utf8',
          stdio: 'pipe'
        };
        
        let curlCmd = `curl -s --max-time 5 -X ${method}`;
        
        if (endpoint.body) {
          curlCmd += ` -H "Content-Type: application/json" -d '${JSON.stringify(endpoint.body)}'`;
        }
        
        curlCmd += ` "${endpoint.url}"`;
        
        const result = execSync(curlCmd, options);
        
        if (result.trim()) {
          // Try to parse JSON response
          try {
            const data = JSON.parse(result);
            if (data.success === false || data.error) {
              this.error(`${endpoint.name}: Service returned error - ${data.message || data.error}`);
            } else if (method === 'POST' && endpoint.url.includes('/memories/manual')) {
              // Special check for memory creation
              if (!data.memory || !data.memory.id) {
                this.error(`${endpoint.name}: Memory creation returned invalid response (no memory.id)`);
              } else if (data.deduplicationOccurred === undefined) {
                this.warning(`${endpoint.name}: Memory creation missing deduplication info`);
              } else {
                this.success(`${endpoint.name}: Working correctly`);
              }
            } else {
              this.success(`${endpoint.name}: Working correctly`);
            }
          } catch (parseError) {
            if (result.includes('404') || result.includes('500')) {
              this.error(`${endpoint.name}: HTTP error - ${result.substring(0, 100)}`);
            } else {
              this.success(`${endpoint.name}: Working (non-JSON response)`);
            }
          }
        } else {
          this.error(`${endpoint.name}: No response (service may be down)`);
        }
      } catch (error) {
        this.error(`${endpoint.name}: Connection failed - ${error.message}`);
      }
    }
  }

  // Check for stub implementations in code
  checkStubImplementations() {
    this.log('\n🔍 Checking for stub implementations...', COLORS.BOLD);
    
    const codeFiles = [
      ...this.findFiles('./server', /\.(ts|js)$/),
      ...this.findFiles('./go-memory-service', /\.(go)$/),
      ...this.findFiles('./shared', /\.(ts|js)$/),
    ];
    
    for (const file of codeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        for (const pattern of this.stubPatterns) {
          if (pattern.test(line)) {
            // Check if this is in a function that might be critical
            const functionContext = this.getFunctionContext(lines, i);
            
            if (this.isCriticalFunction(functionContext)) {
              this.error(`STUB IMPLEMENTATION: ${file}:${lineNum} - ${functionContext} contains stub code: ${line.trim()}`);
            } else {
              this.warning(`Possible stub: ${file}:${lineNum} - ${line.trim()}`);
            }
          }
        }
      }
    }
  }

  // Check method implementations exist
  checkMethodImplementations() {
    this.log('\n🔍 Checking method implementations...', COLORS.BOLD);
    
    // Critical methods that must exist and work
    const criticalMethods = [
      { service: 'go-memory-service', method: 'CreateMemoryWithDeduplication', file: 'memory_service.go' },
      { service: 'go-memory-service', method: 'CheckForDuplicate', file: 'deduplication.go' },
      { service: 'memory-system', method: 'processWithDeduplication', pattern: 'processWithDeduplication' },
    ];
    
    for (const methodCheck of criticalMethods) {
      const files = this.findFiles(`./${methodCheck.service}`, /\.(go|ts|js)$/);
      let found = false;
      
      for (const file of files) {
        if (methodCheck.file && !file.includes(methodCheck.file)) continue;
        
        const content = fs.readFileSync(file, 'utf8');
        const pattern = methodCheck.pattern || methodCheck.method;
        
        if (content.includes(pattern)) {
          found = true;
          
          // Check if it's a real implementation or stub
          const methodMatch = content.match(new RegExp(`(func.*${pattern}|${pattern}.*{)([\\s\\S]*?)(?=func|$)`, 'i'));
          if (methodMatch) {
            const implementation = methodMatch[2];
            
            // Check for stub patterns in the implementation
            let isStub = false;
            for (const stubPattern of this.stubPatterns) {
              if (stubPattern.test(implementation)) {
                isStub = true;
                break;
              }
            }
            
            if (isStub) {
              this.error(`${methodCheck.method} exists but appears to be STUB IMPLEMENTATION in ${file}`);
            } else if (implementation.trim().length < 50) {
              this.warning(`${methodCheck.method} implementation seems very short in ${file}`);
            } else {
              this.success(`${methodCheck.method} properly implemented in ${file}`);
            }
          }
          break;
        }
      }
      
      if (!found) {
        this.error(`MISSING METHOD: ${methodCheck.method} not found in ${methodCheck.service}`);
      }
    }
  }

  // Check database operations aren't stubs
  checkDatabaseOperations() {
    this.log('\n🔍 Checking database operations...', COLORS.BOLD);
    
    const dbFiles = [
      ...this.findFiles('./server/services', /\.(ts|js)$/),
      ...this.findFiles('./go-memory-service', /database\.(go|ts|js)$/),
      ...this.findFiles('./shared/services', /\.(ts|js)$/),
    ];
    
    const criticalDbOps = [
      'StoreMemory',
      'GetMemoryByID', 
      'GetRecentMemoriesForUser',
      'QueryMemoriesFromDB',
      'UpdateMemoryInDB'
    ];
    
    for (const file of dbFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const op of criticalDbOps) {
        if (content.includes(op)) {
          // Extract the function implementation
          const funcPattern = new RegExp(`(func.*${op}|${op}.*\\{)([\\s\\S]*?)(?=\\n\\s*(?:func|$))`, 'i');
          const match = content.match(funcPattern);
          
          if (match) {
            const implementation = match[2];
            
            // Check for stub patterns that indicate non-functional database ops
            if (implementation.includes('return []') || 
                implementation.includes('return {}') ||
                implementation.includes('console.log') && !implementation.includes('db.') && !implementation.includes('database.')) {
              this.error(`DATABASE STUB: ${op} in ${file} appears to be stub implementation`);
            } else if (implementation.includes('db.') || implementation.includes('database.') || 
                      implementation.includes('StoreMemory') || implementation.includes('memories[')) {
              this.success(`${op} appears properly implemented in ${file}`);
            } else {
              this.warning(`${op} implementation unclear in ${file}`);
            }
          }
        }
      }
    }
  }

  // Test memory deduplication flow end-to-end
  async testMemoryDeduplicationFlow() {
    this.log('\n🔍 Testing memory deduplication flow...', COLORS.BOLD);
    
    try {
      // Test 1: Create initial memory
      const createCmd = `curl -s -X POST http://localhost:8081/api/memories/manual -H "Content-Type: application/json" -d '{"content": "I love healthy organic vegetables", "category": "food_diet", "importance": 0.8}'`;
      const createResult = execSync(createCmd, { encoding: 'utf8', stdio: 'pipe' });
      
      let createData;
      try {
        createData = JSON.parse(createResult);
      } catch (e) {
        this.error(`Memory creation returned invalid JSON: ${createResult}`);
        return;
      }
      
      if (!createData.success || !createData.memory || !createData.memory.id) {
        this.error(`Memory creation failed: ${createResult}`);
        return;
      }
      
      const memoryId = createData.memory.id;
      this.success(`Created initial memory: ${memoryId}`);
      
      // Test 2: Create similar memory to trigger deduplication
      const similarCmd = `curl -s -X POST http://localhost:8081/api/memories/manual -H "Content-Type: application/json" -d '{"content": "I really enjoy eating healthy organic vegetables", "category": "food_diet", "importance": 0.8}'`;
      const similarResult = execSync(similarCmd, { encoding: 'utf8', stdio: 'pipe' });
      
      let similarData;
      try {
        similarData = JSON.parse(similarResult);
      } catch (e) {
        this.error(`Similar memory creation returned invalid JSON: ${similarResult}`);
        return;
      }
      
      if (!similarData.success) {
        this.error(`Similar memory creation failed: ${similarResult}`);
        return;
      }
      
      // Check if deduplication occurred
      if (similarData.deduplicationOccurred) {
        if (similarData.similarMemories && similarData.similarMemories.length > 0) {
          this.success(`✅ DEDUPLICATION WORKING: Found similar memories with ${Math.round(similarData.confidence * 100)}% confidence`);
          
          // Verify the similar memory data structure
          const similarMem = similarData.similarMemories[0];
          if (similarMem.id && similarMem.content && similarMem.similarity !== undefined) {
            this.success(`✅ Similar memory data structure correct`);
          } else {
            this.error(`❌ Similar memory missing required fields: ${JSON.stringify(similarMem)}`);
          }
        } else {
          this.error(`❌ DEDUPLICATION BROKEN: deduplicationOccurred=true but no similarMemories array`);
        }
      } else {
        this.warning(`⚠️  Deduplication not triggered (may be normal if similarity < threshold)`);
      }
      
    } catch (error) {
      this.error(`Memory deduplication flow test failed: ${error.message}`);
    }
  }

  getFunctionContext(lines, lineIndex) {
    // Look backwards to find function declaration
    for (let i = lineIndex; i >= 0; i--) {
      const line = lines[i];
      if (line.match(/^\s*(function|func|async|export)/)) {
        const match = line.match(/(?:function|func|async|export)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        return match ? match[1] : 'unknown';
      }
    }
    return 'unknown';
  }

  isCriticalFunction(functionName) {
    const criticalFunctions = [
      'CreateMemory',
      'CreateMemoryWithDeduplication', 
      'StoreMemory',
      'GetMemoryByID',
      'GetRecentMemoriesForUser',
      'CheckForDuplicate',
      'processWithDeduplication',
      'createMemoryHandler',
      'checkDuplicatesHandler'
    ];
    
    return criticalFunctions.some(critical => 
      functionName.toLowerCase().includes(critical.toLowerCase())
    );
  }

  findFiles(dir, pattern) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        files.push(...this.findFiles(fullPath, pattern));
      } else if (item.isFile() && pattern.test(item.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  generateReport() {
    this.log('\n📊 SERVICE INTEGRATION REPORT', COLORS.BOLD);
    this.log('====================================', COLORS.BOLD);
    
    if (this.issues.length === 0) {
      this.success('✅ All service integrations validated successfully!');
      
      if (this.warnings.length > 0) {
        this.log(`\n⚠️  ${this.warnings.length} warnings found:`, COLORS.YELLOW);
        this.warnings.forEach((warning, i) => {
          this.log(`${i + 1}. ${warning}`, COLORS.YELLOW);
        });
      }
      
      return true;
    } else {
      this.error(`❌ Found ${this.issues.length} critical service integration issues:`);
      this.issues.forEach((issue, i) => {
        this.log(`${i + 1}. ${issue}`, COLORS.RED);
      });
      
      this.log('\n💡 RECOMMENDATIONS:', COLORS.YELLOW);
      this.log('- Replace all stub implementations with real functionality');
      this.log('- Ensure all critical methods are properly implemented');
      this.log('- Test service endpoints before deploying');
      this.log('- Add this validator to your CI pipeline');
      this.log('- Run: node .claude/scripts/service-integration-validator.js');
      
      return false;
    }
  }

  async run() {
    this.log('🚀 Service Integration Validator Starting...', COLORS.BOLD);
    
    await this.testServiceEndpoints();
    this.checkStubImplementations();
    this.checkMethodImplementations();
    this.checkDatabaseOperations();
    await this.testMemoryDeduplicationFlow();
    
    const success = this.generateReport();
    process.exit(success ? 0 : 1);
  }
}

// Run the validator
if (require.main === module) {
  const validator = new ServiceIntegrationValidator();
  validator.run().catch(error => {
    console.error('❌ Validator failed:', error);
    process.exit(1);
  });
}

module.exports = ServiceIntegrationValidator;