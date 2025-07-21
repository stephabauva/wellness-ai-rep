// Simple Modal Debug Test - Paste into browser console
// This tests just the upload button click and modal state

(function() {
  console.log('🔍 Starting modal debug test...');
  
  // Wait for app to load
  setTimeout(() => {
    console.log('Looking for upload button...');
    
    // Find the upload button - look for Upload text or Upload icon
    const uploadButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      const hasUploadIcon = btn.querySelector('[data-lucide="upload"]') !== null;
      const hasUploadText = text.includes('upload');
      return hasUploadText || hasUploadIcon;
    });
    
    console.log('Found upload buttons:', uploadButtons.length);
    uploadButtons.forEach((btn, index) => {
      console.log(`Button ${index + 1}:`, {
        text: btn.textContent?.trim(),
        classes: btn.className,
        disabled: btn.disabled,
        style: btn.style.cssText
      });
    });
    
    if (uploadButtons.length === 0) {
      console.error('❌ No upload buttons found!');
      console.log('All buttons on page:');
      Array.from(document.querySelectorAll('button')).forEach((btn, i) => {
        console.log(`${i}: "${btn.textContent?.trim()}" (${btn.className})`);
      });
      return;
    }
    
    // Try clicking the first upload button
    const uploadBtn = uploadButtons[0];
    console.log('Clicking upload button:', uploadBtn.textContent?.trim());
    
    // Add click listener to see if event fires
    uploadBtn.addEventListener('click', (e) => {
      console.log('Upload button click event fired!', e);
    });
    
    uploadBtn.click();
    
    // Wait and check for modal
    setTimeout(() => {
      console.log('Checking for modal after click...');
      
      // Look for modal/dialog elements
      const modals = Array.from(document.querySelectorAll('[role="dialog"], .modal, [data-dialog], [data-state="open"]'));
      console.log('Found modals/dialogs:', modals.length);
      
      modals.forEach((modal, index) => {
        console.log(`Modal ${index + 1}:`, {
          tagName: modal.tagName,
          classes: modal.className,
          visible: modal.style.display !== 'none' && modal.offsetHeight > 0,
          attributes: Array.from(modal.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
        });
      });
      
      // Look for file input elements
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      console.log('Found file inputs:', fileInputs.length);
      
      fileInputs.forEach((input, index) => {
        console.log(`File input ${index + 1}:`, {
          visible: input.offsetHeight > 0,
          disabled: input.disabled,
          accept: input.accept,
          parentVisible: input.parentElement?.offsetHeight || 0
        });
      });
      
      if (modals.length === 0 && fileInputs.length === 0) {
        console.error('❌ No modal or file input found after clicking upload button!');
        console.log('This suggests the upload button click is not working properly');
      } else if (fileInputs.length > 0) {
        console.log('✅ File input found - modal may be working');
      } else {
        console.log('⚠️ Modal elements found but need to check visibility');
      }
      
    }, 1000);
    
  }, 2000);
})();