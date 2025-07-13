/**
 * Shared module public API
 * Export only what should be accessible across domains
 */

// Utilities
export { cn } from './utilities/cn';
export { 
  getFileIcon, 
  formatFileSize, 
  formatDate, 
  formatTime, 
  getRetentionBadgeColor, 
  categorizeFiles, 
  getIconFromName 
} from './utilities/file-utils';
export { 
  formatBytes, 
  formatSpeed, 
  formatDuration, 
  createUploadProgressCallback,
  ProgressTracker,
  SpeedCalculator
} from './utilities/upload-progress';

// Services
export { 
  apiRequest, 
  getQueryFn, 
  queryClient, 
  getSectionCacheTime 
} from './services/api-client';

// Context
export { 
  AppProvider, 
  useAppContext 
} from './context/AppContext';

// Types
export type { 
  Message,
  AttachedFile,
  ActiveSection,
  AppSettings
} from './context/AppContext';
export type { 
  FileRetentionInfo, 
  FileItem, 
  FileCategoryGroup, 
  FileCategory, 
  ViewMode 
} from './types/file-manager';
export type { 
  UploadProgress, 
  UploadSpeedCalculator 
} from './utilities/upload-progress';