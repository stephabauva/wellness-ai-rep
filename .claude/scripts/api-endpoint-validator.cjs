#!/usr/bin/env node
/**
 * API Endpoint Validator - Detects frontend/backend endpoint mismatches
 * Prevents issues like frontend calling wrong service ports
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

class APIEndpointValidator {
  constructor() {
    this.issues = [];
    this.services = {
      'memory-service': { port: 8081, running: false },
      'ai-gateway': { port: 8080, running: false },
      'file-service': { port: 8082, running: false },
      'node-server': { port: 5000, running: false }
    };
    this.frontendCalls = [];
    this.backendRoutes = [];
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
  }

  success(message) {
    this.log(`✅ ${message}`, COLORS.GREEN);
  }

  info(message) {
    this.log(`ℹ️  ${message}`, COLORS.BLUE);
  }

  // Check which services are actually running
  checkRunningServices() {
    this.log('\n🔍 Checking running services...', COLORS.BOLD);
    
    for (const [serviceName, config] of Object.entries(this.services)) {
      try {
        const result = execSync(`lsof -ti:${config.port}`, { encoding: 'utf8', stdio: 'pipe' });
        if (result.trim()) {
          config.running = true;
          this.success(`${serviceName} running on port ${config.port}`);
        }
      } catch (error) {
        config.running = false;
        this.warning(`${serviceName} NOT running on port ${config.port}`);
      }
    }
  }

  // Extract API calls from frontend code
  extractFrontendAPICalls() {
    this.log('\n🔍 Extracting frontend API calls...', COLORS.BOLD);
    
    const frontendFiles = this.findFiles('./client/src', /\.(ts|tsx|js|jsx)$/);
    
    for (const file of frontendFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Find fetch calls
      const fetchMatches = content.matchAll(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/g);
      for (const match of fetchMatches) {
        this.frontendCalls.push({
          file: file.replace('./client/src/', ''),
          endpoint: match[1],
          line: this.getLineNumber(content, match.index)
        });
      }
      
      // Find apiRequest calls
      const apiMatches = content.matchAll(/apiRequest\s*\(\s*["'`]([^"'`]+)["'`]/g);
      for (const match of apiMatches) {
        this.frontendCalls.push({
          file: file.replace('./client/src/', ''),
          endpoint: match[1],
          line: this.getLineNumber(content, match.index)
        });
      }
    }
    
    this.info(`Found ${this.frontendCalls.length} frontend API calls`);
  }

  // Extract routes from backend services
  extractBackendRoutes() {
    this.log('\n🔍 Extracting backend routes...', COLORS.BOLD);
    
    // Node.js server routes
    const nodeFiles = this.findFiles('./server/routes', /\.(ts|js)$/);
    for (const file of nodeFiles) {
      this.extractRoutesFromFile(file, 'node-server');
    }
    
    // Go service routes
    const goFiles = this.findFiles('./go-memory-service', /\.(go)$/);
    for (const file of goFiles) {
      this.extractGoRoutes(file);
    }
    
    this.info(`Found ${this.backendRoutes.length} backend routes`);
  }

  extractRoutesFromFile(file, service) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Express routes: app.get("/api/...", ...)
    const routeMatches = content.matchAll(/app\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/g);
    for (const match of routeMatches) {
      this.backendRoutes.push({
        service,
        method: match[1].toUpperCase(),
        path: match[2],
        file: file.replace('./server/', ''),
        line: this.getLineNumber(content, match.index)
      });
    }
  }

  extractGoRoutes(file) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Go routes: router.HandleFunc("/api/...", handler).Methods("GET")
    const routeMatches = content.matchAll(/router\.HandleFunc\s*\(\s*["'`]([^"'`]+)["'`][^)]*\)\.Methods\s*\(\s*["'`]([^"'`]+)["'`]/g);
    for (const match of routeMatches) {
      this.backendRoutes.push({
        service: 'go-service',
        method: match[2],
        path: match[1],
        file: file.replace('./go-memory-service/', ''),
        line: this.getLineNumber(content, match.index)
      });
    }
  }

  // Validate endpoint matches
  validateEndpoints() {
    this.log('\n🔍 Validating endpoint matches...', COLORS.BOLD);
    
    for (const call of this.frontendCalls) {
      const { endpoint, file, line } = call;
      
      // Check if it's a localhost call to specific port
      const localhostMatch = endpoint.match(/localhost:(\d+)(.+)/);
      if (localhostMatch) {
        const port = parseInt(localhostMatch[1]);
        const path = localhostMatch[2];
        
        const service = Object.entries(this.services).find(([name, config]) => config.port === port);
        if (service) {
          const [serviceName, config] = service;
          if (!config.running) {
            this.error(`${file}:${line} calls ${serviceName} (port ${port}) but service NOT RUNNING`);
          }
          
          // Check if the route exists
          const route = this.backendRoutes.find(r => 
            r.path === path && (r.service === serviceName || r.service === 'go-service')
          );
          if (!route) {
            this.error(`${file}:${line} calls ${endpoint} but route NOT FOUND in ${serviceName}`);
          }
        } else {
          this.error(`${file}:${line} calls unknown service on port ${port}`);
        }
      }
      
      // Check regular API calls
      if (endpoint.startsWith('/api/')) {
        const route = this.backendRoutes.find(r => r.path === endpoint);
        if (!route) {
          this.error(`${file}:${line} calls ${endpoint} but route NOT FOUND in any service`);
        } else {
          // Check if the service handling this route is running
          const servicePort = route.service === 'node-server' ? 5000 : 8081;
          const service = Object.values(this.services).find(s => s.port === servicePort);
          if (service && !service.running) {
            this.error(`${file}:${line} calls ${endpoint} but ${route.service} NOT RUNNING`);
          }
        }
      }
    }
  }

  // Check for common anti-patterns
  checkAntiPatterns() {
    this.log('\n🔍 Checking for anti-patterns...', COLORS.BOLD);
    
    // Memory-specific anti-patterns
    const memoryCallsToNode = this.frontendCalls.filter(call => 
      call.endpoint.includes('/api/memories') && !call.endpoint.includes('localhost:8081')
    );
    
    if (memoryCallsToNode.length > 0) {
      this.error(`Found ${memoryCallsToNode.length} memory API calls going to Node.js instead of Go service (port 8081)`);
      memoryCallsToNode.forEach(call => {
        this.error(`  ${call.file}:${call.line} -> ${call.endpoint}`);
      });
    }
    
    // Check for hardcoded localhost ports in production
    const hardcodedCalls = this.frontendCalls.filter(call => 
      call.endpoint.includes('localhost:')
    );
    
    if (hardcodedCalls.length > 0) {
      this.warning(`Found ${hardcodedCalls.length} hardcoded localhost calls (should use env vars)`);
    }
  }

  findFiles(dir, pattern) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.findFiles(fullPath, pattern));
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  generateReport() {
    this.log('\n📊 ENDPOINT VALIDATION REPORT', COLORS.BOLD);
    this.log('================================', COLORS.BOLD);
    
    if (this.issues.length === 0) {
      this.success('✅ All API endpoints validated successfully!');
      return true;
    } else {
      this.error(`❌ Found ${this.issues.length} API endpoint issues:`);
      this.issues.forEach((issue, i) => {
        this.log(`${i + 1}. ${issue}`, COLORS.RED);
      });
      
      this.log('\n💡 RECOMMENDATIONS:', COLORS.YELLOW);
      this.log('- Ensure all required services are running before testing');
      this.log('- Use environment variables instead of hardcoded ports');
      this.log('- Add this validator to your CI pipeline');
      this.log('- Run this before deploying: node .claude/scripts/api-endpoint-validator.js');
      
      return false;
    }
  }

  async run() {
    this.log('🚀 API Endpoint Validator Starting...', COLORS.BOLD);
    
    this.checkRunningServices();
    this.extractFrontendAPICalls();
    this.extractBackendRoutes();
    this.validateEndpoints();
    this.checkAntiPatterns();
    
    const success = this.generateReport();
    process.exit(success ? 0 : 1);
  }
}

// Run the validator
if (require.main === module) {
  const validator = new APIEndpointValidator();
  validator.run().catch(error => {
    console.error('❌ Validator failed:', error);
    process.exit(1);
  });
}

module.exports = APIEndpointValidator;