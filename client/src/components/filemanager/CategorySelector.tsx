import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@shared/components/ui/dropdown-menu';
import { Tag, ChevronDown } from 'lucide-react';
import { FileCategory } from '@shared';

interface CategorySelectorProps {
  categories: FileCategory[];
  selectedFiles: string[];
  onCategorize: (fileIds: string[], categoryId?: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function CategorySelector({
  categories,
  selectedFiles,
  onCategorize,
  isLoading = false,
  disabled = false,
}: CategorySelectorProps) {
  const handleCategorize = (categoryId?: string) => {
    if (selectedFiles.length > 0) {
      onCategorize(selectedFiles, categoryId);
    }
  };

  const isDisabled = disabled || isLoading || selectedFiles.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className="gap-2"
        >
          <Tag className="h-4 w-4" />
          Categorize
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {categories.map((category) => (
          <DropdownMenuItem
            key={category.id}
            onClick={() => handleCategorize(category.id)}
            className="flex items-center gap-2"
          >
            <span className="flex-1">{category.name}</span>
          </DropdownMenuItem>
        ))}
        {categories.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => handleCategorize(undefined)}
          className="text-muted-foreground"
        >
          Remove Category
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}