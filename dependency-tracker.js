#!/usr/bin/env node

/**
 * Dependency Tracker - Tracks "who uses what" across the codebase
 * Identifies cross-domain dependencies and potential impact of changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);

class DependencyTracker {
  constructor() {
    this.dependencies = new Map(); // file -> { usedBy: [], exports: [] }
    this.domainMapping = this.buildDomainMapping();
    this.crossDomainUsage = new Map();
  }

  buildDomainMapping() {
    return {
      'components/chat': 'chat',
      'components/Chat': 'chat',
      'components/Message': 'chat',
      'components/filemanager': 'file-manager',
      'components/FileManager': 'file-manager',
      'components/health': 'health',
      'components/Health': 'health',
      'components/memory': 'memory',
      'components/Memory': 'memory',
      'components/settings': 'settings',
      'components/Settings': 'settings',
      'hooks/useFile': 'file-manager',
      'hooks/useChat': 'chat',
      'hooks/useHealth': 'health',
      'hooks/useMemory': 'memory',
      'routes/chat': 'chat',
      'routes/file': 'file-manager',
      'routes/health': 'health',
      'routes/memory': 'memory',
      'routes/auth': 'auth',
      'services/file': 'file-manager',
      'services/chat': 'chat',
      'services/health': 'health',
      'services/memory': 'memory'
    };
  }

  getDomainFromPath(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Direct domain folders
    if (normalizedPath.includes('/chat/')) return 'chat';
    if (normalizedPath.includes('/filemanager/')) return 'file-manager';
    if (normalizedPath.includes('/file-manager/')) return 'file-manager';
    if (normalizedPath.includes('/health/')) return 'health';
    if (normalizedPath.includes('/memory/')) return 'memory';
    if (normalizedPath.includes('/settings/')) return 'settings';
    
    // Infrastructure/shared services
    if (normalizedPath.includes('/db/') || normalizedPath.includes('/database/')) return 'infrastructure/database';
    if (normalizedPath.includes('/auth/') || normalizedPath.includes('/authentication/')) return 'infrastructure/auth';
    if (normalizedPath.includes('/cache/') || normalizedPath.includes('cache-service')) return 'infrastructure/cache';
    if (normalizedPath.includes('/logger/') || normalizedPath.includes('logger-service')) return 'infrastructure/logging';
    if (normalizedPath.includes('/routes/')) return 'infrastructure/routing';
    
    // Core app structure
    if (normalizedPath.includes('/components/ui/')) return 'shared/ui-components';
    if (normalizedPath.includes('/hooks/use') && normalizedPath.includes('Settings')) return 'settings';
    if (normalizedPath.includes('/hooks/use') && normalizedPath.includes('File')) return 'file-manager';
    if (normalizedPath.includes('/hooks/use') && normalizedPath.includes('Chat')) return 'chat';
    if (normalizedPath.includes('/hooks/use') && normalizedPath.includes('Health')) return 'health';
    if (normalizedPath.includes('/hooks/use') && normalizedPath.includes('Memory')) return 'memory';
    if (normalizedPath.includes('/hooks/')) return 'shared/hooks';
    if (normalizedPath.includes('/utils/')) return 'shared/utilities';
    if (normalizedPath.includes('/types/') || normalizedPath.includes('schema.ts')) return 'shared/types';
    if (normalizedPath.includes('/services/') && !this.isServiceDomainSpecific(normalizedPath)) return 'shared/services';
    
    // Check mapping patterns
    for (const [pattern, domain] of Object.entries(this.domainMapping)) {
      if (normalizedPath.includes(pattern)) {
        return domain;
      }
    }
    
    // Check filename patterns
    const filename = path.basename(normalizedPath);
    if (filename.match(/Chat|Message|Conversation/i)) return 'chat';
    if (filename.match(/File|Upload|Download/i)) return 'file-manager';
    if (filename.match(/Health|Metric|Vital/i)) return 'health';
    if (filename.match(/Memory|Remember|Recall/i)) return 'memory';
    if (filename.match(/Setting|Preference|Config/i)) return 'settings';
    if (filename.match(/App\.tsx|main\.tsx|index\.tsx/)) return 'app/root';
    
    // Root level files
    if (normalizedPath.match(/^[^/]+\.(ts|tsx|js|jsx)$/)) return 'app/root';
    
    return 'unknown/needs-classification';
  }

  isServiceDomainSpecific(normalizedPath) {
    const domainSpecificServices = [
      'chat-', 'memory-', 'health-', 'file-', 'settings-',
      '/chat/', '/memory/', '/health/', '/file/', '/settings/'
    ];
    return domainSpecificServices.some(pattern => normalizedPath.includes(pattern));
  }

  async scanProject() {
    console.log('🔍 Scanning project for dependencies...\n');
    
    // Scan TypeScript/JavaScript files
    const tsFiles = await glob('client/src/**/*.{ts,tsx,js,jsx}', {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
    });
    
    const serverFiles = await glob('server/**/*.{ts,js}', {
      ignore: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**']
    });
    
    const allFiles = [...tsFiles, ...serverFiles];
    
    // First pass: identify exports
    for (const file of allFiles) {
      await this.identifyExports(file);
    }
    
    // Second pass: identify imports and usage
    for (const file of allFiles) {
      await this.scanFileImports(file);
    }
    
    // Analyze cross-domain usage
    this.analyzeCrossDomainUsage();
    
    return this.generateReport();
  }

  async identifyExports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const exports = [];
    
    // Match named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'named',
        line: content.substring(0, match.index).split('\n').length
      });
    }
    
    // Match default exports
    if (content.match(/export\s+default\s+/)) {
      exports.push({
        name: 'default',
        type: 'default'
      });
    }
    
    // Match export { ... } statements
    const reExportRegex = /export\s*\{([^}]+)\}/g;
    while ((match = reExportRegex.exec(content)) !== null) {
      const exportedItems = match[1].split(',').map(item => {
        const parts = item.trim().split(/\s+as\s+/);
        return parts[parts.length - 1].trim();
      });
      exportedItems.forEach(item => {
        exports.push({
          name: item,
          type: 'named'
        });
      });
    }
    
    if (exports.length > 0) {
      this.dependencies.set(filePath, {
        exports,
        usedBy: [],
        domain: this.getDomainFromPath(filePath)
      });
    }
  }

  async scanFileImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileDir = path.dirname(filePath);
    const importingDomain = this.getDomainFromPath(filePath);
    
    // Match various import patterns
    const importPatterns = [
      // import { X } from 'Y'
      /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g,
      // import X from 'Y'
      /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g,
      // import * as X from 'Y'
      /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g,
      // const X = require('Y')
      /const\s+(\w+)\s*=\s*require\s*\(['"]([^'"]+)['"]\)/g
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[2];
        const importedItems = match[1].includes(',') 
          ? match[1].split(',').map(i => i.trim())
          : [match[1].trim()];
        
        // Resolve the actual file path
        const resolvedPath = this.resolveImportPath(importPath, fileDir);
        if (resolvedPath && this.dependencies.has(resolvedPath)) {
          const targetDomain = this.getDomainFromPath(resolvedPath);
          
          // Record the usage
          const depInfo = this.dependencies.get(resolvedPath);
          depInfo.usedBy.push({
            file: filePath,
            domain: importingDomain,
            imports: importedItems,
            line: content.substring(0, match.index).split('\n').length
          });
          
          // Track cross-domain usage
          if (importingDomain !== targetDomain && targetDomain !== 'shared') {
            const key = `${resolvedPath}`;
            if (!this.crossDomainUsage.has(key)) {
              this.crossDomainUsage.set(key, {
                file: resolvedPath,
                sourceDomain: targetDomain,
                usedByDomains: new Set()
              });
            }
            this.crossDomainUsage.get(key).usedByDomains.add(importingDomain);
          }
        }
      }
    }
  }

  resolveImportPath(importPath, fromDir) {
    // Handle @/ alias
    if (importPath.startsWith('@/')) {
      importPath = importPath.replace('@/', 'client/src/');
    }
    
    // Handle relative imports
    if (importPath.startsWith('.')) {
      importPath = path.join(fromDir, importPath);
    }
    
    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    for (const ext of extensions) {
      const fullPath = path.normalize(importPath + ext);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    return null;
  }

  analyzeCrossDomainUsage() {
    console.log('\n🔄 Analyzing cross-domain dependencies...\n');
    
    // Find shared components used across domains
    for (const [filePath, info] of this.dependencies.entries()) {
      const domains = new Set(info.usedBy.map(u => u.domain));
      
      if (domains.size > 1 && info.domain !== 'shared') {
        console.log(`⚠️  Cross-domain usage detected:`);
        console.log(`   File: ${filePath}`);
        console.log(`   Original domain: ${info.domain}`);
        console.log(`   Used by domains: ${Array.from(domains).join(', ')}`);
        console.log(`   Total usage: ${info.usedBy.length} imports\n`);
      }
    }
  }

  generateReport() {
    const report = {
      summary: {
        totalFiles: this.dependencies.size,
        crossDomainFiles: this.crossDomainUsage.size,
        totalDependencies: Array.from(this.dependencies.values())
          .reduce((sum, dep) => sum + dep.usedBy.length, 0)
      },
      crossDomainIssues: [],
      recommendations: []
    };
    
    // Generate cross-domain issues
    for (const [filePath, usage] of this.crossDomainUsage.entries()) {
      const depInfo = this.dependencies.get(filePath);
      report.crossDomainIssues.push({
        file: filePath,
        sourceDomain: usage.sourceDomain,
        usedByDomains: Array.from(usage.usedByDomains),
        usageCount: depInfo.usedBy.length,
        exports: depInfo.exports.map(e => e.name),
        risk: usage.usedByDomains.size >= 3 ? 'high' : 'medium'
      });
    }
    
    // Sort by risk and usage count
    report.crossDomainIssues.sort((a, b) => {
      if (a.risk !== b.risk) return a.risk === 'high' ? -1 : 1;
      return b.usageCount - a.usageCount;
    });
    
    // Generate recommendations
    if (report.crossDomainIssues.length > 0) {
      report.recommendations.push(
        'Consider moving highly shared components to a dedicated "shared" directory',
        'Document cross-domain dependencies in system maps',
        'Add @used-by comments to track usage',
        'Create abstraction layers to reduce direct cross-domain coupling'
      );
    }
    
    return report;
  }

  async generateDependencyMap(outputPath = 'dependency-map.json') {
    const dependencyMap = {};
    
    for (const [filePath, info] of this.dependencies.entries()) {
      if (info.usedBy.length > 0) {
        dependencyMap[filePath] = {
          domain: info.domain,
          exports: info.exports.map(e => e.name),
          usedBy: info.usedBy.map(u => ({
            file: u.file,
            domain: u.domain,
            imports: u.imports
          })),
          crossDomain: info.usedBy.some(u => u.domain !== info.domain),
          usageCount: info.usedBy.length
        };
      }
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(dependencyMap, null, 2));
    console.log(`\n💾 Dependency map saved to ${outputPath}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new DependencyTracker();
  
  tracker.scanProject().then(report => {
    console.log('\n📊 Dependency Analysis Report\n');
    console.log('='.repeat(50));
    console.log(`Total files analyzed: ${report.summary.totalFiles}`);
    console.log(`Cross-domain files: ${report.summary.crossDomainFiles}`);
    console.log(`Total dependencies: ${report.summary.totalDependencies}`);
    
    if (report.crossDomainIssues.length > 0) {
      console.log('\n🚨 Cross-Domain Dependencies Found:\n');
      
      report.crossDomainIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.file}`);
        console.log(`   Domain: ${issue.sourceDomain} → ${issue.usedByDomains.join(', ')}`);
        console.log(`   Risk: ${issue.risk.toUpperCase()}`);
        console.log(`   Usage count: ${issue.usageCount}`);
        console.log(`   Exports: ${issue.exports.join(', ')}`);
        console.log('');
      });
      
      console.log('📋 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    // Generate dependency map file
    tracker.generateDependencyMap();
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export default DependencyTracker;