// Debug State Test - Check if modal state is actually changing
// Paste this into browser console

(function() {
  console.log('🔍 Starting state debug test...');
  
  // Monitor for specific debug logs we added
  const originalLog = console.log;
  const stateLogs = [];
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('[FileManagerSection]') || 
        message.includes('[FileUploadDialog]') || 
        message.includes('[FileActionsToolbar]')) {
      stateLogs.push({
        message: message,
        timestamp: new Date().toISOString()
      });
    }
    originalLog.apply(console, args);
  };
  
  setTimeout(() => {
    console.log('Looking for upload button...');
    
    const uploadButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('upload');
    });
    
    if (uploadButtons.length === 0) {
      console.error('❌ No upload buttons found');
      return;
    }
    
    const uploadBtn = uploadButtons[0];
    console.log('Found upload button, clicking...', uploadBtn.textContent);
    
    // Clear state logs before clicking
    stateLogs.length = 0;
    
    uploadBtn.click();
    
    // Wait and analyze state
    setTimeout(() => {
      console.group('📋 STATE ANALYSIS');
      
      console.log('State logs captured:', stateLogs.length);
      stateLogs.forEach((log, i) => {
        console.log(`${i + 1}. ${log.message}`);
      });
      
      // Check for modal elements
      const dialogs = document.querySelectorAll('[role="dialog"], [data-radix-dialog-content]');
      console.log('Dialog elements found:', dialogs.length);
      
      dialogs.forEach((dialog, i) => {
        console.log(`Dialog ${i + 1}:`, {
          visible: dialog.offsetHeight > 0 && dialog.offsetWidth > 0,
          zIndex: window.getComputedStyle(dialog).zIndex,
          display: window.getComputedStyle(dialog).display,
          position: window.getComputedStyle(dialog).position,
          transform: window.getComputedStyle(dialog).transform,
          opacity: window.getComputedStyle(dialog).opacity,
          innerHTML: dialog.innerHTML.substring(0, 200) + '...'
        });
      });
      
      // Check for overlay elements
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      console.log('Overlay elements found:', overlays.length);
      
      overlays.forEach((overlay, i) => {
        console.log(`Overlay ${i + 1}:`, {
          visible: overlay.offsetHeight > 0 && overlay.offsetWidth > 0,
          zIndex: window.getComputedStyle(overlay).zIndex,
          backgroundColor: window.getComputedStyle(overlay).backgroundColor,
          opacity: window.getComputedStyle(overlay).opacity
        });
      });
      
      // Check if state logs show the expected flow
      const hasButtonClick = stateLogs.some(log => log.message.includes('Upload button clicked'));
      const hasStateChange = stateLogs.some(log => log.message.includes('Upload dialog state:'));
      const hasDialogRender = stateLogs.some(log => log.message.includes('isOpen: true'));
      
      console.log('Expected state flow check:');
      console.log('✓ Button click logged:', hasButtonClick);
      console.log('✓ State change logged:', hasStateChange);
      console.log('✓ Dialog render logged:', hasDialogRender);
      
      if (!hasButtonClick) {
        console.error('❌ Button click not detected - event handler issue');
      } else if (!hasStateChange) {
        console.error('❌ State change not detected - state management issue');
      } else if (!hasDialogRender) {
        console.error('❌ Dialog render not detected - component issue');
      } else if (dialogs.length === 0) {
        console.error('❌ No dialog elements in DOM - Dialog component not rendering');
      } else {
        console.warn('⚠️ State flow looks correct but modal not visible - CSS/positioning issue');
      }
      
      console.groupEnd();
      
      // Restore original console.log
      console.log = originalLog;
      
    }, 2000);
    
  }, 1000);
})();