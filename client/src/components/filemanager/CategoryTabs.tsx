import React, { useMemo } from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCategory, FileItem } from '@/types/fileManager';
import { getIconFromName } from '@/utils/fileManagerUtils';
import { cn } from '@/lib/utils';

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
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon ? getIconFromName(tab.icon) : null;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                "min-w-0 flex-shrink-0",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              )}
              aria-controls={`tabpanel-${tab.id}`}
            >
              {TabIcon && <TabIcon className="h-4 w-4 flex-shrink-0" />}
              <span className="truncate max-w-[120px]">{tab.label}</span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                isActive 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-background text-muted-foreground"
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
