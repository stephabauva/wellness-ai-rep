
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
      <div className="p-4 md:p-6 border-b">
        <div className="space-y-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">File Manager</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your uploaded documents and photos
            </p>
          </div>
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
            onUploadClick={() => setIsUploadDialogOpen(true)}
            categories={categories || []}
          />
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto space-y-4">
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
        onClose={() => setIsUploadDialogOpen(false)}
        onUploadSuccess={() => {
          refetchFiles();
          // Optionally, you might want to clear selection or reset active tab here
          // depending on desired UX after upload.
        }}
      />
    </div>
  );
};

interface FileListProps {
  files: FileItem[];
  selectedFiles: Set<string>;
  onSelectFile: (fileId: string) => void;
  onSelectAll: () => void;
  viewMode: 'list' | 'grid';
}

const getRetentionBadgeColor = (category: string) => {
  switch (category) {
    case 'high': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const FileList: React.FC<FileListProps> = ({ 
  files, 
  selectedFiles, 
  onSelectFile, 
  onSelectAll,
  viewMode 
}) => {
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DefaultFileIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No files found</h3>
          <p className="text-muted-foreground text-center">
            Upload some files through the chat to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  if (viewMode === 'grid') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
              <span className="text-sm font-medium">
                {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select all'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "relative border rounded-lg p-3 transition-colors cursor-pointer",
                  selectedFiles.has(file.id) ? "bg-accent border-primary" : "hover:bg-muted/50"
                )}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => onSelectFile(file.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-background/80"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a 
                      href={`/uploads/${file.fileName}`} 
                      download={file.displayName}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download file"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                  </Button>
                </div>

                <div className="flex flex-col items-center space-y-2 mt-6">
                  {/* File Preview */}
                  <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                    {file.fileType.startsWith('image/') ? (
                      <img
                        src={`/uploads/${file.fileName}`}
                        alt={file.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={cn("flex items-center justify-center w-full h-full", file.fileType.startsWith('image/') ? 'hidden' : '')}>
                      {getFileIcon(file.fileType, file.fileName)}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="text-center space-y-1 w-full">
                    <h4 className="text-xs font-medium truncate" title={file.displayName}>
                      {file.displayName}
                    </h4>
                    <div className="flex flex-col items-center gap-1">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          getRetentionBadgeColor(file.retentionInfo.category),
                          "text-xs"
                        )}
                      >
                        {file.retentionInfo.category === 'high' ? 'Permanent' : 
                         `${file.retentionInfo.retentionDays}d`}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view (default)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedFiles.size > 0 ? `${selectedFiles.size} selected` : 'Select all'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors",
              selectedFiles.has(file.id) ? "bg-accent" : "hover:bg-muted/50"
            )}
          >
            <Checkbox
              checked={selectedFiles.has(file.id)}
              onCheckedChange={() => onSelectFile(file.id)}
            />
            
            {/* File Preview */}
            <div className="flex-shrink-0 w-10 h-10 bg-muted rounded overflow-hidden flex items-center justify-center">
              {file.fileType.startsWith('image/') ? (
                <img
                  src={`/uploads/${file.fileName}`}
                  alt={file.displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn("flex items-center justify-center w-full h-full", file.fileType.startsWith('image/') ? 'hidden' : '')}>
                {getFileIcon(file.fileType, file.fileName)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                <h4 className="text-sm font-medium truncate">
                  {file.displayName}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    getRetentionBadgeColor(file.retentionInfo.category),
                    "text-xs self-start sm:self-auto"
                  )}
                >
                  {file.retentionInfo.category === 'high' ? 'Permanent' : 
                   `${file.retentionInfo.retentionDays}d`}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
                <span>{formatFileSize(file.fileSize)}</span>
                <span className="hidden sm:inline">{formatDate(file.uploadDate)}</span>
                <span className="sm:hidden">{new Date(file.uploadDate).toLocaleDateString()}</span>
                <span className="truncate">{file.retentionInfo.reason}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a 
                  href={`/uploads/${file.fileName}`} 
                  download={file.displayName}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default FileManagerSection;
