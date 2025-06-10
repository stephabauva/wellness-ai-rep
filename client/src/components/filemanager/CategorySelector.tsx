import React from 'react'; // useEffect, useState not strictly needed based on provided structure
import { useFileApi } from '@/hooks/useFileApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCategory } from '@/types/fileManager'; // Assuming this path and type definition

interface CategorySelectorProps {
  selectedCategoryId: string | undefined;
  onCategoryChange: (categoryId: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  allowClear?: boolean; // New prop to control if a "None" option is added
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onCategoryChange,
  disabled,
  placeholder = "Select a category",
  allowClear = false,
}) => {
  const { categories, isLoadingCategories, categoriesError } = useFileApi();

  const handleValueChange = (value: string) => {
    if (value === "---NONE---") { // Special value for clearing selection
      onCategoryChange(undefined);
    } else {
      onCategoryChange(value);
    }
  };

  if (isLoadingCategories) {
    return (
      <Select disabled={true}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Loading categories..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (categoriesError) {
    return (
      <Select disabled={true}>
        <SelectTrigger className="w-full error-state"> {/* Added class for styling potential errors */}
          <SelectValue placeholder={`Error: ${categoriesError.message || 'Failed to load'}`} />
        </SelectTrigger>
      </Select>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <Select disabled={true}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No categories available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={selectedCategoryId ?? (allowClear ? "---NONE---" : undefined)}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value="---NONE---">
            <em>{placeholder === "Select a category" ? "None" : placeholder}</em>
          </SelectItem>
        )}
        {categories.map((category: FileCategory) => (
          <SelectItem key={category.id} value={category.id}>
            {/* TODO: Optionally, display icon and color too e.g. <span style={{ color: category.color }}>{category.icon}</span> {category.name} */}
            {category.name}
            {!category.isCustom && <span className="text-xs text-muted-foreground ml-2">(System)</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
