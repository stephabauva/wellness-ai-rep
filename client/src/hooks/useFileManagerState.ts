import { useState, useCallback } from 'react';
import { ViewMode, FileItem } from '@/types/fileManager';

export function useFileManagerState(initialFiles: FileItem[] = []) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('all'); // Default to 'all' tab
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to 'list' view

  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFiles(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return newSelected;
    });
  }, []);

  // currentDisplayedFiles needs to be passed to this handler
  // as the hook itself doesn't know which files are currently visible based on activeTab.
  const handleSelectAll = useCallback((currentDisplayedFiles: FileItem[]) => {
    setSelectedFiles(prevSelected => {
      if (prevSelected.size === currentDisplayedFiles.length && currentDisplayedFiles.length > 0) {
        // All currently displayed files are selected, so deselect all
        return new Set<string>();
      } else {
        // Not all (or none) are selected, so select all currently displayed files
        return new Set(currentDisplayedFiles.map(f => f.id));
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // When activeTab changes, clear selection from the previous tab
  const handleTabChange = useCallback((newTabId: string) => {
    setActiveTab(newTabId);
    clearSelection(); // Clear selection when changing tabs
  }, [clearSelection]);

  return {
    selectedFiles,
    setSelectedFiles, // Expose setter if direct manipulation is needed, e.g., after delete
    activeTab,
    setActiveTab: handleTabChange, // Use wrapped setter
    viewMode,
    setViewMode,
    handleSelectFile,
    handleSelectAll,
    clearSelection,
  };
}
