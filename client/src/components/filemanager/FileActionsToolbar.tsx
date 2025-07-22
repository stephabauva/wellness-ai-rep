import React from 'react';
import { Button } from '@shared/components/ui/button';
import {
  Share2,
  QrCode,
  Trash2,
  List,
  Grid3X3, // Corrected from Grid to Grid3X3
  RotateCcw,
  Upload
} from 'lucide-react';
import { ViewMode, FileCategory, cn } from '@shared';
import { CategorySelector } from './CategorySelector';

interface FileActionsToolbarProps {
  selectedFilesCount: number;
  selectedFiles: string[];
  onShare: () => void;
  onQrCode: () => void;
  onDelete: () => void;
  onCategorize: (fileIds: string[], categoryId?: string) => void;
  currentViewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  onRefresh: () => void;
  isDeleting: boolean;
  isCategorizing?: boolean;
  onUploadClick: () => void;
  categories: FileCategory[];
}

export const FileActionsToolbar: React.FC<FileActionsToolbarProps> = ({
  selectedFilesCount,
  selectedFiles,
  onShare,
  onQrCode,
  onDelete,
  onCategorize,
  currentViewMode,
  onSetViewMode,
  onRefresh,
  isDeleting,
  isCategorizing = false,
  onUploadClick,
  categories,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {selectedFilesCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 flex-1"> {/* Ensure this group can grow */}
          <div className="flex gap-2"> {/* Inner group for share buttons, fixed size */}
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              title="Share selected files"
              className="flex-1 sm:flex-none rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
            >
              <Share2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Share</span>
              <span className="sm:hidden">Share ({selectedFilesCount})</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onQrCode}
              title="Generate QR code for selected files"
              className="flex-1 sm:flex-none rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
            >
              <QrCode className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">QR</span>
              <span className="sm:hidden">QR ({selectedFilesCount})</span>
            </Button>
            <CategorySelector
              categories={categories}
              selectedFiles={selectedFiles}
              onCategorize={onCategorize}
              isLoading={isCategorizing}
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title={isDeleting ? "Deleting..." : `Delete ${selectedFilesCount} selected file(s)`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : `Delete ${selectedFilesCount}`}
          </Button>
        </div>
      )}

      {/* Spacer to push view mode and refresh to the right if no files are selected */}
      {selectedFilesCount === 0 && <div className="flex-1 hidden sm:block"></div>}

      <div className="flex items-center gap-2 mt-2 sm:mt-0"> {/* Group for upload, view mode and refresh */}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            onUploadClick();
          }}
          className="h-8 rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
          title="Upload files"
        >
          <Upload className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Upload Files</span>
          <span className="sm:hidden">Upload</span>
        </Button>
        <div className="flex gap-1 border rounded-xl p-0.5 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 transition-all duration-300">
          <Button
            variant={currentViewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSetViewMode('list')}
            className={cn(
              "h-7 w-7 p-0 rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95",
              currentViewMode === 'list' 
                ? "bg-blue-500 text-white shadow-md hover:bg-blue-600" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
            title="List view"
            aria-pressed={currentViewMode === 'list'}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={currentViewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSetViewMode('grid')}
            className={cn(
              "h-7 w-7 p-0 rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95",
              currentViewMode === 'grid' 
                ? "bg-blue-500 text-white shadow-md hover:bg-blue-600" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
            title="Grid view"
            aria-pressed={currentViewMode === 'grid'}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-8 rounded-xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
          title="Refresh file list"
        >
          <RotateCcw className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Refresh</span>
          <span className="sm:hidden">Refresh</span>
        </Button>
      </div>
    </div>
  );
};
