import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select"';
import { useFileApi } from '@/hooks/useFileApi';
import { Loader2 } from 'lucide-react';

interface CategoryDropdownProps {
  selectedCategoryId?: string;
  onCategoryChange: (categoryId?: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CategoryDropdown({
  selectedCategoryId,
  onCategoryChange,
  placeholder = "Select a category",
  allowClear = false,
  disabled = false,
  className,
}: CategoryDropdownProps) {
  const { categories, isLoadingCategories } = useFileApi();

  const handleValueChange = (value: string) => {
    if (value === "none" && allowClear) {
      onCategoryChange(undefined);
    } else {
      onCategoryChange(value);
    }
  };

  return (
    <Select
      value={selectedCategoryId || (allowClear ? "none" : "")}
      onValueChange={handleValueChange}
      disabled={disabled || isLoadingCategories}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={
          isLoadingCategories ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading categories...
            </div>
          ) : placeholder
        } />
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value="none">
            <span className="text-muted-foreground">No category</span>
          </SelectItem>
        )}
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <span>{category.name}</span>
          </SelectItem>
        ))}
        {!isLoadingCategories && categories.length === 0 && (
          <SelectItem value="empty" disabled>
            <span className="text-muted-foreground">No categories available</span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}