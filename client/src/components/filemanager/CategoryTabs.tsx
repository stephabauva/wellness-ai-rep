import React, { useMemo } from 'react';
import { TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { FileCategory, FileItem } from '@shared';
import { getIconFromName } from '@shared';
import { cn } from '@shared';

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
  // Calculate file counts per category and uncategorized
  const { categoryFileCounts, uncategorizedCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    let uncategorized = 0;
    
    if (files && Array.isArray(files)) {
      files.forEach(file => {
        if (file.categoryId) {
          counts[file.categoryId] = (counts[file.categoryId] || 0) + 1;
        } else {
          uncategorized++;
        }
      });
    }
    return { categoryFileCounts: counts, uncategorizedCount: uncategorized };
  }, [files]);

  // Create tabs array with optimized layout
  const tabs = [
    { id: 'all', label: 'All', count: totalFilesCount, icon: null },
    ...categories.map(category => ({
      id: category.id,
      label: category.name,
      count: categoryFileCounts[category.id] || 0,
      icon: category.icon
    })),
    ...(uncategorizedCount > 0 ? [{ id: 'uncategorized', label: 'Uncategorized', count: uncategorizedCount, icon: 'HelpCircle' }] : [])
  ];

  return (
    <div className="w-full">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth -webkit-overflow-scrolling-touch">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon ? getIconFromName(tab.icon) : null;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap",
                "min-w-0 flex-shrink-0 min-h-[44px] transition-all duration-300 ease-out",
                "transform-gpu will-change-transform",
                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                "hover:scale-105 hover:shadow-md active:scale-95",
                isActive 
                  ? "bg-blue-500 text-white border-blue-500 shadow-md hover:bg-blue-600" 
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border"
              )}
              aria-controls={`tabpanel-${tab.id}`}
              aria-pressed={isActive}
            >
              {IconComponent && (
                <IconComponent className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="truncate max-w-[100px] sm:max-w-[120px]">{tab.label}</span>
              <span className={cn(
                "text-xs px-2 py-1 rounded-full font-medium flex-shrink-0",
                "transition-all duration-200",
                isActive 
                  ? "bg-white/20 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
