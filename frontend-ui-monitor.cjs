#!/usr/bin/env node

/**
 * Frontend UI Component Monitor
 * Detects common UI rendering and prop mismatch issues
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 Frontend UI Component Monitor');
console.log('=====================================\n');

const issues = [];

// Component prop validation patterns
const propPatterns = {
  // Common prop mismatches that cause silent failures
  mismatches: [
    { component: 'CategoryDropdown', wrongProp: 'currentCategoryId', correctProp: 'selectedCategoryId' },
    { component: 'FileUpload', wrongProp: 'onSuccess', correctProp: 'onUploadSuccess' },
    { component: 'Dialog', wrongProp: 'show', correctProp: 'open' },
    { component: 'Modal', wrongProp: 'visible', correctProp: 'isOpen' }
  ],
  
  // Props that should have specific values for proper rendering
  requiredValues: [
    { component: 'CategoryDropdown', prop: 'allowClear', value: 'true', reason: 'enables "No category" option' },
    { component: 'Dialog', prop: 'modal', value: 'true', reason: 'ensures proper overlay behavior' }
  ],
  
  // Common styling issues that break UI
  stylingIssues: [
    { pattern: /position:\s*fixed.*z-index:\s*[1-9]\d{0,2}(?!\d)/, issue: 'z-index too low for modal/dialog', severity: 'high' },
    { pattern: /display:\s*none.*!important/, issue: 'force hidden with !important', severity: 'medium' },
    { pattern: /opacity:\s*0.*pointer-events:\s*none/, issue: 'element invisible and non-interactive', severity: 'medium' }
  ]
};

// Scan TypeScript/JSX files for UI issues
function scanForUIIssues(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanForUIIssues(fullPath);
    } else if (file.match(/\.(tsx?|jsx?)$/)) {
      analyzeFile(fullPath);
    }
  }
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Check for prop mismatches
    checkPropMismatches(filePath, content, lines);
    
    // Check for missing required props
    checkMissingProps(filePath, content, lines);
    
    // Check for styling issues
    checkStylingIssues(filePath, content, lines);
    
    // Check for Dialog/Modal specific issues
    checkDialogIssues(filePath, content, lines);
    
    // Check for component usage without error boundaries
    checkErrorBoundaries(filePath, content, lines);
    
  } catch (error) {
    console.error(`❌ Error analyzing ${filePath}:`, error.message);
  }
}

function checkPropMismatches(filePath, content, lines) {
  propPatterns.mismatches.forEach(({ component, wrongProp, correctProp }) => {
    const regex = new RegExp(`<${component}[^>]*${wrongProp}\\s*=`, 'g');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'PROP_MISMATCH',
        severity: 'high',
        message: `Component ${component} uses '${wrongProp}' but should use '${correctProp}'`,
        suggestion: `Change ${wrongProp} to ${correctProp}`
      });
    }
  });
}

function checkMissingProps(filePath, content, lines) {
  propPatterns.requiredValues.forEach(({ component, prop, value, reason }) => {
    const componentRegex = new RegExp(`<${component}[^>]*>`, 'g');
    let match;
    
    while ((match = componentRegex.exec(content)) !== null) {
      const componentTag = match[0];
      if (!componentTag.includes(`${prop}=${value}`) && !componentTag.includes(`${prop}={${value}}`)) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'MISSING_PROP',
          severity: 'medium',
          message: `Component ${component} missing ${prop}={${value}} - ${reason}`,
          suggestion: `Add ${prop}={${value}} prop`
        });
      }
    }
  });
}

function checkStylingIssues(filePath, content, lines) {
  propPatterns.stylingIssues.forEach(({ pattern, issue, severity }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'STYLING_ISSUE',
        severity,
        message: `Potential styling issue: ${issue}`,
        suggestion: 'Review styling for UI visibility/interaction issues'
      });
    }
  });
}

function checkDialogIssues(filePath, content, lines) {
  // Check for dialogs without proper z-index
  if (content.includes('Dialog') || content.includes('Modal')) {
    lines.forEach((line, index) => {
      if (line.includes('position:') && line.includes('fixed')) {
        const zIndexMatch = line.match(/z-index:\s*(\d+)/);
        if (zIndexMatch) {
          const zIndex = parseInt(zIndexMatch[1]);
          if (zIndex < 1000) {
            issues.push({
              file: filePath,
              line: index + 1,
              type: 'DIALOG_Z_INDEX',
              severity: 'high',
              message: `Dialog/Modal z-index (${zIndex}) may be too low, should be >= 1000`,
              suggestion: 'Increase z-index to ensure dialog appears above other content'
            });
          }
        }
      }
    });
  }
  
  // Check for dialogs using shared components that might be broken
  if (content.includes('@shared/components/ui/dialog')) {
    const fileShort = path.relative(process.cwd(), filePath);
    issues.push({
      file: filePath,
      line: 1,
      type: 'SHARED_DIALOG_USAGE',
      severity: 'medium',
      message: 'Uses @shared/components/ui/dialog which has known rendering issues',
      suggestion: 'Consider using custom HTML modal implementation for critical dialogs'
    });
  }
}

function checkErrorBoundaries(filePath, content, lines) {
  if (content.includes('Modal') || content.includes('Dialog') || content.includes('Dropdown')) {
    if (!content.includes('ErrorBoundary') && !content.includes('try') && !content.includes('catch')) {
      issues.push({
        file: filePath,
        line: 1,
        type: 'NO_ERROR_HANDLING',
        severity: 'low',
        message: 'UI component without error handling - may cause silent failures',
        suggestion: 'Add error boundary or try-catch blocks around critical UI components'
      });
    }
  }
}

// Run the analysis
console.log('📋 Scanning client/src/components for UI issues...\n');
scanForUIIssues('./client/src/components');

// Sort issues by severity
const severityOrder = { high: 0, medium: 1, low: 2 };
issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

// Generate report
console.log('📊 UI Component Analysis Report');
console.log('=====================================\n');

if (issues.length === 0) {
  console.log('✅ No UI component issues detected!\n');
} else {
  const groupedIssues = issues.reduce((acc, issue) => {
    acc[issue.type] = acc[issue.type] || [];
    acc[issue.type].push(issue);
    return acc;
  }, {});
  
  Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
    console.log(`🔍 ${type.replace(/_/g, ' ')} (${typeIssues.length} issues):`);
    typeIssues.forEach(issue => {
      const severity = issue.severity.toUpperCase();
      const fileShort = path.relative(process.cwd(), issue.file);
      console.log(`   [${severity}] ${fileShort}:${issue.line}`);
      console.log(`   └─ ${issue.message}`);
      console.log(`   └─ 💡 ${issue.suggestion}\n`);
    });
  });
}

// Summary and recommendations
console.log('📈 Summary:');
console.log(`   Total issues found: ${issues.length}`);
console.log(`   High severity: ${issues.filter(i => i.severity === 'high').length}`);
console.log(`   Medium severity: ${issues.filter(i => i.severity === 'medium').length}`);
console.log(`   Low severity: ${issues.filter(i => i.severity === 'low').length}\n`);

console.log('🎯 Recommendations:');
console.log('   1. Fix high severity issues immediately (prop mismatches, z-index)');
console.log('   2. Add component prop validation with TypeScript strict mode');
console.log('   3. Create UI component testing guidelines');
console.log('   4. Consider creating a custom dialog/modal component library');
console.log('   5. Run this script regularly during development\n');

console.log('🔧 Integration suggestions:');
console.log('   - Add to package.json: "check:ui": "node frontend-ui-monitor.cjs"');
console.log('   - Add to pre-commit hooks for UI component validation');
console.log('   - Integrate with CI/CD for automated UI issue detection');