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
  // Add any other relevant fields from your API response
  tags?: string[];
  description?: string;
}

export interface FileCategory {
  id: string; // e.g., 'medical', 'fitness'
  name: string; // e.g., 'Medical Documents'
  icon: React.ReactNode;
  files: FileItem[];
  description: string;
}

// For view mode toggle
export type ViewMode = 'list' | 'grid';
