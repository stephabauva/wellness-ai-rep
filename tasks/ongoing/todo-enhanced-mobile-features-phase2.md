# Todo: Enhanced Mobile Features Phase 2 + Upload Modal Styling

## Context & Investigation
- Current state: Basic file manager with FloatingActionButton and minimal mobile features
- Upload modal issue: FileUploadDialog.tsx uses inline styles instead of Tailwind CSS patterns
- Existing mobile infrastructure: useSwipe.ts hook and TouchSwipeHandler.tsx available
- System map references checked:
  - file-manager/core-operations.map.json
  - file-manager/categories.map.json 
- Dependencies identified via dependency-tracker.js:
  - FileManagerSection.tsx (main container) - 1 cross-domain usage
  - FileUploadDialog.tsx - uses useFileUpload hook
  - FloatingActionButton.tsx - properly styled, used in FileManagerSection
  - useSwipe.ts and TouchSwipeHandler.tsx - existing gesture infrastructure

## Scope
- Brief description: Implement advanced mobile features for file manager + fix upload modal styling
- Technical context: React/TypeScript with Tailwind CSS, mobile-first responsive design
- Affected domains/features: File manager UI only, leveraging existing gesture infrastructure

## Risk Assessment
- Dependencies affected:
  - FileUploadDialog.tsx: Complete styling overhaul (inline styles → Tailwind)
  - FileManagerSection.tsx: Add camera integration and gesture controls
  - New components for camera and enhanced sharing
- Potential cascade effects: None - isolated to file manager mobile features
- WebSocket/HMR stability risks: None - UI-only changes
- Cross-domain impacts: FileManagerSection.tsx already has 1 legitimate cross-domain usage
- Database migration needs: None
- UI issues to fix: Missing modal props in Dialog components (detected by frontend monitor)

## Implementation Strategy
- Approach: Incremental enhancement leveraging existing infrastructure
- Why this approach:
  - Builds on existing useSwipe hook and gesture patterns
  - Maintains existing functionality while adding mobile features
  - Uses proven mobile patterns from other sections (health dashboard, memory)
  - Can implement features independently for easy rollback
- Integration points: 
  - Existing shared UI components (Dialog, Button, Card)
  - File upload infrastructure (useFileUpload hook, file-routes.ts)
  - Mobile gesture system (useSwipe, TouchSwipeHandler)

## Tasks

- [ ] Task 1: Fix FileUploadDialog styling and modal issues
   - Problem: Uses inline styles instead of Tailwind, missing modal props
   - Solution:
     - Replace all inline styles with Tailwind classes following STYLE-GUIDE.md
     - Add proper Dialog modal props to fix UI monitor warnings
     - Add gradient header, proper spacing, and hover effects
     - Implement loading states with skeleton screens
   - Files affected:
     - client/src/components/filemanager/FileUploadDialog.tsx (lines 47-213)

- [ ] Task 2: Add camera integration for direct file upload
   - Problem: No camera access for quick photo uploads
   - Solution:
     - Create CameraCapture component using getUserMedia API
     - Add camera icon to FileUploadDialog with tab interface
     - Implement preview, retake, and upload workflow
     - Add mobile-optimized camera controls (flip, flash if available)
   - Files affected:
     - Create new: client/src/components/filemanager/CameraCapture.tsx
     - Update: client/src/components/filemanager/FileUploadDialog.tsx

- [ ] Task 3: Implement advanced swipe gesture controls
   - Problem: No swipe actions for file management operations
   - Solution:
     - Integrate useSwipe hook into FileList component
     - Add swipe-left for delete, swipe-right for share actions
     - Implement visual feedback with translate animations
     - Add haptic feedback support where available
   - Files affected:
     - client/src/components/filemanager/FileList.tsx (leverage existing grid/list structure)

- [ ] Task 4: Create enhanced mobile sharing interface
   - Problem: Limited sharing options, basic QR code functionality
   - Solution:
     - Add native Web Share API integration for mobile devices
     - Create mobile sharing sheet with multiple export options
     - Add bulk sharing with progress indicators
     - Implement "Share to App" functionality for common mobile apps
   - Files affected:
     - Create new: client/src/components/filemanager/MobileShareSheet.tsx
     - Update: client/src/hooks/useFileSharing.ts
     - Update: client/src/components/FileManagerSection.tsx

- [ ] Task 5: Add mobile-optimized file preview system
   - Problem: No quick preview for images/documents on mobile
   - Solution:
     - Create full-screen mobile preview modal
     - Add pinch-to-zoom for images
     - Support swipe navigation between files
     - Add download and share actions in preview
   - Files affected:
     - Create new: client/src/components/filemanager/MobileFilePreview.tsx
     - Update: client/src/components/filemanager/FileList.tsx

- [ ] Task 6: Implement pull-to-refresh functionality
   - Problem: No native mobile refresh gesture
   - Solution:
     - Add pull-to-refresh using CSS transforms and touch events
     - Show loading spinner during refresh
     - Provide haptic feedback on refresh trigger
   - Files affected:
     - Update: client/src/components/FileManagerSection.tsx
     - Leverage existing useFileApi refetch functionality

## Safety Checks
- [x] HMR/WebSocket stability preserved (UI-only changes)
- [x] No unused code or fallbacks (enhancing existing components)
- [x] No conflicts between components (using existing shared infrastructure)
- [ ] Production-ready (will remove console.logs, add error boundaries)
- [ ] System maps will be updated (if new components created)
- [ ] Dependency annotations added (@used-by comments for new components)
- [ ] Fix UI monitor warnings (modal props, error handling)

## Testing Plan
- Unit tests needed: 
  - CameraCapture component functionality
  - New mobile gesture handlers
  - Web Share API fallback behavior
- Integration tests required: None (UI enhancements)
- Manual testing checklist:
  - [ ] Test camera access permission flow
  - [ ] Verify swipe gestures work on various mobile devices
  - [ ] Test Web Share API on different mobile browsers
  - [ ] Check pull-to-refresh feels natural
  - [ ] Verify file preview zoom and navigation
  - [ ] Test upload modal styling across screen sizes
  - [ ] Confirm haptic feedback works where supported
- Performance impact verification:
  - [ ] Check camera stream performance on low-end devices
  - [ ] Verify gesture handling doesn't block UI
  - [ ] Test file preview loading performance

## Rollback Plan
If something breaks:
1. Revert UI changes in FileUploadDialog.tsx to inline styles
2. Remove camera integration from upload dialog
3. Disable swipe gestures in FileList
4. Components to check:
   - FileManagerSection.tsx
   - FileUploadDialog.tsx
   - All new mobile components
5. Verify core file operations still work

## Mobile Features Summary
Phase 2 will add:
1. **Styled Upload Modal**: Proper Tailwind styling with modern design patterns
2. **Camera Integration**: Direct photo capture and upload from mobile devices
3. **Advanced Gestures**: Swipe actions for delete/share with visual feedback
4. **Enhanced Sharing**: Native Web Share API with mobile-optimized interface
5. **Mobile Preview**: Full-screen preview with pinch-zoom and navigation
6. **Pull-to-Refresh**: Native mobile refresh gesture

## Implementation Priority
**High Priority (User-requested):**
- Fix upload modal styling (immediate visual improvement)
- Camera integration (key mobile feature)
- Advanced gesture controls (user specifically requested)
- Improved mobile sharing (user specifically requested)

**Medium Priority:**
- Mobile file preview system
- Pull-to-refresh functionality

## Review
[To be filled after completion]
- What worked:
- What didn't:
- Lessons learned:
- Mobile performance notes: