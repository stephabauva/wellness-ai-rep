import React from 'react';
import { Image, FileText, Stethoscope, Activity, Folder, Heart, Apple, Dumbbell, FileImage, Camera, Users, Settings } from 'lucide-react';
import { FileItem, FileCategory } from '@/types/fileManager';

export const getFileIcon = (fileType: string, fileName: string): React.ReactNode => {
  const lowerFileType = fileType.toLowerCase();

  if (lowerFileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
    return React.createElement(Image, { className: "h-4 w-4" });
  }
  return React.createElement(FileText, { className: "h-4 w-4" });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i >= sizes.length) return `${(bytes / Math.pow(k, sizes.length -1 )).toFixed(2)} ${sizes[sizes.length -1]}`;
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getRetentionBadgeColor = (category?: string): string => {
  switch (category) {
    case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

export const categorizeFiles = (files: FileItem[]): FileCategory[] => {
  const medical = files.filter(f =>
    f.retentionInfo?.category === 'high' ||
    f.fileName.toLowerCase().includes('medical') ||
    f.fileName.toLowerCase().includes('lab') ||
    f.fileName.toLowerCase().includes('prescription')
  );

  const fitness = files.filter(f =>
    f.fileName.toLowerCase().includes('workout') ||
    f.fileName.toLowerCase().includes('exercise') ||
    f.fileName.toLowerCase().includes('fitness') ||
    f.fileName.toLowerCase().includes('routine')
  );

  const nutrition = files.filter(f =>
    f.fileName.toLowerCase().includes('food') ||
    f.fileName.toLowerCase().includes('meal') ||
    f.fileName.toLowerCase().includes('nutrition') ||
    f.fileType.startsWith('image/') // Assume images are mostly food photos
  );

  const other = files.filter(f =>
    !medical.some(m => m.id === f.id) &&
    !fitness.some(fit => fit.id === f.id) &&
    !nutrition.some(n => n.id === f.id)
  );

  return [
    {
      id: 'medical',
      name: 'Medical',
      icon: React.createElement(Stethoscope, { className: "h-4 w-4" }),
      files: medical,
      description: 'Medical documents, lab results, prescriptions'
    },
    {
      id: 'fitness',
      name: 'Fitness',
      icon: React.createElement(Activity, { className: "h-4 w-4" }),
      files: fitness,
      description: 'Exercise routines, workout plans, fitness tracking'
    },
    {
      id: 'nutrition',
      name: 'Nutrition',
      icon: React.createElement(Image, { className: "h-4 w-4" }),
      files: nutrition,
      description: 'Food photos, meal plans, nutrition information'
    },
    {
      id: 'other',
      name: 'Other',
      icon: React.createElement(FileText, { className: "h-4 w-4" }),
      files: other,
      description: 'Miscellaneous documents and files'
    }
  ];
};

// Map icon names from database to actual Lucide icon components
export const getIconFromName = (iconName: string | null | undefined): React.ComponentType<any> => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'stethoscope': Stethoscope,
    'heart': Heart,
    'activity': Activity,
    'dumbbell': Dumbbell,
    'apple': Apple,
    'image': Image,
    'file-image': FileImage,
    'camera': Camera,
    'file-text': FileText,
    'folder': Folder,
    'users': Users,
    'settings': Settings,
  };

  return iconMap[iconName?.toLowerCase() || 'folder'] || Folder;
};
