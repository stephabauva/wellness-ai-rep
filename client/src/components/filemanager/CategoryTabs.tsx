import React, { useMemo } from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCategory, FileItem } from '@/types/fileManager';
import { getIconFromName } from '@/utils/fileManagerUtils';

interface CategoryTabsProps {
  categories: FileCategory[];
  files: FileItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  totalFilesCount: number;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  files,
  activeTab,
  onTabChange,
  totalFilesCount,
}) => {
  // Calculate file counts per category
  const categoryFileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (files && Array.isArray(files)) {
      files.forEach(file => {
        if (file.categoryId) {
          counts[file.categoryId] = (counts[file.categoryId] || 0) + 1;
        }
      });
    }
    return counts;
  }, [files]);

  return (
    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto gap-1 sm:gap-2">
      <TabsTrigger
        value="all"
        className="text-xs sm:text-sm p-1.5 sm:p-2.5"
        aria-controls="tabpanel-all"
      >
        <span className="flex flex-col sm:flex-row items-center gap-1 truncate">
          <span className="sm:hidden">All</span>
          <span className="hidden sm:inline">All Files</span>
          <span className="text-xs">({totalFilesCount})</span>
        </span>
      </TabsTrigger>
      {categories.map(category => {
        const fileCount = categoryFileCounts[category.id] || 0;
        const CategoryIcon = getIconFromName(category.icon || 'folder');
        
        return (
          <TabsTrigger
            key={category.id}
            value={category.id}
            className="text-xs sm:text-sm p-1.5 sm:p-2.5"
            aria-controls={`tabpanel-${category.id}`}
          >
            <span className="flex flex-col sm:flex-row items-center gap-1 truncate">
              <CategoryIcon className="h-4 w-4" />
              <span className="truncate">{category.name}</span>
              <span className="text-xs">({fileCount})</span>
            </span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
};
