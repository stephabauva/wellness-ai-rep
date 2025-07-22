# Todo: File Manager Page Redesign

## Context & Investigation
- Current state: File manager uses basic Card components and standard UI elements
- Style guide reference: STYLE-GUIDE.md (based on health dashboard patterns)
- System map references checked:
  - file-manager/core-operations.map.json
  - file-manager/categories.map.json
  - file-manager/advanced-processing.map.json
- Dependencies identified:
  - FileManagerSection.tsx (main container)
  - filemanager/ components (FileList, FileActionsToolbar, CategoryTabs, etc.)
  - Shared UI components (Card, Button, Badge, Dialog)
  - File API hooks (useFileApi, useFileManagerState, useFileSharing)

## Scope
- Brief description: Apply health dashboard design patterns to file manager page
- Technical context: React/TypeScript components with Tailwind CSS
- Affected domains/features: File manager UI only, no backend changes

## Risk Assessment
- Dependencies affected:
  - All file manager components need UI updates
  - Shared components remain unchanged (using existing API)
  - No cross-domain impacts expected
- Potential cascade effects: None - isolated to file manager UI
- WebSocket/HMR stability risks: None - only CSS/className changes
- Database migration needs: None

## Implementation Strategy
- Approach: Incremental UI updates following style guide patterns
- Why this approach: 
  - Maintains existing functionality while improving aesthetics
  - Can be implemented component by component
  - Easy to rollback if issues arise
- Integration points: Uses existing shared UI components

## Tasks
- [ ] Task 1: Update FileManagerSection.tsx layout
   - Problem: Current layout lacks mobile-first padding and hero section
   - Solution: 
     - Apply container padding pattern: `px-4` mobile, responsive spacing
     - Add gradient hero section for file stats
     - Implement sticky header pattern for toolbar
   - Files affected: 
     - client/src/components/FileManagerSection.tsx

- [ ] Task 2: Redesign FileList.tsx cards
   - Problem: Basic card styling without hover effects or animations
   - Solution:
     - Apply card hover patterns: `hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg`
     - Add transition animations: `transition-all duration-300 ease-out`
     - Implement active states: `active:scale-[0.97]`
     - Update grid spacing to match style guide
   - Files affected:
     - client/src/components/filemanager/FileList.tsx

- [ ] Task 3: Enhance FileActionsToolbar.tsx buttons
   - Problem: Standard buttons without consistent styling
   - Solution:
     - Apply button variant patterns (primary, secondary, destructive)
     - Add hover effects: `hover:scale-105 hover:shadow-lg`
     - Ensure 44px minimum touch targets
     - Add proper transitions
   - Files affected:
     - client/src/components/filemanager/FileActionsToolbar.tsx

- [ ] Task 4: Update CategoryTabs.tsx with mobile patterns
   - Problem: Tabs lack horizontal scroll and mobile optimization
   - Solution:
     - Implement horizontal scroll pattern for mobile
     - Add swipe gesture support
     - Apply active tab styling with transitions
   - Files affected:
     - client/src/components/filemanager/CategoryTabs.tsx

- [ ] Task 5: Add FloatingActionButton for file upload
   - Problem: Upload button is in toolbar, not easily accessible
   - Solution:
     - Create FAB component following style guide pattern
     - Position: `fixed bottom-6 right-6 z-50`
     - Apply gradient and hover effects
   - Files affected:
     - Create new: client/src/components/filemanager/FloatingUploadButton.tsx
     - Update: client/src/components/FileManagerSection.tsx

- [ ] Task 6: Enhance file preview cards with semantic colors
   - Problem: Retention badges lack visual hierarchy
   - Solution:
     - Apply semantic color system for badges
     - Update preview thumbnails with rounded corners and shadows
     - Add loading skeleton states
   - Files affected:
     - client/src/components/filemanager/FileList.tsx

- [ ] Task 7: Add animations and loading states
   - Problem: No smooth transitions or loading feedback
   - Solution:
     - Add skeleton screens during data loading
     - Implement smooth transitions between states
     - Add hardware acceleration with `transform-gpu`
   - Files affected:
     - client/src/components/FileManagerSection.tsx
     - client/src/components/filemanager/FileList.tsx

## Safety Checks
- [x] HMR/WebSocket stability preserved (only UI changes)
- [x] No unused code or fallbacks (enhancing existing components)
- [x] No conflicts between components (isolated changes)
- [ ] Production-ready (will remove console.logs in FileList.tsx)
- [ ] System maps will be updated (if structural changes occur)
- [ ] Dependency annotations added (if new dependencies created)

## Testing Plan
- Unit tests needed: None (UI-only changes)
- Integration tests required: None
- Manual testing checklist:
  - [ ] Test all hover/active states
  - [ ] Verify mobile responsiveness
  - [ ] Check dark mode appearance
  - [ ] Test file operations still work
  - [ ] Verify animations are smooth
  - [ ] Test on actual mobile devices
- Performance impact verification:
  - [ ] Check animation performance on low-end devices
  - [ ] Verify no layout shifts during interactions

## Rollback Plan
If something breaks:
1. Git revert the UI changes
2. Components to check:
   - FileManagerSection.tsx
   - All filemanager/ components
3. Verify file operations still functional

## Visual Enhancements Summary
Based on the style guide, the file manager will receive:
1. **Hero Section**: Gradient background showing total files, storage used
2. **Card Animations**: Smooth hover effects and transitions
3. **Mobile-First**: Better touch targets, horizontal scrolling for categories
4. **Semantic Colors**: Clear visual hierarchy for file states
5. **Floating Action Button**: Easy access to upload functionality
6. **Loading States**: Skeleton screens and smooth transitions
7. **Dark Mode**: Proper contrast and gradient adjustments

## Review
[To be filled after completion]
- What worked:
- What didn't:
- Lessons learned: