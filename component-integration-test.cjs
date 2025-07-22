#!/usr/bin/env node

/**
 * Component Integration Test Generator
 * Generates user interaction tests for UI components
 * Tests actual user flows and component behavior
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 Component Integration Test Generator');
console.log('=========================================\n');

const testSuggestions = [];
const componentFlows = {};

// User flow patterns to detect
const userFlowPatterns = {
  // File upload flows
  fileUpload: {
    triggers: ['FileUpload', 'Upload', 'file-upload', 'uploadFile'],
    steps: [
      'User clicks upload button',
      'Upload dialog opens',
      'User selects file',
      'User optionally selects category', 
      'User clicks upload',
      'Loading state shows',
      'Success/error feedback displays',
      'Dialog closes on success'
    ],
    criticalPath: true
  },

  // Modal/Dialog flows  
  modal: {
    triggers: ['Dialog', 'Modal', 'isOpen', 'onClose'],
    steps: [
      'User triggers modal open',
      'Modal appears with overlay',
      'Modal content is visible and accessible',
      'User can interact with modal content',
      'User can close modal (X button, overlay click, escape)',
      'Modal closes and overlay disappears'
    ],
    criticalPath: true
  },

  // Form submission flows
  formSubmission: {
    triggers: ['onSubmit', 'handleSubmit', 'Form', 'Button.*submit'],
    steps: [
      'User fills required fields',
      'Form validates input',
      'User submits form',
      'Loading state appears',
      'Success/error handling',
      'Form resets or redirects'
    ],
    criticalPath: true
  },

  // Authentication flows
  authentication: {
    triggers: ['Login', 'Register', 'Auth', 'signin', 'signup'],
    steps: [
      'User enters credentials',
      'Form validation occurs',
      'User submits form',
      'Authentication request sent',
      'Success redirects to dashboard',
      'Error shows helpful message'
    ],
    criticalPath: true
  },

  // Delete/Remove operations
  deleteOperation: {
    triggers: ['Delete', 'Remove', 'onDelete', 'handleDelete'],
    steps: [
      'User clicks delete button',
      'Confirmation dialog appears',
      'User confirms deletion',
      'Loading/processing state',
      'Item removed from UI',
      'Success feedback shown'
    ],
    criticalPath: true
  },

  // Dropdown/Select interactions
  dropdown: {
    triggers: ['Dropdown', 'Select', 'CategoryDropdown', 'onChange'],
    steps: [
      'User clicks dropdown trigger',
      'Dropdown menu opens',
      'Options are visible and selectable',
      'User selects option',
      'Dropdown closes',
      'Selected value updates'
    ],
    criticalPath: false
  }
};

// Test code templates
const testTemplates = {
  modal: `
describe('Modal Component Integration', () => {
  it('should open and display modal content correctly', async () => {
    // Arrange
    render(<ComponentWithModal />);
    
    // Act - Open modal
    const openButton = screen.getByRole('button', { name: /open/i });
    fireEvent.click(openButton);
    
    // Assert - Modal is visible
    const modal = await screen.findByRole('dialog');
    expect(modal).toBeVisible();
    
    // Assert - Content is accessible
    const modalContent = screen.getByTestId('modal-content');
    expect(modalContent).toBeInTheDocument();
  });

  it('should close modal when clicking overlay', async () => {
    // Arrange
    render(<ComponentWithModal />);
    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    
    // Act - Click overlay
    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);
    
    // Assert - Modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should close modal with Escape key', async () => {
    // Arrange
    render(<ComponentWithModal />);
    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    
    // Act - Press Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    // Assert - Modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});`,

  fileUpload: `
describe('File Upload Integration', () => {
  it('should complete full upload flow successfully', async () => {
    // Arrange
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const onUploadSuccess = jest.fn();
    render(<FileUploadComponent onUploadSuccess={onUploadSuccess} />);
    
    // Act - Open upload dialog
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    
    // Act - Select file
    const fileInput = screen.getByLabelText(/select file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    
    // Assert - File is displayed
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    
    // Act - Upload file
    fireEvent.click(screen.getByRole('button', { name: /upload file/i }));
    
    // Assert - Loading state
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    
    // Assert - Success callback
    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalled();
    });
  });

  it('should handle upload errors gracefully', async () => {
    // Mock API error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Test error handling flow
    // ... similar structure for error cases
  });
});`,

  dropdown: `
describe('Dropdown Component Integration', () => {
  it('should open dropdown and select option', async () => {
    // Arrange
    const onChange = jest.fn();
    render(<DropdownComponent onChange={onChange} />);
    
    // Act - Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /select/i }));
    
    // Assert - Options are visible
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    
    // Act - Select option
    fireEvent.click(options[0]);
    
    // Assert - Callback called
    expect(onChange).toHaveBeenCalledWith(expect.any(String));
    
    // Assert - Dropdown closed
    await waitFor(() => {
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });
  });
});`
};

function scanForUserFlows(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanForUserFlows(fullPath);
    } else if (file.match(/\.(tsx?|jsx?)$/)) {
      analyzeComponentFlows(fullPath);
    }
  }
}

function analyzeComponentFlows(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));
    
    // Detect user flows in this component
    const detectedFlows = [];
    
    Object.entries(userFlowPatterns).forEach(([flowName, pattern]) => {
      const hasFlow = pattern.triggers.some(trigger => {
        const regex = new RegExp(trigger, 'i');
        return regex.test(content) || regex.test(fileName);
      });
      
      if (hasFlow) {
        detectedFlows.push({
          flow: flowName,
          pattern: pattern,
          component: fileName
        });
      }
    });
    
    if (detectedFlows.length > 0) {
      componentFlows[filePath] = detectedFlows;
      generateTestSuggestions(filePath, content, detectedFlows);
    }
    
    // Check for missing test data attributes
    checkTestDataAttributes(filePath, content, detectedFlows);
    
  } catch (error) {
    console.error(`❌ Error analyzing ${filePath}:`, error.message);
  }
}

function generateTestSuggestions(filePath, content, flows) {
  const fileShort = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  
  flows.forEach(({ flow, pattern, component }) => {
    const priority = pattern.criticalPath ? 'critical' : 'high';
    
    testSuggestions.push({
      file: filePath,
      component: fileName,
      flow: flow,
      priority: priority,
      type: 'INTEGRATION_TEST_NEEDED',
      message: `Missing integration tests for ${flow} flow in ${component}`,
      steps: pattern.steps,
      template: testTemplates[flow] || testTemplates.modal,
      suggestions: [
        `Create ${fileName}.test.tsx`,
        `Add test data attributes (data-testid)`,
        `Mock external dependencies (APIs, file system)`,
        `Test both success and error scenarios`,
        `Verify loading states and user feedback`
      ]
    });
  });
}

function checkTestDataAttributes(filePath, content, flows) {
  if (flows.length === 0) return;
  
  const hasTestIds = content.includes('data-testid') || content.includes('testId');
  const hasCriticalFlows = flows.some(f => f.pattern.criticalPath);
  
  if (!hasTestIds && hasCriticalFlows) {
    testSuggestions.push({
      file: filePath,
      component: path.basename(filePath, path.extname(filePath)),
      flow: 'testing',
      priority: 'high',
      type: 'MISSING_TEST_ATTRIBUTES',
      message: 'Component lacks test data attributes for automated testing',
      suggestions: [
        'Add data-testid to interactive elements',
        'Add data-testid to modal/dialog containers',
        'Add data-testid to buttons and form inputs',
        'Use consistent naming convention (kebab-case)',
        'Document test IDs for QA team'
      ]
    });
  }
}

function generateTestFiles() {
  const testFileSuggestions = [];
  
  // Group suggestions by component
  const byComponent = testSuggestions.reduce((acc, suggestion) => {
    acc[suggestion.component] = acc[suggestion.component] || [];
    acc[suggestion.component].push(suggestion);
    return acc;
  }, {});
  
  Object.entries(byComponent).forEach(([component, suggestions]) => {
    const integrationTests = suggestions.filter(s => s.type === 'INTEGRATION_TEST_NEEDED');
    
    if (integrationTests.length > 0) {
      const testFileName = `${component}.integration.test.tsx`;
      const testFilePath = `client/src/tests/integration/${testFileName}`;
      
      testFileSuggestions.push({
        filePath: testFilePath,
        component: component,
        tests: integrationTests,
        template: generateTestFileContent(component, integrationTests)
      });
    }
  });
  
  return testFileSuggestions;
}

function generateTestFileContent(component, tests) {
  const imports = `
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ${component} } from '@/components/${component}';

// Mock external dependencies
jest.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    uploadFile: jest.fn().mockResolvedValue(true),
    isUploading: false,
    error: null
  })
}));`;

  const testCases = tests.map(test => {
    return `
describe('${test.flow} Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  ${test.template}
  
  // TODO: Add specific test cases for:
  ${test.steps.map(step => `  // - ${step}`).join('\n')}
});`;
  }).join('\n');

  return imports + testCases;
}

// Run the analysis
console.log('📋 Scanning for user interaction flows...\n');
scanForUserFlows('./client/src/components');

// Generate test file suggestions
const testFiles = generateTestFiles();

// Sort suggestions by priority
const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
testSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

// Generate report
console.log('📊 Component Integration Test Report');
console.log('====================================\n');

if (testSuggestions.length === 0) {
  console.log('✅ All components have adequate integration test coverage!\n');
} else {
  const groupedSuggestions = testSuggestions.reduce((acc, suggestion) => {
    acc[suggestion.type] = acc[suggestion.type] || [];
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {});
  
  Object.entries(groupedSuggestions).forEach(([type, typeSuggestions]) => {
    console.log(`🔍 ${type.replace(/_/g, ' ')} (${typeSuggestions.length} components):`);
    typeSuggestions.forEach(suggestion => {
      const priority = suggestion.priority.toUpperCase();
      console.log(`   [${priority}] ${suggestion.component} - ${suggestion.flow} flow`);
      console.log(`   └─ ${suggestion.message}`);
      
      if (suggestion.suggestions) {
        suggestion.suggestions.forEach(sug => {
          console.log(`   └─ 💡 ${sug}`);
        });
      }
      
      if (suggestion.steps) {
        console.log(`   └─ 📋 Flow steps:`);
        suggestion.steps.forEach(step => {
          console.log(`      • ${step}`);
        });
      }
      console.log('');
    });
  });
}

// Display test file generation suggestions
if (testFiles.length > 0) {
  console.log('📁 Suggested Test Files to Create');
  console.log('==================================\n');
  
  testFiles.forEach(testFile => {
    console.log(`📄 ${testFile.filePath}`);
    console.log(`   Component: ${testFile.component}`);
    console.log(`   Test flows: ${testFile.tests.map(t => t.flow).join(', ')}`);
    console.log(`   Priority: ${testFile.tests[0].priority.toUpperCase()}`);
    console.log('');
  });
}

// Summary
console.log('📈 Summary:');
console.log(`   Components analyzed: ${Object.keys(componentFlows).length}`);
console.log(`   User flows detected: ${testSuggestions.filter(s => s.type === 'INTEGRATION_TEST_NEEDED').length}`);
console.log(`   Missing test attributes: ${testSuggestions.filter(s => s.type === 'MISSING_TEST_ATTRIBUTES').length}`);
console.log(`   Critical priority: ${testSuggestions.filter(s => s.priority === 'critical').length}`);
console.log(`   High priority: ${testSuggestions.filter(s => s.priority === 'high').length}\n`);

console.log('🎯 Integration Test Recommendations:');
console.log('   1. ⚠️  Create CRITICAL flow tests immediately (file upload, auth, payments)');
console.log('   2. 🔥 Add HIGH priority tests before next deployment');
console.log('   3. 📱 Test all flows on mobile devices and different screen sizes');
console.log('   4. 🎭 Add data-testid attributes to enable automated testing');
console.log('   5. 🔄 Mock external dependencies (APIs, file system, network)');
console.log('   6. 📊 Test both success and error scenarios for each flow');
console.log('   7. ⏱️  Verify loading states and user feedback timing\n');

console.log('🔧 Implementation suggestions:');
console.log('   - Add to package.json: "test:integration": "jest --testPathPattern=integration"');
console.log('   - Create client/src/tests/integration/ directory');
console.log('   - Use React Testing Library + Jest for component testing');
console.log('   - Add Playwright for end-to-end user flow testing');
console.log('   - Integrate with CI/CD pipeline for automated testing');