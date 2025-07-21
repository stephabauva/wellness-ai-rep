// Enhanced File Upload Test Script
// Paste this into browser console when app loads
// This will test the actual file upload functionality with detailed logging

(function() {
  console.log('🔍 Starting enhanced file upload testing...');
  
  // Capture all errors
  const errors = [];
  const logs = [];
  
  // Override console methods to capture all logs
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.log = function(...args) {
    logs.push({
      type: 'log',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    errors.push({
      type: 'console.error',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    originalError.apply(console, args);
  };
  
  console.warn = function(...args) {
    logs.push({
      type: 'warn',
      message: args.join(' '),
      timestamp: new Date().toISOString()
    });
    originalWarn.apply(console, args);
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
  
  // Intercept fetch requests to monitor API calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('[FETCH INTERCEPTED]', args[0], args[1]);
    return originalFetch.apply(this, args).then(response => {
      console.log('[FETCH RESPONSE]', response.status, response.statusText, args[0]);
      return response;
    }).catch(error => {
      console.error('[FETCH ERROR]', error, args[0]);
      throw error;
    });
  };
  
  // Wait for the app to load and then test file upload
  setTimeout(() => {
    console.log('🧪 Testing file manager functionality...');
    
    // Step 1: Navigate to file manager section
    try {
      console.log('Step 1: Finding file manager section...');
      const fileManagerSection = document.querySelector('[data-section="files"], [style*="files"]');
      
      if (!fileManagerSection) {
        // Try to click the files menu item to navigate to files
        const filesMenuItem = Array.from(document.querySelectorAll('button, a, [role="menuitem"]')).find(el => 
          el.textContent?.toLowerCase().includes('file') || 
          el.getAttribute('data-section') === 'files'
        );
        
        if (filesMenuItem) {
          console.log('Found files menu item, clicking...', filesMenuItem);
          filesMenuItem.click();
          
          // Wait for navigation
          setTimeout(testUpload, 1000);
          return;
        } else {
          console.error('❌ Could not find files menu item or file manager section');
          reportResults();
          return;
        }
      }
      
      console.log('✅ File manager section found');
      testUpload();
      
    } catch (error) {
      console.error('❌ Error finding file manager:', error);
      reportResults();
    }
  }, 2000);
  
  function testUpload() {
    try {
      console.log('Step 2: Looking for upload button...');
      
      // Look for upload button or upload dialog trigger
      const uploadButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.toLowerCase().includes('upload') ||
        btn.querySelector('[data-lucide="upload"]') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('upload')
      );
      
      if (uploadButton) {
        console.log('✅ Found upload button:', uploadButton);
        console.log('Button text:', uploadButton.textContent);
        console.log('Button classes:', uploadButton.className);
        console.log('Button disabled:', uploadButton.disabled);
        
        if (uploadButton.disabled) {
          console.warn('⚠️ Upload button is disabled');
        }
        
        // Click the upload button
        console.log('Clicking upload button...');
        uploadButton.click();
        
        // Wait for dialog to open and test file selection
        setTimeout(() => {
          testFileDialog();
        }, 500);
        
      } else {
        console.error('❌ Could not find upload button');
        console.log('Available buttons:', Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          classes: btn.className,
          disabled: btn.disabled
        })));
        reportResults();
      }
      
    } catch (error) {
      console.error('❌ Error testing upload:', error);
      reportResults();
    }
  }
  
  function testFileDialog() {
    try {
      console.log('Step 3: Testing file upload dialog...');
      
      // Look for file input
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        console.log('✅ Found file input:', fileInput);
        console.log('File input accept:', fileInput.accept);
        console.log('File input disabled:', fileInput.disabled);
        
        // Create a test file
        const testFileContent = 'This is a test file for upload debugging';
        const testFile = new File([testFileContent], 'debug-test.txt', {
          type: 'text/plain',
          lastModified: Date.now()
        });
        
        console.log('Created test file:', {
          name: testFile.name,
          size: testFile.size,
          type: testFile.type
        });
        
        // Simulate file selection
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        fileInput.files = dataTransfer.files;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
        
        console.log('File selection simulated, waiting for UI update...');
        
        // Wait and look for upload button in dialog
        setTimeout(() => {
          testUploadSubmit();
        }, 1000);
        
      } else {
        console.error('❌ Could not find file input in dialog');
        console.log('Available inputs:', Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          classes: input.className
        })));
        reportResults();
      }
      
    } catch (error) {
      console.error('❌ Error testing file dialog:', error);
      reportResults();
    }
  }
  
  function testUploadSubmit() {
    try {
      console.log('Step 4: Testing upload submission...');
      
      // Look for upload submit button in dialog
      const uploadSubmitButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.toLowerCase().includes('upload') &&
        !btn.textContent?.toLowerCase().includes('cancel')
      );
      
      if (uploadSubmitButton) {
        console.log('✅ Found upload submit button:', uploadSubmitButton);
        console.log('Submit button text:', uploadSubmitButton.textContent);
        console.log('Submit button disabled:', uploadSubmitButton.disabled);
        
        if (uploadSubmitButton.disabled) {
          console.warn('⚠️ Upload submit button is disabled');
          console.log('Possible reasons: No file selected, validation failed, already uploading');
        } else {
          console.log('Clicking upload submit button...');
          uploadSubmitButton.click();
          
          // Wait for upload process
          setTimeout(() => {
            console.log('Upload process should have started, checking results...');
            reportResults();
          }, 3000);
          return;
        }
      } else {
        console.error('❌ Could not find upload submit button');
        console.log('Available buttons in dialog:', Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          classes: btn.className,
          disabled: btn.disabled
        })));
      }
      
      reportResults();
      
    } catch (error) {
      console.error('❌ Error testing upload submit:', error);
      reportResults();
    }
  }
  
  function reportResults() {
    console.group('🚨 COMPREHENSIVE TEST RESULTS');
    
    console.group('📊 Error Summary');
    if (errors.length > 0) {
      errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type}] ${error.message}`);
        if (error.stack) console.log('Stack:', error.stack);
      });
    } else {
      console.log('✅ No errors detected during testing');
    }
    console.groupEnd();
    
    console.group('📋 Detailed Logs');
    const uploadLogs = logs.filter(log => 
      log.message.includes('[FileUploadDialog]') || 
      log.message.includes('[useFileUpload]') ||
      log.message.includes('[FETCH')
    );
    
    if (uploadLogs.length > 0) {
      console.log('Upload-related logs:');
      uploadLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.type}] ${log.message}`);
      });
    } else {
      console.log('⚠️ No upload-related logs found - upload process may not have started');
    }
    console.groupEnd();
    
    console.group('🌐 Network Activity');
    console.log('Check the Network tab for:');
    console.log('1. POST requests to /api/upload');
    console.log('2. Response status codes');
    console.log('3. Request payload (FormData)');
    console.log('4. Response data or error messages');
    console.groupEnd();
    
    console.group('💡 Next Steps');
    if (errors.length === 0 && uploadLogs.length === 0) {
      console.log('🔍 Possible issues:');
      console.log('1. Upload button not found or not clickable');
      console.log('2. File input not accepting file selection');
      console.log('3. Upload process not triggering due to validation');
      console.log('4. Event handlers not properly attached');
    } else if (errors.length > 0) {
      console.log('🔧 Fix the errors above first');
    } else {
      console.log('📈 Check upload logs for process flow issues');
    }
    console.groupEnd();
    
    console.groupEnd();
    
    // Restore original console methods
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    window.fetch = originalFetch;
  }
  
})();