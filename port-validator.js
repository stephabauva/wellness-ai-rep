#!/usr/bin/env node

/**
 * Port Configuration Validator
 * Ensures all port configurations are consistent across the codebase
 * Part of the multi-layer defense system
 */

import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

const EXPECTED_MAIN_PORT = 5000;
const ALLOWED_SERVICE_PORTS = [5001]; // Go file accelerator
const PORT_PATTERNS = [
  /port.*?(\d{4,5})/gi,
  /localhost:(\d{4,5})/gi,
  /running.*?on.*?port.*?(\d{4,5})/gi,
  /serve.*?on.*?port.*?(\d{4,5})/gi
];

class PortValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validatedFiles = 0;
  }

  async validateAllFiles() {
    console.log('🔍 Starting port configuration validation...\n');

    const filesToCheck = await glob([
      'server/**/*.ts',
      'server/**/*.js',
      'shared/**/*.ts',
      'client/**/*.ts',
      'scripts/**/*.ts',
      'scripts/**/*.js',
      '*.md',
      '*.json',
      'go-*/**/*.go',
      'go-*/**/*.sh'
    ], { ignore: ['node_modules/**', 'dist/**', '.git/**'] });

    for (const filePath of filesToCheck) {
      await this.validateFile(filePath);
    }

    this.printResults();
    return this.errors.length === 0;
  }

  async validateFile(filePath) {
    if (!existsSync(filePath)) return;

    try {
      const content = readFileSync(filePath, 'utf8');
      this.validatedFiles++;

      // Extract all port numbers from the file
      const foundPorts = new Set();
      
      for (const pattern of PORT_PATTERNS) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const port = parseInt(match[1]);
          if (port >= 3000 && port <= 9000) { // Reasonable port range
            foundPorts.add(port);
          }
        }
      }

      // Validate each found port
      for (const port of foundPorts) {
        this.validatePortUsage(filePath, port, content);
      }

    } catch (error) {
      this.warnings.push(`⚠️  Could not read file: ${filePath} - ${error.message}`);
    }
  }

  validatePortUsage(filePath, port, content) {
    const isMainServer = filePath.includes('server/index.ts');
    const isApiClient = filePath.includes('api-client.ts');
    const isGoService = filePath.includes('go-');
    const isDocumentation = filePath.endsWith('.md');

    if (isMainServer) {
      // Main server must use port 5000
      if (port !== EXPECTED_MAIN_PORT) {
        this.errors.push(`❌ ${filePath}: Main server using port ${port}, should be ${EXPECTED_MAIN_PORT}`);
      }
    } else if (isApiClient) {
      // API client must connect to main port
      if (port !== EXPECTED_MAIN_PORT) {
        this.errors.push(`❌ ${filePath}: API client connecting to port ${port}, should be ${EXPECTED_MAIN_PORT}`);
      }
    } else if (isGoService) {
      // Go services can use allowed service ports
      if (!ALLOWED_SERVICE_PORTS.includes(port) && port !== EXPECTED_MAIN_PORT) {
        this.warnings.push(`⚠️  ${filePath}: Go service using port ${port}, consider using an allowed service port: ${ALLOWED_SERVICE_PORTS.join(', ')}`);
      }
    } else if (isDocumentation) {
      // Documentation should reference correct ports
      if (port !== EXPECTED_MAIN_PORT && !ALLOWED_SERVICE_PORTS.includes(port)) {
        this.warnings.push(`⚠️  ${filePath}: Documentation references port ${port}, verify this is correct`);
      }
    } else {
      // Other files should generally use main port
      if (port !== EXPECTED_MAIN_PORT && !ALLOWED_SERVICE_PORTS.includes(port)) {
        this.warnings.push(`⚠️  ${filePath}: Using port ${port}, verify this is intended`);
      }
    }
  }

  printResults() {
    console.log(`\n📊 Port Validation Results:`);
    console.log(`   Files checked: ${this.validatedFiles}`);
    console.log(`   Expected main port: ${EXPECTED_MAIN_PORT}`);
    console.log(`   Allowed service ports: ${ALLOWED_SERVICE_PORTS.join(', ')}`);

    if (this.errors.length === 0) {
      console.log('\n✅ All port configurations are valid!');
    } else {
      console.log(`\n❌ Found ${this.errors.length} port configuration errors:`);
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Found ${this.warnings.length} warnings:`);
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    console.log('\n🛡️  Port validation complete');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new PortValidator();
  validator.validateAllFiles().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Port validation failed:', error);
    process.exit(1);
  });
}

export { PortValidator };