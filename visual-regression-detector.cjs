#!/usr/bin/env node

/**
 * Visual Regression Detector
 * Tests component rendering and visual layout issues
 * Detects modal visibility, z-index problems, and broken UI elements
 */

const fs = require('fs');
const path = require('path');

console.log('👀 Visual Regression Detector');
console.log('=====================================\n');

const issues = [];

// Visual testing patterns
const visualPatterns = {
  // Modal/Dialog visibility issues
  modalIssues: [
    {
      pattern: /opacity:\s*0/g,
      context: ['modal', 'dialog', 'overlay'],
      issue: 'Component may be invisible (opacity: 0)',
      severity: 'high',
      test: 'Check if element is actually visible to users'
    },
    {
      pattern: /display:\s*none/g,
      context: ['modal', 'dialog'],
      issue: 'Component hidden with display: none',
      severity: 'critical',
      test: 'Verify component shows when expected'
    },
    {
      pattern: /z-index:\s*([0-9]+)/g,
      context: ['modal', 'dialog', 'overlay'],
      issue: 'Z-index may cause layering issues',
      severity: 'high',
      test: 'Check if modal appears above other content',
      validate: (match) => {
        const zIndex = parseInt(match[1]);
        return zIndex < 1000 ? `Z-index ${zIndex} too low for modal (should be >= 1000)` : null;
      }
    }
  ],

  // Layout and positioning issues
  layoutIssues: [
    {
      pattern: /position:\s*fixed.*(?!.*z-index)/g,
      issue: 'Fixed position without z-index may cause layering issues',
      severity: 'medium',
      test: 'Ensure fixed elements have proper z-index'
    },
    {
      pattern: /transform:\s*translate\(-?50%,\s*-?50%\)/g,
      context: ['modal', 'dialog', 'centered'],
      issue: 'Centering transform without proper container',
      severity: 'medium',
      test: 'Verify modal is actually centered on all screen sizes'
    },
    {
      pattern: /width:\s*100[vw%]/g,
      context: ['modal', 'dialog'],
      issue: 'Full-width modal may not be intended',
      severity: 'low',
      test: 'Check if modal should be full-width or contained'
    }
  ],

  // Interactive element issues
  interactionIssues: [
    {
      pattern: /pointer-events:\s*none/g,
      issue: 'Element not clickable (pointer-events: none)',
      severity: 'high',
      test: 'Verify intended clickable elements work'
    },
    {
      pattern: /cursor:\s*not-allowed/g,
      context: ['button', 'disabled'],
      issue: 'Disabled state may prevent interaction',
      severity: 'medium',
      test: 'Check if disabled state is intentional'
    }
  ],

  // Mobile responsiveness issues
  mobileIssues: [
    {
      pattern: /min-width:\s*[0-9]+px/g,
      context: ['modal', 'dialog'],
      issue: 'Fixed min-width may break mobile layout',
      severity: 'high',
      test: 'Test modal on mobile screen sizes'
    },
    {
      pattern: /font-size:\s*[0-9]+px/g,
      issue: 'Fixed font sizes may not be mobile-friendly',
      severity: 'low',
      test: 'Consider using rem or responsive font sizes'
    }
  ]
};

// Component-specific tests
const componentTests = {
  Dialog: {
    requiredElements: ['overlay', 'content', 'close'],
    commonIssues: [
      'Content not visible due to CSS conflicts',
      'Overlay not blocking background interaction',
      'Close button not accessible',
      'Modal not centered properly'
    ]
  },
  Modal: {
    requiredElements: ['backdrop', 'container', 'content'],
    commonIssues: [
      'Z-index conflicts with other modals',
      'Backdrop click not closing modal',
      'Content overflow on small screens'
    ]
  },
  Dropdown: {
    requiredElements: ['trigger', 'menu', 'items'],
    commonIssues: [
      'Menu positioning incorrect',
      'Items not selectable',
      'Menu not closing on outside click'
    ]
  }
};

function scanForVisualIssues(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanForVisualIssues(fullPath);
    } else if (file.match(/\.(tsx?|jsx?|css|scss)$/)) {
      analyzeFileForVisualIssues(fullPath);
    }
  }
}

function analyzeFileForVisualIssues(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Check all visual pattern categories
    Object.entries(visualPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        checkVisualPattern(filePath, content, lines, pattern, category);
      });
    });
    
    // Component-specific analysis
    checkComponentSpecificIssues(filePath, content, lines);
    
    // Generate rendering test suggestions
    generateRenderingTests(filePath, content);
    
  } catch (error) {
    console.error(`❌ Error analyzing ${filePath}:`, error.message);
  }
}

function checkVisualPattern(filePath, content, lines, pattern, category) {
  let match;
  const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
  
  while ((match = regex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const line = lines[lineNum - 1];
    
    // Check if pattern is in relevant context
    let contextMatch = true;
    if (pattern.context) {
      contextMatch = pattern.context.some(ctx => 
        line.toLowerCase().includes(ctx) ||
        content.toLowerCase().includes(ctx + 'dialog') ||
        content.toLowerCase().includes(ctx + 'modal') ||
        filePath.toLowerCase().includes(ctx)
      );
    }
    
    if (contextMatch) {
      let issue = pattern.issue;
      let severity = pattern.severity;
      
      // Apply custom validation if provided
      if (pattern.validate) {
        const validationResult = pattern.validate(match);
        if (validationResult) {
          issue = validationResult;
        } else {
          continue; // Skip if validation passes
        }
      }
      
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'VISUAL_REGRESSION',
        category: category.toUpperCase(),
        severity,
        message: issue,
        suggestion: pattern.test,
        context: line.trim()
      });
    }
  }
}

function checkComponentSpecificIssues(filePath, content, lines) {
  Object.entries(componentTests).forEach(([component, tests]) => {
    if (content.includes(component)) {
      // Check for missing required elements
      const missingElements = tests.requiredElements.filter(element => 
        !content.toLowerCase().includes(element)
      );
      
      if (missingElements.length > 0) {
        issues.push({
          file: filePath,
          line: 1,
          type: 'COMPONENT_STRUCTURE',
          category: 'MISSING_ELEMENTS',
          severity: 'high',
          message: `${component} missing required elements: ${missingElements.join(', ')}`,
          suggestion: `Add missing elements for complete ${component} functionality`
        });
      }
      
      // Add common issue warnings
      tests.commonIssues.forEach(issue => {
        issues.push({
          file: filePath,
          line: 1,
          type: 'COMPONENT_WARNING',
          category: 'COMMON_ISSUES',
          severity: 'low',
          message: `${component}: ${issue}`,
          suggestion: `Test ${component} for: ${issue}`
        });
      });
    }
  });
}

function generateRenderingTests(filePath, content) {
  const fileShort = path.relative(process.cwd(), filePath);
  
  // Generate test suggestions based on components found
  const testSuggestions = [];
  
  if (content.includes('Dialog') || content.includes('Modal')) {
    testSuggestions.push({
      type: 'MODAL_VISIBILITY_TEST',
      priority: 'high',
      test: `
// Test: Modal content visibility
await page.click('[data-testid="open-modal-button"]');
await page.waitForSelector('[data-testid="modal-content"]', { visible: true });
const modal = await page.$('[data-testid="modal-content"]');
const isVisible = await modal.isVisible();
expect(isVisible).toBe(true);`
    });
    
    testSuggestions.push({
      type: 'MODAL_OVERLAY_TEST', 
      priority: 'high',
      test: `
// Test: Modal overlay blocks background
await page.click('[data-testid="open-modal-button"]');
await page.click('[data-testid="modal-overlay"]'); 
// Modal should close or prevent background interaction`
    });
  }
  
  if (content.includes('Upload')) {
    testSuggestions.push({
      type: 'UPLOAD_DIALOG_TEST',
      priority: 'critical',
      test: `
// Test: Upload dialog renders completely
await page.click('[data-testid="upload-button"]');
await page.waitForSelector('[data-testid="upload-dialog"]');
const dialog = await page.$('[data-testid="upload-dialog"]');
const boundingBox = await dialog.boundingBox();
expect(boundingBox.width).toBeGreaterThan(0);
expect(boundingBox.height).toBeGreaterThan(0);`
    });
  }
  
  if (testSuggestions.length > 0) {
    issues.push({
      file: filePath,
      line: 1,
      type: 'RENDERING_TEST_NEEDED',
      category: 'TEST_GENERATION',
      severity: 'medium',
      message: `Generate rendering tests for this component`,
      suggestion: `Add these test cases: ${testSuggestions.map(t => t.type).join(', ')}`,
      tests: testSuggestions
    });
  }
}

