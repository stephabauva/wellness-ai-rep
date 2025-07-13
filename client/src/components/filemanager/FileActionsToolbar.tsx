import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Share2,
  QrCode,
  Trash2,
  List,
  Grid3X3, // Corrected from Grid to Grid3X3
  RotateCcw,
  Upload
} from 'lucide-react';
import { ViewMode, FileCategory } from '@shared';
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
              className="flex-1 sm:flex-none" // Allow buttons to take full width on mobile if alone
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
              className="flex-1 sm:flex-none"
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
            className="w-full sm:w-auto" // Full width on mobile, auto on larger
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
          onClick={onUploadClick}
          className="h-8"
          title="Upload files"
        >
          <Upload className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Upload Files</span>
          <span className="sm:hidden">Upload</span>
        </Button>
        <div className="flex gap-1 border rounded-md p-0.5 bg-muted dark:bg-background"> {/* Adjusted padding for a tighter look */}
          <Button
            variant={currentViewMode === 'list' ? 'secondary' : 'ghost'} // Use secondary for active
            size="sm"
            onClick={() => onSetViewMode('list')}
            className="h-7 w-7 p-0"
            title="List view"
            aria-pressed={currentViewMode === 'list'}
          >
            <List className="h-4 w-4" /> {/* Slightly larger icons */}
          </Button>
          <Button
            variant={currentViewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSetViewMode('grid')}
            className="h-7 w-7 p-0"
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
          className="h-8" // Match height of view mode toggle group approximately
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
