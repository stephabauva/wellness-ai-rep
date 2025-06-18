import React from 'react';
import { Text, ViewStyle, StyleSheet } from 'react-native'; // Added StyleSheet
import {
    Image as ImageIconRN, // Renamed to avoid conflict
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
    // Add any other specific icons if needed from lucide-react-native
} from 'lucide-react-native';
import { FileItem, FileCategory, FileCategoryGroup } from '../types/fileManager';

const defaultIconSize = 16;
const defaultIconColor = "#4B5563"; // Tailwind gray-600

const IconPlaceholder = ({ name, style, color, size }: { name: string, style?: ViewStyle, color?: string, size?: number }) => (
    <Text style={[{ color: color || defaultIconColor }, style]}>[{name}]</Text>
);


export const getFileIcon = (fileType: string, fileName: string): React.ReactNode => {
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  const iconSize = 14; // Slightly smaller for file lists

  if (lowerFileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
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

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return `${(bytes / Math.pow(k, sizes.length -1 )).toFixed(2)} ${sizes[sizes.length -1]}`;
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// Returns StyleSheet style for retention badges
export const getRetentionBadgeStyle = (category?: string): any => {
  switch (category) {
    case 'high': return styles.badgeHigh;
    case 'medium': return styles.badgeMedium;
    case 'low': return styles.badgeLow;
    default: return styles.badgeDefault;
  }
};

// Map icon names from database or definition to actual Lucide icon components for RN
const iconMap: Record<string, React.FC<any>> = {
    'stethoscope': StethoscopeIcon,
    'heart': HeartIcon,
    'activity': ActivityIcon,
    'dumbbell': DumbbellIcon,
    'apple': AppleIcon,
    'image': ImageIconRN,
    'file-image': ImageIconRN, // Alias
    'camera': CameraIcon,
    'file-text': FileTextIcon,
    'folder': FolderIcon,
    'users': UsersIcon,
    'settings': SettingsIcon,
    'database': DatabaseIcon,
};

export const getIconFromName = (iconName?: string | null): React.ReactElement | null => {
  const ResolvedIcon = iconName ? iconMap[iconName.toLowerCase()] : FolderIcon;
  if (ResolvedIcon) {
      return <ResolvedIcon size={defaultIconSize} color={defaultIconColor} />;
  }
  return <FolderIcon size={defaultIconSize} color={defaultIconColor} />; // Default fallback
};


// This function returns FileCategoryGroup which includes React.ReactNode for icons.
// Updated to use getIconFromName for consistency.
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
    id: cat.id,
    name: cat.name,
    icon: getIconFromName(cat.icon),
    files: categoryMap.get(cat.id) || [],
    description: cat.description || '',
  }));

  if (uncategorizedFiles.length > 0) {
    result.push({
      id: 'uncategorized',
      name: 'Uncategorized',
      icon: getIconFromName('folder'),
      files: uncategorizedFiles,
      description: 'Files not assigned to a category.',
    });
  }
  return result;
};


const styles = StyleSheet.create({
  badgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: '500',
    borderWidth: 1,
  },
  badgeHigh: {
    backgroundColor: 'rgba(209, 250, 229, 1)', // green-100
    color: 'rgba(6, 95, 70, 1)', // green-800
    borderColor: 'rgba(110, 231, 183, 1)', // green-300
  },
  badgeMedium: {
    backgroundColor: 'rgba(254, 243, 199, 1)', // yellow-100
    color: 'rgba(146, 64, 14, 1)', // yellow-800
    borderColor: 'rgba(253, 224, 71, 1)', // yellow-400
  },
  badgeLow: {
    backgroundColor: 'rgba(254, 226, 226, 1)', // red-100
    color: 'rgba(153, 27, 27, 1)', // red-800
    borderColor: 'rgba(252, 165, 165, 1)', // red-300
  },
  badgeDefault: {
    backgroundColor: 'rgba(243, 244, 246, 1)', // gray-100
    color: 'rgba(31, 41, 55, 1)', // gray-800
    borderColor: 'rgba(209, 213, 219, 1)', // gray-300
  },
});
