#!/usr/bin/env node

/**
 * Cross-Domain System Map Validator
 * 
 * Validates system map consistency across domains to catch issues like:
 * - Shared components with different behaviors
 * - Multiple paths to same endpoints with different processing
 * - Undocumented cross-domain dependencies
 * - Behavioral inconsistencies in similar operations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CrossDomainValidator {
  constructor() {
    this.systemMapsDir = '.system-maps/json-system-maps';
    this.rootMapPath = path.join(this.systemMapsDir, 'root.map.json');
    this.issues = [];
    this.sharedComponents = new Map();
    this.endpointUsage = new Map();
    this.behaviorPatterns = new Map();
    this.crossDomainDeps = new Map();
  }

  async validate() {
    console.log('🔍 Starting cross-domain system map validation...\n');
    
    try {
      const rootMap = this.loadRootMap();
      await this.analyzeAllDomains(rootMap);
      
      this.detectSharedComponentIssues();
      this.detectEndpointCollisions();
      this.detectBehaviorDivergence();
      this.detectUndocumentedDependencies();
      
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

  async analyzeAllDomains(rootMap) {
    for (const [domainName, domainInfo] of Object.entries(rootMap.domains)) {
      console.log(`📁 Analyzing domain: ${domainName}`);
      await this.analyzeDomain(domainName, domainInfo);
    }
  }

  async analyzeDomain(domainName, domainInfo) {
    // Analyze subdomains
    if (domainInfo.subdomains) {
      for (const [subdomainName, subdomainInfo] of Object.entries(domainInfo.subdomains)) {
        const mapPath = path.join(this.systemMapsDir, subdomainInfo.path);
        if (fs.existsSync(mapPath)) {
          const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
          this.analyzeMapForPatterns(domainName, subdomainName, mapData);
        }
      }
    }

    // Analyze features
    if (domainInfo.features) {
      for (const [featureName, featureInfo] of Object.entries(domainInfo.features)) {
        const mapPath = path.join(this.systemMapsDir, featureInfo.path);
        if (fs.existsSync(mapPath)) {
          const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
          this.analyzeMapForPatterns(domainName, featureName, mapData);
        }
      }
    }
  }

  analyzeMapForPatterns(domainName, featureName, mapData) {
    // Track shared components
    this.trackSharedComponents(domainName, featureName, mapData);
    
    // Track endpoint usage
    this.trackEndpointUsage(domainName, featureName, mapData);
    
    // Track behavior patterns
    this.trackBehaviorPatterns(domainName, featureName, mapData);
    
    // Track cross-domain dependencies
    this.trackCrossDomainDependencies(domainName, featureName, mapData);
  }

  trackSharedComponents(domainName, featureName, mapData) {
    const components = this.extractComponents(mapData);
    
    components.forEach(component => {
      if (!this.sharedComponents.has(component)) {
        this.sharedComponents.set(component, []);
      }
      this.sharedComponents.get(component).push({
        domain: domainName,
        feature: featureName,
        mapData: mapData
      });
    });
  }

  trackEndpointUsage(domainName, featureName, mapData) {
    const endpoints = this.extractEndpoints(mapData);
    
    endpoints.forEach(endpoint => {
      if (!this.endpointUsage.has(endpoint)) {
        this.endpointUsage.set(endpoint, []);
      }
      this.endpointUsage.get(endpoint).push({
        domain: domainName,
        feature: featureName,
        mapData: mapData
      });
    });
  }

  trackBehaviorPatterns(domainName, featureName, mapData) {
    const patterns = this.extractBehaviorPatterns(mapData);
    
    patterns.forEach(pattern => {
      const key = pattern.type;
      if (!this.behaviorPatterns.has(key)) {
        this.behaviorPatterns.set(key, []);
      }
      this.behaviorPatterns.get(key).push({
        domain: domainName,
        feature: featureName,
        pattern: pattern,
        mapData: mapData
      });
    });
  }

  trackCrossDomainDependencies(domainName, featureName, mapData) {
    const deps = this.extractCrossDomainDependencies(mapData);
    
    deps.forEach(dep => {
      const key = `${domainName}->${dep}`;
      if (!this.crossDomainDeps.has(key)) {
        this.crossDomainDeps.set(key, []);
      }
      this.crossDomainDeps.get(key).push({
        source: domainName,
        target: dep,
        feature: featureName
      });
    });
  }

  extractComponents(mapData) {
    const components = [];
    
    // Extract from various map structures
    if (mapData.files?.ui) {
      components.push(...mapData.files.ui);
    }
    
    if (mapData.architecturalLayers?.presentation?.components) {
      const compData = mapData.architecturalLayers.presentation.components;
      if (compData.primary) components.push(...compData.primary);
      if (compData.supporting) components.push(...compData.supporting);
      if (compData.shared) components.push(...compData.shared);
    }
    
    if (mapData.components) {
      components.push(...Object.keys(mapData.components));
    }

    // Extract component file paths
    if (typeof mapData === 'object') {
      this.findComponentPaths(mapData, components);
    }
    
    return [...new Set(components)]; // Remove duplicates
  }

  findComponentPaths(obj, components, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.includes('components/')) {
        components.push(value);
      } else if (typeof value === 'object' && value !== null) {
        this.findComponentPaths(value, components, `${prefix}${key}.`);
      }
    }
  }

  extractEndpoints(mapData) {
    const endpoints = [];
    
    // Extract from dataFlow
    if (mapData.dataFlow?.request && typeof mapData.dataFlow.request === 'string') {
      const match = mapData.dataFlow.request.match(/→\s*([^→]+\s*\/api\/[^→\s]+)/);
      if (match) endpoints.push(match[1].trim());
    }

    // Extract from apiEndpoints
    if (mapData.apiEndpoints) {
      endpoints.push(...Object.keys(mapData.apiEndpoints));
    }

    // Extract from dataFlowTrace
    if (mapData.dataFlowTrace?.frontendFlow?.apiCalls?.endpoint) {
      endpoints.push(mapData.dataFlowTrace.frontendFlow.apiCalls.endpoint);
    }

    return [...new Set(endpoints)];
  }

  extractBehaviorPatterns(mapData) {
    const patterns = [];
    
    // File processing patterns
    if (mapData.dataFlow?.sideEffects) {
      mapData.dataFlow.sideEffects.forEach(effect => {
        if (effect.includes('compression') || effect.includes('compress')) {
          patterns.push({
            type: 'file-compression',
            details: effect,
            compression: this.extractCompressionBehavior(mapData)
          });
        }
        if (effect.includes('thumbnail') || effect.includes('miniature')) {
          patterns.push({
            type: 'thumbnail-generation',
            details: effect,
            thumbnailBehavior: this.extractThumbnailBehavior(mapData)
          });
        }
      });
    }

    // Upload patterns
    if (mapData.trigger && mapData.trigger.includes('upload')) {
      patterns.push({
        type: 'file-upload',
        trigger: mapData.trigger,
        compressionBehavior: this.extractCompressionBehavior(mapData),
        uploadFlow: this.extractUploadFlow(mapData)
      });
    }

    return patterns;
  }

  extractCompressionBehavior(mapData) {
    const compressionInfo = {
      hasCompression: false,
      skipMediaFiles: false,
      smartCompression: false,
      details: []
    };

    const searchForCompression = (obj, path = '') => {
      if (typeof obj === 'string') {
        if (obj.includes('compression') || obj.includes('compress')) {
          compressionInfo.hasCompression = true;
          compressionInfo.details.push(`${path}: ${obj}`);
          
          if (obj.includes('skip') && (obj.includes('media') || obj.includes('image'))) {
            compressionInfo.skipMediaFiles = true;
          }
          
          if (obj.includes('smart')) {
            compressionInfo.smartCompression = true;
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          searchForCompression(value, path ? `${path}.${key}` : key);
        }
      }
    };

    searchForCompression(mapData);
    return compressionInfo;
  }

  extractThumbnailBehavior(mapData) {
    // Extract thumbnail-related behavior information
    const thumbnailInfo = {
      hasThumbnails: false,
      iconSizing: false,
      responsiveDesign: false,
      details: []
    };

    const searchForThumbnails = (obj, path = '') => {
      if (typeof obj === 'string') {
        if (obj.includes('thumbnail') || obj.includes('miniature') || obj.includes('icon')) {
          thumbnailInfo.hasThumbnails = true;
          thumbnailInfo.details.push(`${path}: ${obj}`);
          
          if (obj.includes('size') || obj.includes('sizing')) {
            thumbnailInfo.iconSizing = true;
          }
          
          if (obj.includes('responsive') || obj.includes('sm:')) {
            thumbnailInfo.responsiveDesign = true;
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          searchForThumbnails(value, path ? `${path}.${key}` : key);
        }
      }
    };

    searchForThumbnails(mapData);
    return thumbnailInfo;
  }

  extractUploadFlow(mapData) {
    // Extract upload flow information
    const flow = {
      endpoints: [],
      components: [],
      compression: false,
      thumbnails: false
    };

    if (mapData.dataFlow?.request) {
      flow.endpoints.push(mapData.dataFlow.request);
    }

    if (mapData.files?.ui) {
      flow.components.push(...mapData.files.ui);
    }

    const compressionBehavior = this.extractCompressionBehavior(mapData);
    flow.compression = compressionBehavior.hasCompression;

    const thumbnailBehavior = this.extractThumbnailBehavior(mapData);
    flow.thumbnails = thumbnailBehavior.hasThumbnails;

    return flow;
  }

  extractCrossDomainDependencies(mapData) {
    const deps = [];
    
    if (mapData.dependencies?.internal) {
      deps.push(...mapData.dependencies.internal);
    }
    
    if (mapData.dependencies?.['cross-domain']) {
      deps.push(...mapData.dependencies['cross-domain']);
    }

    return deps;
  }

  detectSharedComponentIssues() {
    console.log('\n🔄 Checking shared component consistency...');
    
    for (const [component, usages] of this.sharedComponents.entries()) {
      if (usages.length > 1) {
        // Check for behavioral differences in shared components
        const behaviors = usages.map(usage => ({
          domain: usage.domain,
          feature: usage.feature,
          compression: this.extractCompressionBehavior(usage.mapData),
          thumbnails: this.extractThumbnailBehavior(usage.mapData)
        }));

        const compressionBehaviors = behaviors.map(b => b.compression.hasCompression);
        const thumbnailBehaviors = behaviors.map(b => b.thumbnails.hasThumbnails);

        if (new Set(compressionBehaviors).size > 1) {
          this.issues.push({
            type: 'SHARED_COMPONENT_COMPRESSION_INCONSISTENCY',
            component: component,
            details: `Component ${component} has inconsistent compression behavior across domains`,
            usages: behaviors,
            severity: 'high'
          });
        }

        if (new Set(thumbnailBehaviors).size > 1) {
          this.issues.push({
            type: 'SHARED_COMPONENT_THUMBNAIL_INCONSISTENCY',
            component: component,
            details: `Component ${component} has inconsistent thumbnail behavior across domains`,
            usages: behaviors,
            severity: 'medium'
          });
        }
      }
    }
  }

  detectEndpointCollisions() {
    console.log('🚨 Checking endpoint collision patterns...');
    
    for (const [endpoint, usages] of this.endpointUsage.entries()) {
      if (usages.length > 1) {
        // Check if multiple domains use the same endpoint with different processing
        const processPatterns = usages.map(usage => ({
          domain: usage.domain,
          feature: usage.feature,
          compression: this.extractCompressionBehavior(usage.mapData)
        }));

        const compressionDifferences = processPatterns.filter(p => p.compression.hasCompression).length;
        const totalUsages = processPatterns.length;

        if (compressionDifferences > 0 && compressionDifferences < totalUsages) {
          this.issues.push({
            type: 'ENDPOINT_PROCESSING_INCONSISTENCY',
            endpoint: endpoint,
            details: `Endpoint ${endpoint} has inconsistent processing (some compress, some don't)`,
            usages: processPatterns,
            severity: 'high'
          });
        }
      }
    }
  }

  detectBehaviorDivergence() {
    console.log('⚡ Checking behavior pattern divergence...');
    
    // Group similar operations and check for inconsistencies
    const uploadPatterns = this.behaviorPatterns.get('file-upload') || [];
    
    if (uploadPatterns.length > 1) {
      const compressionBehaviors = uploadPatterns.map(p => p.pattern.compressionBehavior);
      
      // Check if some uploads compress and others don't
      const hasCompressionCount = compressionBehaviors.filter(c => c.hasCompression).length;
      const skipMediaCount = compressionBehaviors.filter(c => c.skipMediaFiles).length;
      
      if (hasCompressionCount > 0 && hasCompressionCount < uploadPatterns.length) {
        this.issues.push({
          type: 'UPLOAD_COMPRESSION_DIVERGENCE',
          details: 'File upload operations have inconsistent compression behavior',
          patterns: uploadPatterns.map(p => ({
            domain: p.domain,
            feature: p.feature,
            hasCompression: p.pattern.compressionBehavior.hasCompression,
            skipMedia: p.pattern.compressionBehavior.skipMediaFiles
          })),
          severity: 'high',
          suggestion: 'Document why different upload paths have different compression behavior'
        });
      }
    }
  }

  detectUndocumentedDependencies() {
    console.log('🔗 Checking undocumented cross-domain dependencies...');
    
    // This would require more complex analysis of actual file imports
    // For now, flag potential issues based on shared components
    for (const [component, usages] of this.sharedComponents.entries()) {
      if (usages.length > 1) {
        const domains = [...new Set(usages.map(u => u.domain))];
        
        if (domains.length > 1) {
          // Check if cross-domain dependency is documented
          let isDependencyDocumented = false;
          
          for (const usage of usages) {
            const deps = this.extractCrossDomainDependencies(usage.mapData);
            const otherDomains = domains.filter(d => d !== usage.domain);
            
            if (otherDomains.some(d => deps.includes(d))) {
              isDependencyDocumented = true;
              break;
            }
          }
          
          if (!isDependencyDocumented) {
            this.issues.push({
              type: 'UNDOCUMENTED_CROSS_DOMAIN_DEPENDENCY',
              component: component,
              domains: domains,
              details: `Component ${component} is shared across domains ${domains.join(', ')} but cross-domain dependency is not documented`,
              severity: 'medium',
              suggestion: 'Add cross-domain dependencies to system maps'
            });
          }
        }
      }
    }
  }

  reportFindings() {
    console.log('\n📊 Cross-Domain Validation Results\n');
    console.log('='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('✅ No cross-domain consistency issues found!');
      return;
    }

    const highSeverity = this.issues.filter(i => i.severity === 'high');
    const mediumSeverity = this.issues.filter(i => i.severity === 'medium');
    const lowSeverity = this.issues.filter(i => i.severity === 'low');

    console.log(`📈 Found ${this.issues.length} potential issues:`);
    console.log(`   🔴 High severity: ${highSeverity.length}`);
    console.log(`   🟡 Medium severity: ${mediumSeverity.length}`);
    console.log(`   🟢 Low severity: ${lowSeverity.length}\n`);

    // Report high severity issues first
    if (highSeverity.length > 0) {
      console.log('🔴 HIGH SEVERITY ISSUES:\n');
      highSeverity.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}`);
        console.log(`   ${issue.details}`);
        if (issue.suggestion) {
          console.log(`   💡 Suggestion: ${issue.suggestion}`);
        }
        if (issue.usages) {
          console.log(`   📍 Affected domains: ${issue.usages.map(u => `${u.domain}/${u.feature}`).join(', ')}`);
        }
        console.log('');
      });
    }

    // Report medium severity issues
    if (mediumSeverity.length > 0) {
      console.log('🟡 MEDIUM SEVERITY ISSUES:\n');
      mediumSeverity.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}`);
        console.log(`   ${issue.details}`);
        if (issue.suggestion) {
          console.log(`   💡 Suggestion: ${issue.suggestion}`);
        }
        console.log('');
      });
    }

    console.log('\n📋 RECOMMENDATIONS:\n');
    console.log('1. Review and document behavioral differences between similar operations');
    console.log('2. Add cross-domain dependency mappings to system maps');
    console.log('3. Consider creating shared behavior documentation for components used across domains');
    console.log('4. Implement automated checks for cross-domain consistency in CI/CD');
    
    // Exit with error code if high severity issues found
    if (highSeverity.length > 0) {
      console.log('\n❌ High severity issues detected. Please address before proceeding.');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new CrossDomainValidator();
  validator.validate().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export default CrossDomainValidator;