#!/usr/bin/env node

/**
 * Async/Await Compatibility Detector
 * 
 * Detects potential async/await mismatches that could cause "Cannot read properties of undefined" errors:
 * 1. Synchronous functions calling async functions without await
 * 2. Service getters returning promises instead of service objects
 * 3. Route handlers calling service getters without proper await
 * 4. Missing async keywords on functions that call async services
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AsyncAwaitDetector {
  constructor() {
    this.issues = [];
    this.serviceGetters = new Map();
    this.asyncFunctions = new Set();
    this.routeFiles = [];
  }

  /**
   * Scan a file for async/await issues
   */
  scanFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Skip if file is too large or not relevant
    if (lines.length > 2000 || !this.isRelevantFile(filePath)) return;
    
    console.log(`Scanning: ${path.relative(process.cwd(), filePath)}`);
    
    this.detectServiceGetterIssues(filePath, content, lines);
    this.detectRouteHandlerIssues(filePath, content, lines);
    this.detectAsyncFunctionCalls(filePath, content, lines);
  }

  /**
   * Check if file is relevant for async/await analysis
   */
  isRelevantFile(filePath) {
    const ext = path.extname(filePath);
    if (!['.js', '.ts', '.jsx', '.tsx'].includes(ext)) return false;
    
    const relativePath = path.relative(process.cwd(), filePath);
    const excludePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      'malformed-import-detector.js',
      'dependency-tracker.js',
      'system-map-tracker.js'
    ];
    
    return !excludePatterns.some(pattern => relativePath.includes(pattern));
  }

  /**
   * Detect service getter issues like the getCategories problem
   */
  detectServiceGetterIssues(filePath, content, lines) {
    // Look for service getter functions that might be async
    const serviceGetterPattern = /export\s+const\s+(\w+Service|\w+)\s*=\s*(?:async\s+)?\(\s*\)\s*=>\s*(.+)/g;
    let match;
    
    while ((match = serviceGetterPattern.exec(content)) !== null) {
      const [fullMatch, functionName, returnStatement] = match;
      const lineNumber = this.getLineNumber(content, match.index);
      
      // Check if it's calling an async function without await
      if (returnStatement.includes('get') && returnStatement.includes('(') && !returnStatement.includes('await')) {
        // Check if the called function is async
        const calledFunction = returnStatement.match(/(\w+)\(/)?.[1];
        if (calledFunction && this.looksLikeAsyncFunction(calledFunction)) {
          this.issues.push({
            type: 'SERVICE_GETTER_ASYNC_MISMATCH',
            file: filePath,
            line: lineNumber,
            function: functionName,
            issue: `Service getter '${functionName}' calls async function '${calledFunction}' without await`,
            suggestion: `Make '${functionName}' async and await the call: async () => await ${calledFunction}()`,
            severity: 'HIGH',
            example: `export const ${functionName} = async () => await ${calledFunction}();`
          });
        }
      }
      
      this.serviceGetters.set(functionName, {
        filePath,
        lineNumber,
        isAsync: fullMatch.includes('async'),
        returnStatement
      });
    }
  }

  /**
   * Detect route handler issues calling service getters
   */
  detectRouteHandlerIssues(filePath, content, lines) {
    if (!filePath.includes('routes')) return;
    
    // Look for route handlers calling service getters
    const routeHandlerPattern = /app\.(get|post|put|patch|delete)\s*\([^,]+,\s*(?:async\s+)?\([^)]*\)\s*=>\s*{([^}]+)}/g;
    let match;
    
    while ((match = routeHandlerPattern.exec(content)) !== null) {
      const [fullMatch, method, handlerBody] = match;
      const lineNumber = this.getLineNumber(content, match.index);
      const isAsync = fullMatch.includes('async');
      
      // Check for service getter calls in the handler body
      for (const [serviceGetterName, info] of this.serviceGetters) {
        const serviceCallPattern = new RegExp(`${serviceGetterName}\\s*\\(\\s*\\)\\s*\\.\\s*(\\w+)`, 'g');
        let serviceMatch;
        
        while ((serviceMatch = serviceCallPattern.exec(handlerBody)) !== null) {
          const [, methodCall] = serviceMatch;
          const callLineNumber = lineNumber + this.getLineNumber(handlerBody, serviceMatch.index);
          
          // Check if service getter is async but not awaited
          if (info.isAsync && !this.isProperlyAwaited(handlerBody, serviceMatch.index)) {
            this.issues.push({
              type: 'ROUTE_HANDLER_ASYNC_MISMATCH',
              file: filePath,
              line: callLineNumber,
              function: `${method.toUpperCase()} route handler`,
              issue: `Calling async service getter '${serviceGetterName}' without await`,
              suggestion: `Change '${serviceGetterName}().${methodCall}' to 'await ${serviceGetterName}().${methodCall}' or '(await ${serviceGetterName}()).${methodCall}'`,
              severity: 'HIGH',
              example: `const result = await (await ${serviceGetterName}()).${methodCall}();`
            });
          }
        }
      }
    }
  }

  /**
   * Detect async function calls without await
   */
  detectAsyncFunctionCalls(filePath, content, lines) {
    // Look for function calls that might be async but not awaited
    const asyncCallPattern = /(\w+)\s*\(\s*\)\s*\.\s*(\w+)/g;
    let match;
    
    while ((match = asyncCallPattern.exec(content)) !== null) {
      const [fullMatch, functionName, methodCall] = match;
      const lineNumber = this.getLineNumber(content, match.index);
      
      // Skip if it's already awaited
      if (this.isProperlyAwaited(content, match.index)) continue;
      
      // Check if this looks like a service getter call
      if (this.looksLikeServiceGetter(functionName) && this.looksLikeAsyncMethod(methodCall)) {
        this.issues.push({
          type: 'MISSING_AWAIT',
          file: filePath,
          line: lineNumber,
          function: 'unknown',
          issue: `Potential async call '${functionName}().${methodCall}' without await`,
          suggestion: `Consider adding await: await ${functionName}().${methodCall} or (await ${functionName}()).${methodCall}`,
          severity: 'MEDIUM',
          example: `const result = await (await ${functionName}()).${methodCall};`
        });
      }
    }
  }

  /**
   * Check if a function call is properly awaited
   */
  isProperlyAwaited(content, index) {
    const beforeCall = content.substring(Math.max(0, index - 50), index);
    return /await\s*\(\s*await\s*$/.test(beforeCall) || /await\s*$/.test(beforeCall);
  }

  /**
   * Check if function name looks like a service getter
   */
  looksLikeServiceGetter(name) {
    return name.includes('Service') || name.includes('service') || 
           ['categoryService', 'memoryService', 'enhancedMemoryService', 'transcriptionService'].includes(name);
  }

  /**
   * Check if method name looks async
   */
  looksLikeAsyncMethod(name) {
    const asyncMethods = ['get', 'create', 'update', 'delete', 'fetch', 'save', 'load', 'process'];
    return asyncMethods.some(method => name.toLowerCase().includes(method));
  }

  /**
   * Check if function name looks like an async function
   */
  looksLikeAsyncFunction(name) {
    return name.includes('get') || name.includes('Service') || 
           ['getFileManagerServices', 'getMemoryServices', 'getHealthServices'].includes(name);
  }

  /**
   * Get line number from content and index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Scan all relevant files in the project
   */
  scanProject() {
    const scanPaths = [
      path.join(process.cwd(), 'server'),
      path.join(process.cwd(), 'client', 'src'),
      path.join(process.cwd(), 'shared')
    ];

    for (const scanPath of scanPaths) {
      if (fs.existsSync(scanPath)) {
        this.scanDirectory(scanPath);
      }
    }
  }

  /**
   * Recursively scan directory
   */
  scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.scanDirectory(fullPath);
      } else if (stat.isFile()) {
        this.scanFile(fullPath);
      }
    }
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('ASYNC/AWAIT COMPATIBILITY ANALYSIS REPORT');
    console.log('='.repeat(80));

    if (this.issues.length === 0) {
      console.log('✅ No async/await compatibility issues found!');
      return;
    }

    // Group issues by severity
    const highSeverity = this.issues.filter(issue => issue.severity === 'HIGH');
    const mediumSeverity = this.issues.filter(issue => issue.severity === 'MEDIUM');
    const lowSeverity = this.issues.filter(issue => issue.severity === 'LOW');

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Issues: ${this.issues.length}`);
    console.log(`   🔴 High Severity: ${highSeverity.length}`);
    console.log(`   🟡 Medium Severity: ${mediumSeverity.length}`);
    console.log(`   🟢 Low Severity: ${lowSeverity.length}`);

    // Report high severity issues first
    if (highSeverity.length > 0) {
      console.log('\n🔴 HIGH SEVERITY ISSUES (likely to cause runtime errors):');
      this.reportIssues(highSeverity);
    }

    if (mediumSeverity.length > 0) {
      console.log('\n🟡 MEDIUM SEVERITY ISSUES (potential problems):');
      this.reportIssues(mediumSeverity);
    }

    if (lowSeverity.length > 0) {
      console.log('\n🟢 LOW SEVERITY ISSUES (improvements):');
      this.reportIssues(lowSeverity);
    }

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Fix HIGH severity issues immediately');
    console.log('   2. Ensure all service getters are properly async/awaited');
    console.log('   3. Use "await (await serviceGetter()).method()" pattern consistently');
    console.log('   4. Add TypeScript strict mode for better async detection');
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Report issues for a specific severity level
   */
  reportIssues(issues) {
    for (const issue of issues) {
      console.log(`\n   File: ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
      if (issue.example) {
        console.log(`   Example: ${issue.example}`);
      }
    }
  }

  /**
   * Run the detector
   */
  run() {
    console.log('🔍 Starting async/await compatibility analysis...');
    console.log('This will help prevent "Cannot read properties of undefined" errors\n');
    
    this.scanProject();
    this.generateReport();
    
    // Exit with error code if high severity issues found
    const highSeverityCount = this.issues.filter(i => i.severity === 'HIGH').length;
    if (highSeverityCount > 0) {
      console.log(`\n❌ Found ${highSeverityCount} high severity async/await issues that need immediate attention.`);
      process.exit(1);
    }
    
    console.log('\n✅ Async/await compatibility analysis complete.');
  }
}

// Run the detector
const detector = new AsyncAwaitDetector();
detector.run();