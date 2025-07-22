
import React, { useMemo, useEffect, useState } from 'react';
import { RotateCcw, FileText as DefaultFileIcon, QrCode, X, Download } from 'lucide-react';

import { Skeleton } from "@shared/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from '@shared/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import { Checkbox } from "@shared/components/ui/checkbox";
import { cn } from '@shared';

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
      <div className="flex-1 flex flex-col h-full p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" /> {/* Title placeholder */}
        <Skeleton className="h-8 w-full" /> {/* Toolbar placeholder */}
        <Skeleton className="h-10 w-full" /> {/* Tabs placeholder */}
        <Skeleton className="flex-1 w-full" /> {/* File list placeholder */}
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

        <FileListComponent
          files={activeFiles}
          selectedFiles={selectedFiles}
          onSelectFile={handleSelectFile}
          onSelectAll={() => handleSelectAll(activeFiles)}
          viewMode={viewMode}
          categories={categories}
        />
      </div>

      {/* QR Code Modal */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Share Files via QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
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
            <div className="text-xs text-muted-foreground text-center space-y-1">
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
        </DialogContent>
      </Dialog>

      {/* File Upload Modal */}
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
      
    </div>
  );
};


export default FileManagerSection;
