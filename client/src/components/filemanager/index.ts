/**
 * File Manager domain public API
 * Only exports what should be accessible outside the file-manager domain
 */

// Main UI components that other domains might need
export { default as FileManagerSection } from '../FileManagerSection';

// These internal components should not be imported directly by other domains
// CategoryDropdown, CategorySelector, CategoryTabs, FileActionsToolbar, 
// FileList, FileUploadDialog, QrCodeDialog are internal implementation details