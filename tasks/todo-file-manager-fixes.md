# Todo: File Manager Fixes

## Scope
- Fix category functionality issues preventing users from organizing files
- Resolve Go acceleration service warnings
- Technical context: File manager uses React Query for data fetching, categories stored in fileCategories table

## Risk Assessment
- Dependencies affected: File upload, category management, file list display
- Potential conflicts: Category API endpoints, React Query cache invalidation
- Must ensure backward compatibility with existing files

## Tasks

### Task 1: Fix category visibility issue - Categories not showing when uploading files
**Problem**: When users upload a file, they cannot select a category. The category dropdown/selector is either missing or not populated with available categories.

**Root Cause Analysis**:
- Category data may not be fetched before upload dialog opens
- useFileApi.getCategories might not be called properly
- React Query cache might be stale or not initialized
- FileUploadDialog component may not include CategoryDropdown

**Solution**:
1. Verify FileUploadDialog includes category selection UI
2. Ensure categories are fetched on component mount
3. Add proper loading states for category data
4. Implement error handling if categories fail to load

### Task 2: Debug category tabs - Only 'All' and 'Uncategorised' tabs visible
**Problem**: CategoryTabs component only shows default tabs, not user-created categories.

**Root Cause Analysis**:
- Categories query might be failing silently
- CategoryTabs might be hardcoded to show only default tabs
- Database might not have any categories beyond defaults
- React Query invalidation might not trigger tab refresh

**Solution**:
1. Check if categories exist in database
2. Verify CategoryTabs fetches and renders dynamic categories
3. Debug React Query hooks in CategoryTabs
4. Ensure proper cache invalidation when categories change
5. Add logging to track category fetch lifecycle

### Task 3: Fix categorization dialog - No categories visible when clicking 'categorise' button
**Problem**: When users select files and click 'categorise', the category selection dialog shows no categories.

**Root Cause Analysis**:
- CategorySelector component might not fetch categories
- Modal/dialog state might interfere with data fetching
- Categories API endpoint might return empty array
- Permission or filtering logic might exclude all categories

**Solution**:
1. Verify CategorySelector properly calls useFileApi.getCategories
2. Check API response for /api/categories endpoint
3. Ensure dialog doesn't unmount during category fetch
4. Add error boundaries and loading states
5. Implement fallback to show at least default categories

### Task 4: Fix Go acceleration health check warnings at startup
**Problem**: Server logs show '[WARN ] [express] GET /api/accelerate/health 503' warnings even though Go service should start on-demand.

**Root Cause Analysis**:
- Health check runs before Go service is needed
- Go service is designed to start only for files >5MB
- Health check creates unnecessary noise in logs

**Solution**:
1. Modify health check to not log warnings for expected 503 responses
2. Consider lazy health checking only when Go service is actually needed
3. Update logging to differentiate between expected and unexpected failures
4. Implement proper service discovery pattern

## Safety Checks
- [ ] HMR/WebSocket stability preserved
- [ ] No unused code added
- [ ] No conflicts with existing file operations
- [ ] Production-ready with proper error handling
- [ ] Backward compatible with existing files/categories

## Review
[To be filled after completion]