// Run the analysis
console.log('📋 Scanning for visual regression issues...\n');
scanForVisualIssues('./client/src/components');

// Sort issues by severity
const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

// Generate report
console.log('📊 Visual Regression Analysis Report');
console.log('=====================================\n');

if (issues.length === 0) {
  console.log('✅ No visual regression issues detected!\n');
} else {
  const groupedIssues = issues.reduce((acc, issue) => {
    const key = `${issue.type}_${issue.category}`;
    acc[key] = acc[key] || [];
    acc[key].push(issue);
    return acc;
  }, {});
  
  Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
    console.log(`🔍 ${type.replace(/_/g, ' ')} (${typeIssues.length} issues):`);
    typeIssues.forEach(issue => {
      const severity = issue.severity.toUpperCase();
      const fileShort = path.relative(process.cwd(), issue.file);
      console.log(`   [${severity}] ${fileShort}:${issue.line}`);
      console.log(`   └─ ${issue.message}`);
      console.log(`   └─ 💡 ${issue.suggestion}`);
      if (issue.context) {
        console.log(`   └─ 📄 Context: ${issue.context}`);
      }
      console.log('');
    });
  });
}

// Generate testing suggestions
const testNeededIssues = issues.filter(i => i.type === 'RENDERING_TEST_NEEDED');
if (testNeededIssues.length > 0) {
  console.log('🧪 Generated Test Cases');
  console.log('=====================================\n');
  
  testNeededIssues.forEach(issue => {
    const fileShort = path.relative(process.cwd(), issue.file);
    console.log(`📁 ${fileShort}:`);
    
    issue.tests?.forEach(test => {
      console.log(`   ${test.type} (Priority: ${test.priority.toUpperCase()})`);
      console.log(`   ${test.test}`);
      console.log('');
    });
  });
}

// Summary
console.log('📈 Summary:');
console.log(`   Total visual issues found: ${issues.length}`);
console.log(`   Critical severity: ${issues.filter(i => i.severity === 'critical').length}`);
console.log(`   High severity: ${issues.filter(i => i.severity === 'high').length}`);
console.log(`   Medium severity: ${issues.filter(i => i.severity === 'medium').length}`);
console.log(`   Low severity: ${issues.filter(i => i.severity === 'low').length}\n`);

console.log('🎯 Recommendations:');
console.log('   1. ⚠️  Fix CRITICAL visual issues immediately (component not rendering)');
console.log('   2. 🔥 Test HIGH severity issues manually in browser');
console.log('   3. 📸 Consider implementing visual regression testing with Playwright/Puppeteer');
console.log('   4. 📱 Test all modals/dialogs on mobile devices');
console.log('   5. 🎨 Add data-testid attributes for automated testing');
console.log('   6. 🔄 Run this script after CSS changes\n');

console.log('🔧 Integration suggestions:');
console.log('   - Add to package.json: "check:visual": "node visual-regression-detector.js"');
console.log('   - Integrate with CI/CD pipeline for PR checks');
console.log('   - Combine with Playwright for automated visual testing');