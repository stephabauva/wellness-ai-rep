#!/usr/bin/env node

/**
 * Malformed Import Detector - Detects syntax issues in import statements
 * Simple tool to find common import problems across the codebase
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

class MalformedImportDetector {
  constructor() {
    this.issues = [];
    this.filesScanned = 0;
    this.importsChecked = 0;
    this.pathAliases = {
      '@/': './client/src/',
      '@shared': './shared',
      '@shared/': './shared/'
    };
    this.validExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    this.indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
  }

  async scanProject() {
    console.log('🔍 Scanning for malformed imports...\n');
    
    // Scan TypeScript/JavaScript files
    const tsFiles = await glob('client/src/**/*.{ts,tsx,js,jsx}', {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
    });
    
    const serverFiles = await glob('server/**/*.{ts,js}', {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
    });
    
    const sharedFiles = await glob('shared/**/*.{ts,js}', {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
    });
    
    const allFiles = [...tsFiles, ...serverFiles, ...sharedFiles];
    
    for (const file of allFiles) {
      this.scanFileForMalformedImports(file);
    }
    
    this.generateReport();
  }

  scanFileForMalformedImports(filePath) {
    this.filesScanned++;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
        return;
      }
      
      // Check for import statements
      if (trimmedLine.includes('import') || trimmedLine.includes('require')) {
        this.importsChecked++;
        this.checkImportSyntax(filePath, line, lineNumber);
        this.checkImportResolution(filePath, line, lineNumber);
      }
    });
  }

  checkImportSyntax(filePath, line, lineNumber) {
    const trimmedLine = line.trim();
    
    // Only check actual import/require lines
    if (!this.isImportLine(trimmedLine)) {
      return;
    }
    
    // 1. Check for missing quotes around import path
    const missingQuotesRegex = /import.*from\s+([^'"\s][^;\s]*[^'"\s])$/;
    if (missingQuotesRegex.test(trimmedLine) && !trimmedLine.match(/import.*from\s+['"][^'"]*['"]/)) {
      this.addIssue(filePath, lineNumber, 'Missing quotes around import path', trimmedLine);
      return;
    }
    
    // 2. Check for mismatched quotes
    const mismatchedQuotes = trimmedLine.match(/import.*from\s+(['"])[^'"]*(['"]).*/);
    if (mismatchedQuotes && mismatchedQuotes[1] !== mismatchedQuotes[2]) {
      this.addIssue(filePath, lineNumber, 'Mismatched quotes in import path', trimmedLine);
      return;
    }
    
    // 3. Check for unclosed quotes
    const unclosedQuotes = /import.*from\s+['"][^'"]*$/.test(trimmedLine);
    if (unclosedQuotes) {
      this.addIssue(filePath, lineNumber, 'Unclosed quotes in import path', trimmedLine);
      return;
    }
    
    // 4. Check for missing 'from' keyword in named imports
    const namedImportWithoutFrom = /^import\s+\{[^}]*\}\s+['"][^'"]*['"]/.test(trimmedLine);
    if (namedImportWithoutFrom) {
      this.addIssue(filePath, lineNumber, 'Missing "from" keyword', trimmedLine);
      return;
    }
    
    // 5. Check for malformed destructuring (comma without braces)
    const malformedDestructuring = /^import\s+\w+,\s*\w+\s+from\s+/.test(trimmedLine) && !trimmedLine.includes('{');
    if (malformedDestructuring) {
      this.addIssue(filePath, lineNumber, 'Malformed destructuring (missing braces)', trimmedLine);
      return;
    }
    
    // 6. Check for extra commas in destructuring
    const extraCommas = /import\s*\{[^}]*,,+[^}]*\}/.test(trimmedLine);
    if (extraCommas) {
      this.addIssue(filePath, lineNumber, 'Extra commas in destructuring', trimmedLine);
      return;
    }
    
    // 7. Check for incomplete multiline imports (missing closing brace)
    if (trimmedLine.includes('import') && trimmedLine.includes('{') && !trimmedLine.includes('}') && trimmedLine.includes('from')) {
      this.addIssue(filePath, lineNumber, 'Incomplete import statement (missing closing brace)', trimmedLine);
      return;
    }
    
    // 8. Check for incorrect require syntax
    const badRequire = /const\s+\{[^}]*\}\s+=\s+require\s*\([^'"]*\)/.test(trimmedLine);
    if (badRequire && !trimmedLine.match(/require\s*\(\s*['"][^'"]*['"]\s*\)/)) {
      this.addIssue(filePath, lineNumber, 'Malformed require statement (missing quotes)', trimmedLine);
      return;
    }
    
    // 9. Check for spaces in import paths (but allow legitimate spaces)
    const spaceInPath = trimmedLine.match(/import.*from\s+['"]([^'"]*\s[^'"]*)['"]/) && 
                       !trimmedLine.includes('node:') && 
                       !trimmedLine.includes('file://') &&
                       !trimmedLine.includes('@shared') &&
                       !trimmedLine.includes('@/');
    if (spaceInPath) {
      this.addIssue(filePath, lineNumber, 'Unexpected space in import path', trimmedLine);
      return;
    }
    
    // 10. Check for empty import statements
    const emptyImport = /import\s*\{\s*\}\s*from/.test(trimmedLine);
    if (emptyImport) {
      this.addIssue(filePath, lineNumber, 'Empty import statement', trimmedLine);
      return;
    }
  }

  isImportLine(line) {
    // More precise detection of import lines
    return /^(import\s|const\s+.*=\s*require)/.test(line) && 
           (line.includes('from') || line.includes('require('));
  }

  checkImportResolution(filePath, line, lineNumber) {
    const trimmedLine = line.trim();
    
    // Only check actual import/require lines
    if (!this.isImportLine(trimmedLine)) {
      return;
    }

    // Extract import path
    const importPath = this.extractImportPath(trimmedLine);
    if (!importPath) {
      return;
    }

    // Skip node modules and built-in modules
    if (this.isNodeModule(importPath)) {
      return;
    }

    // Resolve the import path
    const resolvedPath = this.resolveImportPath(importPath, path.dirname(filePath));
    
    if (!resolvedPath) {
      this.addIssue(filePath, lineNumber, 'Cannot resolve import path', `${trimmedLine} → Path: ${importPath}`);
      return;
    }

    // Check if resolved file exists
    if (!fs.existsSync(resolvedPath)) {
      this.addIssue(filePath, lineNumber, 'Import file does not exist', `${trimmedLine} → Resolved: ${resolvedPath}`);
      return;
    }

    // Check for TypeScript-specific issues
    this.checkTypeScriptImportIssues(filePath, lineNumber, trimmedLine, importPath, resolvedPath);
  }

  extractImportPath(line) {
    // Match various import patterns and extract the path
    const patterns = [
      /import.*from\s+['"]([^'"]+)['"]/,  // import ... from 'path'
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/, // import('path')
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/ // require('path')
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  isNodeModule(importPath) {
    // Check if it's a node module (doesn't start with ./ or ../ or @/ and isn't an absolute path)
    return !importPath.startsWith('./') && 
           !importPath.startsWith('../') && 
           !importPath.startsWith('@/') && 
           !importPath.startsWith('@shared') &&
           !path.isAbsolute(importPath) &&
           !importPath.startsWith('node:'); // Node.js built-in modules
  }

  resolveImportPath(importPath, fromDir) {
    let resolvedPath = importPath;

    // Handle path aliases
    for (const [alias, replacement] of Object.entries(this.pathAliases)) {
      if (importPath.startsWith(alias)) {
        resolvedPath = importPath.replace(alias, replacement);
        break;
      }
    }

    // Handle relative imports
    if (resolvedPath.startsWith('./') || resolvedPath.startsWith('../')) {
      resolvedPath = path.resolve(fromDir, resolvedPath);
    } else if (!path.isAbsolute(resolvedPath)) {
      // Resolve relative to project root
      resolvedPath = path.resolve(process.cwd(), resolvedPath);
    }

    // Try different extensions and index files
    return this.findExistingFile(resolvedPath);
  }

  findExistingFile(basePath) {
    // First try the exact path
    if (fs.existsSync(basePath)) {
      const stats = fs.statSync(basePath);
      if (stats.isFile()) {
        return basePath;
      }
      if (stats.isDirectory()) {
        // Try index files in directory
        for (const indexFile of this.indexFiles) {
          const indexPath = path.join(basePath, indexFile);
          if (fs.existsSync(indexPath)) {
            return indexPath;
          }
        }
      }
      return null;
    }

    // Try with different extensions
    for (const ext of this.validExtensions) {
      const withExt = basePath + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }
    }

    // Try as directory with index files
    for (const indexFile of this.indexFiles) {
      const indexPath = path.join(basePath, indexFile);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  checkTypeScriptImportIssues(filePath, lineNumber, line, importPath, resolvedPath) {
    const fileExt = path.extname(filePath);
    const isTypeScriptFile = ['.ts', '.tsx'].includes(fileExt);
    
    if (!isTypeScriptFile) {
      return;
    }

    // Check for .js extensions in TypeScript imports
    if (importPath.endsWith('.js') && resolvedPath.endsWith('.ts')) {
      this.addIssue(filePath, lineNumber, 'TypeScript import uses .js extension for .ts file', line);
      return;
    }

    // Check for missing type declarations
    const resolvedExt = path.extname(resolvedPath);
    if (['.js', '.jsx'].includes(resolvedExt)) {
      const typesPath = resolvedPath.replace(/\.(js|jsx)$/, '.d.ts');
      if (!fs.existsSync(typesPath)) {
        this.addIssue(filePath, lineNumber, 'JavaScript import in TypeScript without type declarations', `${line} → Missing: ${typesPath}`);
      }
    }
  }

  addIssue(filePath, lineNumber, issue, line) {
    this.issues.push({
      file: this.getRelativePath(filePath),
      line: lineNumber,
      issue,
      code: line.trim()
    });
  }

  getRelativePath(filePath) {
    return filePath.replace(process.cwd(), '').replace(/^\/+/, '');
  }

  generateReport() {
    console.log('\n📊 Malformed Import Analysis Report\n');
    console.log('='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('🎉 No malformed imports found!');
      console.log(`\n📁 Files scanned: ${this.filesScanned}`);
      console.log(`⚡ Import statements checked: ${this.importsChecked}`);
      return;
    }
    
    console.log(`Total issues found: ${this.issues.length}\n`);
    
    // Group by issue type and category
    const syntaxIssues = {};
    const resolutionIssues = {};
    
    this.issues.forEach(issue => {
      const isSyntaxIssue = this.isSyntaxIssue(issue.issue);
      const target = isSyntaxIssue ? syntaxIssues : resolutionIssues;
      
      if (!target[issue.issue]) {
        target[issue.issue] = [];
      }
      target[issue.issue].push(issue);
    });
    
    // Display syntax issues
    if (Object.keys(syntaxIssues).length > 0) {
      console.log('\n🔧 SYNTAX ISSUES:');
      console.log('='.repeat(30));
      this.displayIssueGroup(syntaxIssues);
    }
    
    // Display resolution issues
    if (Object.keys(resolutionIssues).length > 0) {
      console.log('\n🔍 PATH RESOLUTION ISSUES:');
      console.log('='.repeat(30));
      this.displayIssueGroup(resolutionIssues);
    }
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   📁 Files scanned: ${this.filesScanned}`);
    console.log(`   ⚡ Import statements checked: ${this.importsChecked}`);
    console.log(`   🔧 Syntax issues: ${Object.values(syntaxIssues).flat().length}`);
    console.log(`   🔍 Resolution issues: ${Object.values(resolutionIssues).flat().length}`);
    
    console.log('\n📋 Detailed breakdown:');
    [...Object.entries(syntaxIssues), ...Object.entries(resolutionIssues)].forEach(([type, issues]) => {
      console.log(`   • ${type}: ${issues.length}`);
    });
  }

  isSyntaxIssue(issueType) {
    const syntaxIssueTypes = [
      'Missing quotes around import path',
      'Mismatched quotes in import path',
      'Unclosed quotes in import path',
      'Missing "from" keyword',
      'Malformed destructuring (missing braces)',
      'Extra commas in destructuring',
      'Incomplete import statement (missing closing brace)',
      'Malformed require statement (missing quotes)',
      'Unexpected space in import path',
      'Empty import statement'
    ];
    return syntaxIssueTypes.includes(issueType);
  }

  displayIssueGroup(issueGroup) {
    Object.entries(issueGroup).forEach(([issueType, issues]) => {
      console.log(`\n🚨 ${issueType} (${issues.length} occurrences):`);
      console.log('-'.repeat(40));
      
      issues.forEach(issue => {
        console.log(`📁 ${issue.file}:${issue.line}`);
        console.log(`   ${issue.code}`);
        console.log('');
      });
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const detector = new MalformedImportDetector();
  
  detector.scanProject().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export default MalformedImportDetector;