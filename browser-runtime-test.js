
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
        console.log(`${index + 1}. [${error.type}] ${error.message}`);
        if (error.stack) console.log('Stack:', error.stack);
      });
      console.groupEnd();
    } else {
      console.log('✅ No runtime errors detected in current test');
    }
  }, 2000);
})();
