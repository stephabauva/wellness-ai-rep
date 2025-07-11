import React from 'react';
import { Image, FileText, Stethoscope, Activity, Folder, Heart, Apple, Dumbbell, FileImage, Camera, Users, Settings, Database, FileIcon, VideoIcon, AudioWaveformIcon, File } from 'lucide-react';
import { FileItem, FileCategoryGroup } from '@/types/fileManager'; // Use FileCategoryGroup

export const getFileIcon = (fileType: string, fileName: string, size: string = "h-6 w-6"): React.ReactNode => {
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // Image files
  if (lowerFileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(fileName)) {
    return React.createElement(Image, { className: `${size} text-blue-500` });
  }
  
  // Video files
  if (lowerFileType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(fileName)) {
    return React.createElement(VideoIcon, { className: `${size} text-purple-500` });
  }
  
  // Audio files
  if (lowerFileType.startsWith('audio/') || /\.(mp3|wav|flac|aac|ogg|wma|m4a)$/i.test(fileName)) {
    return React.createElement(AudioWaveformIcon, { className: `${size} text-green-500` });
  }
  
  // PDF files
  if (lowerFileType.includes('pdf') || lowerFileName.endsWith('.pdf')) {
    return React.createElement(FileText, { className: `${size} text-red-500` });
  }
  
  // XML files
  if (lowerFileType.includes('xml') || lowerFileName.endsWith('.xml')) {
    return React.createElement(Database, { className: `${size} text-orange-500` });
  }
  
  // JSON files
  if (lowerFileType.includes('json') || lowerFileName.endsWith('.json')) {
    return React.createElement(Database, { className: `${size} text-yellow-500` });
  }
  
  // CSV files
  if (lowerFileType.includes('csv') || lowerFileName.endsWith('.csv')) {
    return React.createElement(Database, { className: `${size} text-green-600` });
  }
  
  // Word documents
  if (lowerFileType.includes('word') || /\.(doc|docx)$/i.test(fileName)) {
    return React.createElement(FileText, { className: `${size} text-blue-600` });
  }
  
  // Excel files
  if (lowerFileType.includes('excel') || lowerFileType.includes('sheet') || /\.(xls|xlsx)$/i.test(fileName)) {
    return React.createElement(Database, { className: `${size} text-green-700` });
  }
  
  // PowerPoint files
  if (lowerFileType.includes('powerpoint') || lowerFileType.includes('presentation') || /\.(ppt|pptx)$/i.test(fileName)) {
    return React.createElement(FileText, { className: `${size} text-orange-600` });
  }
  
  // Text files
  if (lowerFileType.includes('text') || /\.(txt|md|rtf)$/i.test(fileName)) {
    return React.createElement(FileText, { className: `${size} text-gray-600` });
  }
  
  // Default file icon
  return React.createElement(FileIcon, { className: `${size} text-gray-500` });
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

export const categorizeFiles = (files: FileItem[]): FileCategoryGroup[] => { // Update return type
  const medical = files.filter(f => {
    const fileName = f.fileName.toLowerCase();
    const fileType = f.fileType.toLowerCase();
    
    return f.retentionInfo?.category === 'high' ||
      fileName.includes('medical') ||
      fileName.includes('lab') ||
      fileName.includes('prescription') ||
      fileName.includes('health') ||
      fileName.includes('export') ||
      (fileType.includes('xml') && (fileName.includes('health') || fileName.includes('export'))) ||
      fileName.includes('apple_health') ||
      fileName.includes('healthkit');
  });

  const fitness = files.filter(f => {
    const fileName = f.fileName.toLowerCase();
    const fileType = f.fileType.toLowerCase();
    
    return fileName.includes('workout') ||
      fileName.includes('exercise') ||
      fileName.includes('fitness') ||
      fileName.includes('routine') ||
      fileName.includes('activity') ||
      (fileType.includes('csv') && fileName.includes('workout'));
  });

  const nutrition = files.filter(f => {
    const fileName = f.fileName.toLowerCase();
    
    return fileName.includes('food') ||
      fileName.includes('meal') ||
      fileName.includes('nutrition') ||
      f.fileType.startsWith('image/') || // Assume images are mostly food photos
      fileName.includes('diet') ||
      fileName.includes('calorie');
  });

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
