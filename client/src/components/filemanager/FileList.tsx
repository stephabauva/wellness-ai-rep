import React from 'react';
import { Card, CardContent, CardHeader } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Checkbox } from "@shared/components/ui/checkbox";
import { Badge } from '@shared/components/ui/badge';
import { Download, FileText, Image as ImageIcon } from 'lucide-react'; // Renamed Image to ImageIcon
import { cn } from '@shared';
import { FileItem, ViewMode } from '@shared';
import {
  formatFileSize,
  formatDate,
  getFileIcon as getFileIconUtil, // Renamed to avoid conflict
  getRetentionBadgeColor
} from '@shared';

interface FileListProps {
  files: FileItem[];
  selectedFiles: Set<string>;
  onSelectFile: (fileId: string) => void;
  onSelectAll: () => void; // This will now be connected to handleSelectAll from useFileManagerState
  viewMode: ViewMode;
  categories?: Array<{ id: string; name: string; icon?: string | null; color?: string | null }>;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFiles,
  onSelectFile,
  onSelectAll,
  viewMode,
  categories = []
}) => {
  // Helper function to get category name
  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown';
  };
  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No files found</h3>
          <p className="text-muted-foreground text-center">
            Upload some files through the chat to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allDisplayedFilesSelected = files.length > 0 && selectedFiles.size === files.length;
  const someFilesSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  if (viewMode === 'grid') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allDisplayedFilesSelected}
                ref={(el) => { // For indeterminate state
                  if (el) {
                    const input = el.querySelector('input');
                    if (input) input.indeterminate = someFilesSelected;
                  }
                }}
                onCheckedChange={onSelectAll} // Directly use the passed handler
                aria-label="Select all files in current view"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "relative border rounded-xl p-3 cursor-pointer aspect-square flex flex-col justify-between items-center group",
                  "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                  "transition-all duration-300 ease-out transform-gpu will-change-transform",
                  "hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600",
                  "active:scale-[0.97] active:translate-y-0",
                  selectedFiles.has(file.id) 
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500 scale-[1.02] shadow-md" 
                    : ""
                )}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={() => onSelectFile(file.id)}
                    onClick={(e) => e.stopPropagation()} // Prevent card click when checkbox is clicked
                    aria-label={`Select file ${file.displayName}`}
                  />
                </div>

                <div className="absolute top-2 right-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7" // Consistent small icon button
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`/uploads/${file.fileName}`}
                      download={file.displayName}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Download ${file.displayName}`}
                      aria-label={`Download ${file.displayName}`}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                <div className="flex flex-col items-center justify-center text-center space-y-1 pt-8 flex-grow w-full overflow-hidden">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-2 shadow-sm group-hover:shadow-md transition-all duration-300 ease-out">
                    {file.fileType.startsWith('image/') ? (
                      <img
                        src={file.url || `/uploads/${file.fileName}`} // Use file.url if available
                        alt={file.displayName}
                        className="w-full h-full object-cover rounded-lg"
                        onLoad={() => {
                          // Image loaded successfully
                        }}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none'; // Hide broken image
                          const fallbackIcon = target.nextElementSibling; // Assuming next sibling is the icon div
                          if (fallbackIcon) fallbackIcon.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={cn("flex items-center justify-center w-full h-full", file.fileType.startsWith('image/') ? 'hidden' : '')}>
                      <div>
                        {getFileIconUtil(file.fileType, file.fileName, "h-12 w-12 sm:h-14 sm:w-14")}
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xs font-medium truncate w-full" title={file.displayName}>
                    {file.displayName}
                  </h4>
                  <p className="text-[10px] text-muted-foreground truncate w-full">
                    {getCategoryName(file.categoryId)}
                  </p>
                </div>
                 <div className="flex flex-col items-center gap-1 text-xs w-full mt-auto">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "px-1.5 py-0.5 text-[10px] font-medium rounded-md transition-all duration-200",
                        file.retentionInfo?.category === 'high' 
                          ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800"
                          : file.retentionInfo?.category === 'medium'
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          : file.retentionInfo?.category === 'low'
                          ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800"
                          : "bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800"
                      )}
                      title={file.retentionInfo?.reason}
                    >
                      {file.retentionInfo?.category === 'high' && file.retentionInfo?.retentionDays === -1 ? 'Permanent' :
                       file.retentionInfo?.retentionDays !== undefined ? `${file.retentionInfo.retentionDays}d` : 'N/A'}
                    </Badge>
                    <span className="text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </span>
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
              checked={allDisplayedFilesSelected}
              ref={(el) => { // For indeterminate state
                if (el) {
                  const input = el.querySelector('input');
                  if (input) input.indeterminate = someFilesSelected;
                }
              }}
              onCheckedChange={onSelectAll}
              aria-label="Select all files in current view"
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
              "flex items-center gap-2 sm:gap-3 p-3 rounded-xl border cursor-pointer group",
              "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
              "transition-all duration-300 ease-out transform-gpu will-change-transform",
              "hover:scale-[1.01] hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
              "active:scale-[0.99]",
              selectedFiles.has(file.id)
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500 shadow-sm"
                : ""
            )}
             onClick={() => onSelectFile(file.id)}
          >
            <Checkbox
              checked={selectedFiles.has(file.id)}
              onCheckedChange={() => onSelectFile(file.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select file ${file.displayName}`}
            />

            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300 ease-out">
              {file.fileType.startsWith('image/') ? (
                <img
                  src={file.url || `/uploads/${file.fileName}`} // Use file.url if available
                  alt={file.displayName}
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    // List view image loaded successfully
                  }}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const fallbackIcon = target.nextElementSibling;
                    if (fallbackIcon) fallbackIcon.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn("flex items-center justify-center w-full h-full", file.fileType.startsWith('image/') ? 'hidden' : '')}>
                <div>
                  {getFileIconUtil(file.fileType, file.fileName, "h-8 w-8")}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 mb-0.5">
                <h4 className="text-sm font-medium truncate" title={file.displayName}>
                  {file.displayName}
                </h4>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs self-start sm:self-center whitespace-nowrap px-1.5 py-0.5 text-[10px] font-medium rounded-md transition-all duration-200",
                    file.retentionInfo?.category === 'high' 
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800"
                      : file.retentionInfo?.category === 'medium'
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                      : file.retentionInfo?.category === 'low'
                      ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800"
                      : "bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800"
                  )}
                  title={file.retentionInfo?.reason}
                >
                  {file.retentionInfo?.category === 'high' && file.retentionInfo?.retentionDays === -1 ? 'Permanent' :
                   file.retentionInfo?.retentionDays !== undefined ? `${file.retentionInfo.retentionDays}d` : 'N/A'}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 sm:gap-x-3 text-xs text-muted-foreground">
                <span>{formatFileSize(file.fileSize)}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">{formatDate(file.uploadDate)}</span>
                <span className="sm:hidden">{new Date(file.uploadDate).toLocaleDateString()}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate" title={`Category: ${getCategoryName(file.categoryId)}`}>
                  {getCategoryName(file.categoryId)}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate hidden md:inline" title={file.retentionInfo?.reason}>{file.retentionInfo?.reason}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8" // Standardized icon button size
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={`/uploads/${file.fileName}`}
                  download={file.displayName}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Download ${file.displayName}`}
                  aria-label={`Download ${file.displayName}`}
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
