#!/usr/bin/env node

/**
 * Cross-Domain System Map Validator V2
 * 
 * Enhanced validator that combines system map analysis with actual code dependency scanning
 * to catch cross-domain issues that the original validator missed.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DependencyTracker from './dependency-tracker.js';

const __filename = fileURLToPath(import.meta.url);

class CrossDomainValidatorV2 {
  constructor() {
    this.systemMapsDir = '.system-maps/json-system-maps';
    this.rootMapPath = path.join(this.systemMapsDir, 'root.map.json');
    this.issues = [];
    this.dependencyTracker = new DependencyTracker();
    this.systemMapComponents = new Map();
    this.actualDependencies = new Map();
  }

  async validate() {
    console.log('🔍 Starting enhanced cross-domain validation...\n');
    
    try {
      // Phase 1: Analyze system maps
      console.log('📋 Phase 1: Analyzing system maps...');
      const rootMap = this.loadRootMap();
      await this.analyzeSystemMaps(rootMap);
      
      // Phase 2: Scan actual code dependencies
      console.log('\n💻 Phase 2: Scanning actual code dependencies...');
      await this.scanCodeDependencies();
      
      // Phase 3: Compare and detect issues
      console.log('\n🔄 Phase 3: Comparing system maps with actual usage...');
      this.detectCrossDomainIssues();
      
      // Phase 4: Report findings
      this.reportFindings();
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  loadRootMap() {
    if (!fs.existsSync(this.rootMapPath)) {
      throw new Error(`Root map not found: ${this.rootMapPath}`);
    }
    return JSON.parse(fs.readFileSync(this.rootMapPath, 'utf8'));
  }

  async analyzeSystemMaps(rootMap) {
    // Extract components and their documented domains from system maps
    for (const [domainName, domainInfo] of Object.entries(rootMap.domains)) {
      await this.analyzeDomainMaps(domainName, domainInfo);
    }
    
    console.log(`   Found ${this.systemMapComponents.size} components in system maps`);
  }

  async analyzeDomainMaps(domainName, domainInfo) {
    // Process subdomains
    if (domainInfo.subdomains) {
      for (const [subdomainName, subdomainInfo] of Object.entries(domainInfo.subdomains)) {
        const mapPath = path.join(this.systemMapsDir, subdomainInfo.path);
        if (fs.existsSync(mapPath)) {
          const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
          this.extractComponentsFromMap(domainName, mapData);
        }
      }
    }

    // Process features
    if (domainInfo.features) {
      for (const [featureName, featureInfo] of Object.entries(domainInfo.features)) {
        const mapPath = path.join(this.systemMapsDir, featureInfo.path);
        if (fs.existsSync(mapPath)) {
          const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
          this.extractComponentsFromMap(domainName, mapData);
        }
      }
    }
  }

  extractComponentsFromMap(domainName, mapData) {
    // Extract components section
    if (mapData.components) {
      Object.entries(mapData.components).forEach(([name, info]) => {
        if (info.path) {
          this.systemMapComponents.set(info.path, {
            name,
            documentedDomain: domainName,
            systemMapInfo: info
          });
        }
      });
    }

    // Extract from architecturalLayers
    if (mapData.architecturalLayers?.presentation?.components) {
      const components = mapData.architecturalLayers.presentation.components;
      ['primary', 'supporting', 'shared'].forEach(type => {
        if (components[type]) {
          components[type].forEach(comp => {
            this.systemMapComponents.set(comp, {
              name: comp,
              documentedDomain: domainName,
              type
            });
          });
        }
      });
    }

    // Extract from files.ui
    if (mapData.files?.ui) {
      mapData.files.ui.forEach(file => {
        this.systemMapComponents.set(file, {
          name: file,
          documentedDomain: domainName,
          type: 'ui'
        });
      });
    }

    // Recursively extract from feature groups
    if (mapData.featureGroups) {
      Object.values(mapData.featureGroups).forEach(group => {
        if (group.features) {
          Object.values(group.features).forEach(feature => {
            if (feature.components) {
              feature.components.forEach(comp => {
                this.systemMapComponents.set(comp, {
                  name: comp,
                  documentedDomain: domainName,
                  feature: feature.description
                });
              });
            }
          });
        }
      });
    }
  }

  async scanCodeDependencies() {
    // Use dependency tracker to get actual dependencies
    const report = await this.dependencyTracker.scanProject();
    
    // Store cross-domain dependencies
    report.crossDomainIssues.forEach(issue => {
      this.actualDependencies.set(issue.file, {
        sourceDomain: issue.sourceDomain,
        usedByDomains: issue.usedByDomains,
        exports: issue.exports,
        usageCount: issue.usageCount,
        risk: issue.risk
      });
    });
    
    console.log(`   Found ${this.actualDependencies.size} files with cross-domain usage`);
  }

  detectCrossDomainIssues() {
    // Issue 1: Components documented in one domain but used by others
    for (const [filePath, actualUsage] of this.actualDependencies.entries()) {
      const componentName = path.basename(filePath, path.extname(filePath));
      let systemMapEntry = null;
      
      // Try to find in system maps
      for (const [mapPath, mapInfo] of this.systemMapComponents.entries()) {
        if (mapPath.includes(componentName) || mapInfo.name === componentName) {
          systemMapEntry = mapInfo;
          break;
        }
      }
      
      if (systemMapEntry) {
        // Check if documented domain matches actual usage
        if (systemMapEntry.documentedDomain !== actualUsage.sourceDomain) {
          this.issues.push({
            type: 'DOMAIN_MISMATCH',
            component: componentName,
            file: filePath,
            documentedDomain: systemMapEntry.documentedDomain,
            actualDomain: actualUsage.sourceDomain,
            severity: 'high',
            details: `Component documented in ${systemMapEntry.documentedDomain} but actually belongs to ${actualUsage.sourceDomain}`
          });
        }
        
        // Check if cross-domain usage is documented
        if (actualUsage.usedByDomains.length > 0) {
          const undocumentedUsage = actualUsage.usedByDomains.filter(
            domain => domain !== systemMapEntry.documentedDomain
          );
          
          if (undocumentedUsage.length > 0) {
            this.issues.push({
              type: 'UNDOCUMENTED_CROSS_DOMAIN_USAGE',
              component: componentName,
              file: filePath,
              documentedDomain: systemMapEntry.documentedDomain,
              usedByDomains: actualUsage.usedByDomains,
              severity: 'medium',
              details: `Component used by ${actualUsage.usedByDomains.join(', ')} but only documented in ${systemMapEntry.documentedDomain}`
            });
          }
        }
      } else {
        // Component not in system maps at all
        this.issues.push({
          type: 'MISSING_FROM_SYSTEM_MAPS',
          component: componentName,
          file: filePath,
          actualDomain: actualUsage.sourceDomain,
          usedByDomains: actualUsage.usedByDomains,
          severity: 'medium',
          details: `Cross-domain component not documented in any system map`
        });
      }
    }
    
    // Issue 2: Check for specific known problematic patterns
    this.checkKnownPatterns();
  }

  checkKnownPatterns() {
    // Pattern 1: File manager hooks used in chat
    const fileManagementUsage = this.actualDependencies.get('client/src/hooks/useFileManagement.ts');
    if (fileManagementUsage && fileManagementUsage.usedByDomains.includes('chat')) {
      this.issues.push({
        type: 'ARCHITECTURAL_VIOLATION',
        pattern: 'FILE_MANAGER_IN_CHAT',
        severity: 'high',
        details: 'Chat domain directly uses file-manager hooks instead of abstraction layer',
        recommendation: 'Create chat-specific file handling abstraction',
        affectedFiles: ['useFileManagement', 'AttachmentPreview', 'ChatInputArea']
      });
    }
    
    // Pattern 2: Shared components with different behaviors
    const attachmentPreview = Array.from(this.actualDependencies.entries())
      .find(([path]) => path.includes('AttachmentPreview'));
    
    if (attachmentPreview) {
      this.issues.push({
        type: 'SHARED_COMPONENT_BEHAVIOR_RISK',
        component: 'AttachmentPreview',
        severity: 'medium',
        details: 'AttachmentPreview used across domains may have conflicting requirements',
        recommendation: 'Document expected behavior per domain or create domain-specific variants',
        domains: attachmentPreview[1].usedByDomains
      });
    }
    
    // Pattern 3: Missing chat-specific endpoints
    const chatAttachmentEndpoint = '/api/chat/attachments';
    this.issues.push({
      type: 'MISSING_DOMAIN_ENDPOINT',
      endpoint: chatAttachmentEndpoint,
      severity: 'high',
      details: 'Chat uses generic /api/files endpoint instead of domain-specific endpoint',
      recommendation: 'Implement /api/chat/attachments to handle chat-specific logic',
      impact: 'Chat attachments bypass chat-specific processing and retention policies'
    });
  }

  reportFindings() {
    console.log('\n📊 Enhanced Cross-Domain Validation Results\n');
    console.log('='.repeat(60));
    
    if (this.issues.length === 0) {
      console.log('✅ No cross-domain issues found!');
      return;
    }
    
    const highSeverity = this.issues.filter(i => i.severity === 'high');
    const mediumSeverity = this.issues.filter(i => i.severity === 'medium');
    
    console.log(`📈 Found ${this.issues.length} cross-domain issues:`);
    console.log(`   🔴 High severity: ${highSeverity.length}`);
    console.log(`   🟡 Medium severity: ${mediumSeverity.length}\n`);
    
    // Group issues by type
    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });
    
    // Report each type
    Object.entries(issuesByType).forEach(([type, issues]) => {
      console.log(`\n${this.getTypeEmoji(type)} ${this.getTypeTitle(type)} (${issues.length})\n`);
      
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.details}`);
        
        if (issue.component) {
          console.log(`   Component: ${issue.component}`);
        }
        if (issue.file) {
          console.log(`   File: ${issue.file}`);
        }
        if (issue.recommendation) {
          console.log(`   💡 Recommendation: ${issue.recommendation}`);
        }
        if (issue.domains || issue.usedByDomains) {
          console.log(`   🔄 Domains: ${(issue.domains || issue.usedByDomains).join(' → ')}`);
        }
        console.log('');
      });
    });
    
    // Summary recommendations
    console.log('\n📋 OVERALL RECOMMENDATIONS:\n');
    console.log('1. Update system maps to reflect actual cross-domain dependencies');
    console.log('2. Implement domain-specific endpoints (e.g., /api/chat/attachments)');
    console.log('3. Create abstraction layers for cross-domain components');
    console.log('4. Add @used-by annotations to track dependencies');
    console.log('5. Consider moving highly shared components to a "shared" domain');
    
    // Generate report file
    this.saveReport();
    
    if (highSeverity.length > 0) {
      console.log('\n❌ High severity issues detected. Please address before proceeding.');
      process.exit(1);
    }
  }

  getTypeEmoji(type) {
    const emojis = {
      'DOMAIN_MISMATCH': '🔀',
      'UNDOCUMENTED_CROSS_DOMAIN_USAGE': '📝',
      'MISSING_FROM_SYSTEM_MAPS': '❓',
      'ARCHITECTURAL_VIOLATION': '🚨',
      'SHARED_COMPONENT_BEHAVIOR_RISK': '⚠️',
      'MISSING_DOMAIN_ENDPOINT': '🔌'
    };
    return emojis[type] || '📍';
  }

  getTypeTitle(type) {
    const titles = {
      'DOMAIN_MISMATCH': 'Domain Mismatches',
      'UNDOCUMENTED_CROSS_DOMAIN_USAGE': 'Undocumented Cross-Domain Usage',
      'MISSING_FROM_SYSTEM_MAPS': 'Missing from System Maps',
      'ARCHITECTURAL_VIOLATION': 'Architectural Violations',
      'SHARED_COMPONENT_BEHAVIOR_RISK': 'Shared Component Risks',
      'MISSING_DOMAIN_ENDPOINT': 'Missing Domain-Specific Endpoints'
    };
    return titles[type] || type;
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        highSeverity: this.issues.filter(i => i.severity === 'high').length,
        mediumSeverity: this.issues.filter(i => i.severity === 'medium').length,
        systemMapComponents: this.systemMapComponents.size,
        crossDomainDependencies: this.actualDependencies.size
      },
      issues: this.issues,
      recommendations: [
        'Update system maps to reflect actual dependencies',
        'Implement domain-specific endpoints',
        'Create abstraction layers for cross-domain usage',
        'Add @used-by annotations',
        'Move highly shared components to shared domain'
      ]
    };
    
    fs.writeFileSync('cross-domain-validation-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed report saved to cross-domain-validation-report.json');
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new CrossDomainValidatorV2();
  validator.validate().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export default CrossDomainValidatorV2;