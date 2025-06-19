import React from 'react';
import { Text, ViewStyle, StyleSheet } from 'react-native';
import {
    Image as ImageIconRN,
    FileText as FileTextIcon,
    Database as DatabaseIcon,
    Folder as FolderIcon,
    Stethoscope as StethoscopeIcon,
    Activity as ActivityIcon,
    Apple as AppleIcon,
    Camera as CameraIcon,
    Users as UsersIcon,
    Settings as SettingsIcon,
    Heart as HeartIcon,
    Dumbbell as DumbbellIcon,
} from 'lucide-react-native';
import { FileItem, FileCategory, FileCategoryGroup } from '../types/fileManager';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../theme';

/**
 * @file fileManagerUtils.ts
 * @description Utility functions for file management UI, such as icon selection,
 * file size formatting, date formatting, badge styling, and client-side categorization.
 */

const defaultIconSize = 16;
const defaultIconColor = COLORS.textSecondary;

/**
 * Determines and returns a file-type-specific icon component based on MIME type or filename extension.
 * @param {string} fileType - The MIME type of the file (e.g., 'image/jpeg', 'application/pdf').
 * @param {string} fileName - The name of the file, used as a fallback for type detection.
 * @returns {React.ReactNode} A React Native component (from lucide-react-native) representing the file icon.
 */
export const getFileIcon = (fileType: string, fileName: string): React.ReactNode => {
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  const iconSize = 14;

  if (lowerFileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(lowerFileName)) {
    return <ImageIconRN size={iconSize} color={defaultIconColor} />;
  }
  if (lowerFileType.includes('xml') || lowerFileName.endsWith('.xml')) {
    return <DatabaseIcon size={iconSize} color={defaultIconColor} />;
  }
  if (lowerFileType.includes('json') || lowerFileName.endsWith('.json')) {
    return <DatabaseIcon size={iconSize} color={defaultIconColor} />;
  }
  if (lowerFileType.includes('csv') || lowerFileName.endsWith('.csv')) {
    return <DatabaseIcon size={iconSize} color={defaultIconColor} />;
  }
  return <FileTextIcon size={iconSize} color={defaultIconColor} />;
};

/**
 * Formats file size in bytes into a human-readable string (e.g., "1.2 MB", "120 KB").
 * @param {number} bytes - The file size in bytes.
 * @returns {string} A formatted file size string.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return `${(bytes / Math.pow(k, sizes.length -1 )).toFixed(2)} ${sizes[sizes.length -1]}`;
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formats a date string into a user-friendly string (e.g., "Nov 15, 2023, 10:30 AM").
 * @param {string} dateString - An ISO date string.
 * @returns {string} A formatted date string, or "Invalid Date" if parsing fails.
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

/**
 * Returns a StyleSheet object for styling retention badges based on category.
 * @param {string} [category] - The retention category (e.g., 'high', 'medium', 'low').
 * @returns {any} A StyleSheet style object.
 */
export const getRetentionBadgeStyle = (category?: string): any => {
  switch (category) {
    case 'high': return styles.badgeHigh;
    case 'medium': return styles.badgeMedium;
    case 'low': return styles.badgeLow;
    default: return styles.badgeDefault;
  }
};

/** @private Mapping of icon names (typically from backend category data) to Lucide icon components. */
const iconMap: Record<string, React.FC<any>> = {
    'stethoscope': StethoscopeIcon, 'heart': HeartIcon, 'activity': ActivityIcon,
    'dumbbell': DumbbellIcon, 'apple': AppleIcon, 'image': ImageIconRN,
    'file-image': ImageIconRN, 'camera': CameraIcon, 'file-text': FileTextIcon,
    'folder': FolderIcon, 'users': UsersIcon, 'settings': SettingsIcon,
    'database': DatabaseIcon,
};

/**
 * Returns a specific Lucide icon component based on a provided icon name string.
 * Used for dynamic icon rendering based on category data from the backend.
 * @param {string | null | undefined} iconName - The name of the icon (e.g., 'stethoscope', 'folder').
 * @returns {React.ReactElement | null} A React Native component for the icon, or a default (FileText or Folder) icon.
 */
export const getIconFromName = (iconName?: string | null): React.ReactElement | null => {
  const lowerIconName = iconName?.toLowerCase();
  const ResolvedIcon = lowerIconName ? iconMap[lowerIconName] : FolderIcon;
  if (ResolvedIcon) {
      return <ResolvedIcon size={defaultIconSize} color={defaultIconColor} />;
  }
  return <FileTextIcon size={defaultIconSize} color={defaultIconColor} />;
};

/**
 * Categorizes an array of files based on a provided list of categories for display purposes.
 * This function is primarily for client-side display grouping.
 * @param {FileItem[]} files - An array of file items.
 * @param {FileCategory[]} categories - An array of available categories.
 * @returns {FileCategoryGroup[]} An array of category groups, each containing its files and icon.
 * Includes an "Uncategorized" group if any files don't match provided categories.
 */
export const categorizeFilesForDisplay = (files: FileItem[], categories: FileCategory[]): FileCategoryGroup[] => {
  const categoryMap = new Map<string, FileItem[]>();
  categories.forEach(cat => categoryMap.set(cat.id, []));
  const uncategorizedFiles: FileItem[] = [];

  files.forEach(file => {
    if (file.categoryId && categoryMap.has(file.categoryId)) {
      categoryMap.get(file.categoryId)?.push(file);
    } else {
      uncategorizedFiles.push(file);
    }
  });

  const result: FileCategoryGroup[] = categories.map(cat => ({
    id: cat.id, name: cat.name, icon: getIconFromName(cat.icon),
    files: categoryMap.get(cat.id) || [], description: cat.description || '',
  }));

  if (uncategorizedFiles.length > 0) {
    result.push({
      id: 'uncategorized', name: 'Uncategorized', icon: getIconFromName('folder'),
      files: uncategorizedFiles, description: 'Files not assigned to a category.',
    });
  }
  return result;
};

const styles = StyleSheet.create({
  badgeBase: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: 12,
    fontSize: FONT_SIZES.small, fontWeight: FONT_WEIGHTS.medium, borderWidth: 1,
  },
  badgeHigh: { // These styles can be further customized with specific text colors if needed
    backgroundColor: COLORS.success + '30', // Using alpha for background
    color: COLORS.success, // Text color matching the border/main color
    borderColor: COLORS.success,
    ...styles.badgeBase, // Spread base style if it's not applied by default elsewhere
  },
  badgeMedium: {
    backgroundColor: COLORS.warning + '30',
    color: COLORS.warning,
    borderColor: COLORS.warning,
    ...styles.badgeBase,
  },
  badgeLow: {
    backgroundColor: COLORS.error + '30',
    color: COLORS.error,
    borderColor: COLORS.error,
    ...styles.badgeBase,
  },
  badgeDefault: {
    backgroundColor: COLORS.lightGray,
    color: COLORS.textSecondary,
    borderColor: COLORS.mediumGray,
    ...styles.badgeBase,
  },
});
