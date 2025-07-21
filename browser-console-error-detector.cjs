#!/usr/bin/env node

/**
 * Browser Console Error Detection Script
 * Detects runtime errors that only appear in browser console
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 Browser Console Error Detection Script');
console.log('=========================================');

// 1. Check for common runtime error patterns in code
console.log('\n📋 Step 1: Scanning for runtime error patterns...');

const RUNTIME_ERROR_PATTERNS = [
  // React common errors
  { pattern: /\.map\(.*\).*undefined/, description: 'Array.map on undefined (common React error)' },
  { pattern: /Cannot read propert(y|ies) of undefined/, description: 'Reading property of undefined object' },
  { pattern: /Cannot read propert(y|ies) of null/, description: 'Reading property of null object' },
  { pattern: /is not a function/, description: 'Calling undefined as function' },
  
  // Context/Hook errors
  { pattern: /useContext.*undefined/, description: 'useContext used outside provider' },
  { pattern: /hook.*can.*only.*be.*called/, description: 'Hook called outside component' },
  
  // Import/Module errors
  { pattern: /import.*from.*undefined/, description: 'Import from undefined module' },
  { pattern: /Module not found/, description: 'Missing module import' },
  { pattern: /export.*not found/, description: 'Missing named export' },
  
  // Async/Promise errors
  { pattern: /Unhandled promise rejection/, description: 'Unhandled promise rejection' },
  { pattern: /async.*await.*undefined/, description: 'Awaiting undefined' },
  
  // DOM/Browser errors
  { pattern: /querySelector.*null/, description: 'DOM element not found' },
  { pattern: /addEventListener.*null/, description: 'Adding event listener to null' },
  
  // State management errors
  { pattern: /setState.*unmounted/, description: 'setState on unmounted component' },
  { pattern: /dispatch.*undefined/, description: 'Undefined dispatch function' }
];

// Function to scan files for error patterns
function scanFileForErrors(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    
    // Check for each error pattern
    RUNTIME_ERROR_PATTERNS.forEach(({ pattern, description }) => {
      if (pattern.test(content)) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (pattern.test(line)) {
            errors.push({
              pattern: description,
              line: index + 1,
              content: line.trim()
            });
          }
        });
      }
    });
    
    // Check for specific risky patterns
    const riskyPatterns = [
      { pattern: /\.\w+\?\.\w+\?\.\w+\?\./g, description: 'Deep optional chaining (potential undefined access)' },
      { pattern: /useState\(\)/g, description: 'useState with no initial value' },
      { pattern: /useEffect\(\(\) => \{[^}]*\}, \[\]\)/g, description: 'Empty dependency array with side effects' },
      { pattern: /console\.log\(/g, description: 'Console.log statements (should be removed in production)' },
      { pattern: /debugger;/g, description: 'Debugger statements' }
    ];
    
    riskyPatterns.forEach(({ pattern, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        errors.push({
          pattern: description,
          line: 'multiple',
          count: matches.length
        });
      }
    });
    
    return errors;
  } catch (error) {
    return [{ pattern: 'File read error', error: error.message }];
  }
}

// 2. Scan TypeScript/JavaScript files
const filesToScan = [
  'client/src/components/FileManagerSection.tsx',
  'client/src/components/filemanager/FileUploadDialog.tsx',
  'client/src/components/filemanager/FileList.tsx',
  'client/src/components/MobileNav.tsx',
  'client/src/pages/home.tsx',
  'shared/context/AppContext.tsx'
];

let totalErrors = 0;
filesToScan.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    const errors = scanFileForErrors(fullPath);
    if (errors.length > 0) {
      console.log(`\n🚨 ${filePath}:`);
      errors.forEach(error => {
        if (error.count) {
          console.log(`   Line ${error.line}: ${error.pattern} (${error.count} occurrences)`);
        } else {
          console.log(`   Line ${error.line}: ${error.pattern}`);
          if (error.content) console.log(`      ${error.content}`);
        }
        totalErrors++;
      });
    }
  } else {
    console.log(`   ⚠️  File not found: ${filePath}`);
  }
});

console.log('\n📋 Step 2: Checking lazy loading patterns...');

// 3. Check for lazy loading issues
const lazyLoadingChecks = [
  {
    file: 'shared/context/AppContext.tsx',
    check: (content) => {
      // Check if files section loading has proper error handling
      const hasFilesLoading = content.includes('files');
      const hasErrorHandling = content.includes('try') && content.includes('catch');
      return {
        hasFilesLoading,
        hasErrorHandling,
        risk: hasFilesLoading && !hasErrorHandling ? 'HIGH' : 'LOW'
      };
    }
  },
  {
    file: 'client/src/pages/home.tsx', 
    check: (content) => {
      // Check if sections have fallback rendering
      const hasFilesFallback = content.includes('SectionSkeleton');
      const hasConditionalRender = content.includes('loadedSections.includes');
      return {
        hasFilesFallback,
        hasConditionalRender,
        risk: hasConditionalRender && !hasFilesFallback ? 'MEDIUM' : 'LOW'
      };
    }
  }
];

lazyLoadingChecks.forEach(({ file, check }) => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const result = check(content);
    console.log(`\n📄 ${file}:`);
    Object.entries(result).forEach(([key, value]) => {
      const icon = key === 'risk' ? (value === 'HIGH' ? '🔴' : value === 'MEDIUM' ? '🟠' : '🟢') : '📋';
      console.log(`   ${icon} ${key}: ${value}`);
    });
  }
});

console.log('\n📋 Step 3: Generating runtime error test...');

// 4. Generate a test script to detect runtime errors
const testScript = `
// Runtime Error Detection Test
// Paste this into browser console when app loads

(function() {
  console.log('🔍 Starting runtime error detection...');
  
  // Capture all errors
  const errors = [];
  
  // Override console.error to capture errors
  const originalError = console.error;
  console.error = function(...args) {
    errors.push({
      type: 'console.error',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    originalError.apply(console, args);
  };
  
  // Capture unhandled errors
  window.addEventListener('error', (e) => {
    errors.push({
      type: 'window.error',
      message: e.message,
      filename: e.filename,
      line: e.lineno,
      column: e.colno,
      timestamp: new Date().toISOString()
    });
  });
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    errors.push({
      type: 'promise.rejection',
      message: e.reason?.message || e.reason,
      timestamp: new Date().toISOString()
    });
  });
  
  // Test specific file manager functionality
  setTimeout(() => {
    console.log('🧪 Testing file manager section...');
    
    // Check if FileManagerSection renders without errors
    try {
      const activeSection = document.querySelector('[style*="files"]');
      if (activeSection) {
        console.log('✅ File manager section found in DOM');
      } else {
        console.error('❌ File manager section not found in DOM');
      }
      
      // Check if MobileHeader exists
      const mobileHeader = activeSection?.querySelector('[class*="sticky"]');
      if (mobileHeader) {
        console.log('✅ Mobile header found');
      } else {
        console.error('❌ Mobile header not found');
      }
      
      // Check if HeroSection exists
      const heroSection = activeSection?.querySelector('[class*="gradient"]');
      if (heroSection) {
        console.log('✅ Hero section found');
      } else {
        console.error('❌ Hero section not found');
      }
      
    } catch (error) {
      console.error('❌ Error testing file manager:', error);
    }
    
    // Report all captured errors
    if (errors.length > 0) {
      console.group('🚨 Runtime Errors Detected:');
      errors.forEach((error, index) => {
        console.log(\`\${index + 1}. [\${error.type}] \${error.message}\`);
        if (error.stack) console.log('Stack:', error.stack);
      });
      console.groupEnd();
    } else {
      console.log('✅ No runtime errors detected in current test');
    }
  }, 2000);
})();
`;

fs.writeFileSync('browser-runtime-test.js', testScript);
console.log('✅ Generated browser-runtime-test.js');
console.log('\n📋 Step 4: Instructions for use...');

console.log(`
🎯 NEXT STEPS:

1. Open your browser and navigate to http://localhost:5002
2. Open Developer Tools (F12)
3. Go to Console tab  
4. Copy and paste the contents of browser-runtime-test.js
5. Click the menu button to switch to Files section
6. Watch for error messages in console

💡 MANUAL DEBUGGING STEPS:

1. Check Network tab for failed API requests
2. Look for React DevTools warnings
3. Check if lazy loading sections are properly loaded
4. Verify all imports resolve correctly

📊 SUMMARY:
   Runtime error patterns checked: ${RUNTIME_ERROR_PATTERNS.length}
   Files scanned: ${filesToScan.length}
   Total potential issues found: ${totalErrors}
   
${totalErrors > 0 ? '⚠️  Potential runtime issues detected - see details above' : '✅ No obvious runtime error patterns found'}
`);

console.log('\n🔧 RECOMMENDATIONS:');
console.log('1. Add error boundaries to catch React errors');  
console.log('2. Add loading states for lazy-loaded sections');
console.log('3. Implement proper fallback rendering');
console.log('4. Add try-catch blocks around risky operations');
console.log('5. Use this script regularly during development');