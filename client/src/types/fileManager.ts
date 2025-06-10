import React from 'react';

export interface FileRetentionInfo {
  category: 'high' | 'medium' | 'low' | string; // Allow string for flexibility if new categories appear
  retentionDays: number;
  reason: string;
}

export interface FileItem {
  id: string;
  fileName: string;
  displayName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string; // ISO date string
  retentionInfo: FileRetentionInfo;
  url?: string; // Optional URL for direct access or preview
  tags?: string[];
  description?: string;
  categoryId?: string | null; // New field for linking to FileCategory.id
}

// This seems to be a View Model for displaying categories with their files,
// let's rename it to avoid conflict with the actual data model for a category.
export interface FileCategoryGroup {
  id: string; // This might be the category name or a generated ID for the group
  name: string;
  icon: React.ReactNode; // Specific to UI
  files: FileItem[];
  description: string; // Description of the group/category
}

// New FileCategory type based on shared/schema.ts fileCategories table
export interface FileCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;       // Icon name or reference (e.g., Lucide icon name)
  color?: string | null;      // Color hex or Tailwind class
  isCustom: boolean;
  userId?: number | null;     // Null for predefined/system categories
  createdAt: string;         // Assuming date is serialized as string from API
  // updatedAt?: string; // If you add updatedAt in the schema and API
}


// For view mode toggle
export type ViewMode = 'list' | 'grid';
