
import React, { useMemo, useEffect, useState } from 'react';
import { RotateCcw, FileText as DefaultFileIcon, QrCode, X, Download } from 'lucide-react';

import { Skeleton } from "@shared/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
// Removed problematic Dialog import - using custom modal implementation
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Checkbox } from "@shared/components/ui/checkbox";
import { cn } from '@shared';
import ErrorBoundary from './ErrorBoundary';

// Import hooks
import { useFileApi } from '@/hooks/useFileApi';
import { useFileManagerState } from '@/hooks/useFileManagerState';
import { useFileSharing } from '@/hooks/useFileSharing';

// Import sub-components
import { FileList as FileListComponent } from './filemanager/FileList';
import { FileActionsToolbar } from './filemanager/FileActionsToolbar';
import { CategoryTabs } from './filemanager/CategoryTabs';
import { QrCodeDialog } from './filemanager/QrCodeDialog';
import FileUploadDialog from './filemanager/FileUploadDialog';
import { FloatingActionButton } from './filemanager/FloatingActionButton';

// Import utilities and types
import { categorizeFiles, getFileIcon, formatFileSize, formatDate } from '@shared';
import { FileCategory, FileItem } from '@shared';


const FileManagerSection: React.FC = () => {
  const {
    files,
    isLoadingFiles,
    refetchFiles,
    deleteFiles,
    isDeletingFiles,
    categorizeFiles,
    isCategorizingFiles,
    categories,
    isLoadingCategories
  } = useFileApi();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  

  const {
    selectedFiles,
    setSelectedFiles, // Used to clear selection after delete
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    handleSelectFile,
    handleSelectAll,
    clearSelection,
  } = useFileManagerState();

  const {
    showQRCodeDialog,
    setShowQRCodeDialog,
    qrCodeData,
    shareSelectedFiles,
    generateAndShowQRCode,
  } = useFileSharing(files); // Pass all files to the sharing hook
  
  const showQRCode = showQRCodeDialog;
  const setShowQRCode = setShowQRCodeDialog;

  // const categories: FileCategory[] = useMemo(() => categorizeFiles(files), [files]); // Commented out old categories derivation

  const activeFiles: FileItem[] = useMemo(() => {
    if (activeTab === 'all') {
      return files;
    }
    if (activeTab === 'uncategorized') {
      return files.filter(file => !file.categoryId);
    }
    // activeTab is assumed to be a categoryId from the database
    return files.filter(file => file.categoryId === activeTab);
  }, [activeTab, files]);



  // Effect to clear selection when files data changes (e.g., after delete or refetch)
  // and the selected files are no longer in the list of all files.
  useEffect(() => {
    const currentFileIds = new Set(files.map(f => f.id));
    const newSelectedFiles = new Set<string>();
    selectedFiles.forEach(id => {
      if (currentFileIds.has(id)) {
        newSelectedFiles.add(id);
      }
    });
    if (newSelectedFiles.size !== selectedFiles.size) {
      setSelectedFiles(newSelectedFiles);
    }
  }, [files, selectedFiles, setSelectedFiles]);


  const handleDelete = () => {
    if (selectedFiles.size > 0) {
      deleteFiles(Array.from(selectedFiles));
      // Selection is cleared optimistically by the mutation's onSuccess in useFileApi,
      // or could be cleared here: clearSelection();
    }
  };

  const handleCategorize = (fileIds: string[], categoryId?: string) => {
    categorizeFiles({ fileIds, categoryId });
    clearSelection();
  };
  
  if (isLoadingFiles) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Hero Section Loading */}
        <div className="relative rounded-2xl overflow-hidden mx-4 mt-4 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 animate-pulse" />
          <div className="relative px-4 py-6 backdrop-blur-sm">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky toolbar loading */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4">
          <div className="py-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-xl" />
                <Skeleton className="h-8 w-16 rounded-xl" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-auto">
                <Skeleton className="h-8 w-28 rounded-xl" />
                <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 pt-4 pb-6 overflow-auto space-y-4">
          {/* Category tabs loading */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-24 rounded-xl flex-shrink-0" />
            ))}
          </div>

          {/* File list loading */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Hero Section with gradient background */}
      <div className="relative rounded-2xl overflow-hidden mx-4 mt-4 mb-6">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-600/20 to-teal-500/20"
          style={{
            background: `linear-gradient(to bottom right, 
              hsl(217 91% 60% / 0.2), 
              hsl(271 81% 56% / 0.2), 
              hsl(162 85% 40% / 0.2)
            )`
          }}
        />
        <div className="relative px-4 py-6 backdrop-blur-sm">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">File Manager</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Manage your uploaded documents and photos
            </p>
            {/* File stats */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {files.length} files stored
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedFiles.size} selected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4">
        <div className="py-4">
          <FileActionsToolbar
            selectedFilesCount={selectedFiles.size}
            selectedFiles={Array.from(selectedFiles)}
            onShare={() => shareSelectedFiles(selectedFiles)}
            onQrCode={() => generateAndShowQRCode(selectedFiles)}
            onDelete={handleDelete}
            onCategorize={handleCategorize}
            currentViewMode={viewMode}
            onSetViewMode={setViewMode}
            onRefresh={refetchFiles}
            isDeleting={isDeletingFiles}
            isCategorizing={isCategorizingFiles}
            onUploadClick={() => {
              setIsUploadDialogOpen(true);
            }}
            categories={categories || []}
          />
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-6 overflow-auto space-y-4">
        <CategoryTabs
          categories={categories || []}
          files={files}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          totalFilesCount={files.length}
        />

        <div className="relative">
          {/* Loading overlay for delete/categorize operations */}
          {(isDeletingFiles || isCategorizingFiles) && (
            <div className="absolute inset-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl border-2 border-blue-500/20">
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {isDeletingFiles ? 'Deleting files...' : 'Updating categories...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <ErrorBoundary componentName="FileList" fallbackComponent={
            <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-xl text-center">
              <p className="text-red-600 dark:text-red-400">File list could not load. Please refresh to try again.</p>
            </div>
          }>
            <FileListComponent
              files={activeFiles}
              selectedFiles={selectedFiles}
              onSelectFile={handleSelectFile}
              onSelectAll={() => handleSelectAll(activeFiles)}
              viewMode={viewMode}
              categories={categories}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Custom QR Code Modal - Replaced problematic Dialog component */}
      {showQRCode && (
        <ErrorBoundary componentName="QRCodeModal" fallbackComponent={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">QR Code could not be generated</p>
              <Button onClick={() => setShowQRCode(false)}>Close</Button>
            </div>
          </div>
        }>
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowQRCode(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Share Files via QR Code
                </h3>
              </div>
              
              {/* Modal Content */}
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Scan this QR code with any device to download the selected files
                </div>
                {qrCodeData && (
                  <div className="flex justify-center">
                    <img 
                      src={qrCodeData} 
                      alt="QR Code for file sharing" 
                      className="border rounded-lg"
                    />
                  </div>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
                  <p>• Single file: Direct download link</p>
                  <p>• Multiple files: JSON data with all download links</p>
                  <p>• Files will be downloaded to the device's Downloads folder</p>
                </div>
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShowQRCode(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* File Upload Modal */}
      <ErrorBoundary componentName="FileUploadDialog" fallbackComponent={
        isUploadDialogOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-4 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">File upload dialog could not load</p>
              <Button onClick={() => setIsUploadDialogOpen(false)}>Close</Button>
            </div>
          </div>
        ) : null
      }>
        <FileUploadDialog
          isOpen={isUploadDialogOpen}
          onClose={() => {
            setIsUploadDialogOpen(false);
          }}
          onUploadSuccess={() => {
            refetchFiles();
            // Optionally, you might want to clear selection or reset active tab here
            // depending on desired UX after upload.
          }}
        />
      </ErrorBoundary>

      {/* Floating Action Button for Upload */}
      <FloatingActionButton
        onClick={() => setIsUploadDialogOpen(true)}
        title="Upload Files"
      />
      
    </div>
  );
};


export default FileManagerSection;
