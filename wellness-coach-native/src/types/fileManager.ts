import React from 'react'; // Keep React import for React.ReactElement

export interface FileRetentionInfo {
  category: 'high' | 'medium' | 'low' | string;
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
  url?: string;
  tags?: string[];
  description?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  // TODO: RN-Adapt - consider adding 'uri' if local file URIs are stored for cached/offline files
  uri?: string;
}

export interface FileCategoryGroup {
  id: string;
  name: string;
  // TODO: RN-Adapt - Icon type for React Native. Could be () => React.ReactElement | null for a component,
  // or just React.ReactElement if passed as <IconComponent />.
  // Using React.ReactElement for now assuming it's an already rendered component.
  icon: React.ReactElement | null;
  files: FileItem[];
  description: string;
}

export interface FileCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isCustom: boolean;
  userId?: number | null;
  createdAt: string;
  // updatedAt?: string;
}

export type ViewMode = 'list' | 'grid';
