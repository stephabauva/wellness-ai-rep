import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCategory } from '@/types/fileManager'; // Assuming FileCategory is defined here

interface CategoryTabsProps {
  categories: FileCategory[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  totalFilesCount: number; // To display on the "All" tab
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeTab,
  onTabChange,
  totalFilesCount,
}) => {
  return (
    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto gap-1 sm:gap-2">
      <TabsTrigger
        value="all"
        className="text-xs sm:text-sm p-1.5 sm:p-2.5" // Adjusted padding
        aria-controls="tabpanel-all" // Accessibility
      >
        <span className="flex flex-col sm:flex-row items-center gap-1 truncate">
          <span className="sm:hidden">All</span>
          <span className="hidden sm:inline">All Files</span>
          <span className="text-xs">({totalFilesCount})</span>
        </span>
      </TabsTrigger>
      {categories.map(category => (
        <TabsTrigger
          key={category.id}
          value={category.id}
          className="text-xs sm:text-sm p-1.5 sm:p-2.5" // Adjusted padding
          aria-controls={`tabpanel-${category.id}`} // Accessibility
        >
          <span className="flex flex-col sm:flex-row items-center gap-1 truncate">
            {React.cloneElement(category.icon as React.ReactElement, { className: "h-4 w-4" })}
            <span className="truncate">{category.name}</span>
            <span className="text-xs">({category.files.length})</span>
          </span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
};
