import React from "react";
import { Text } from 'react-native';
import {
  File,
  Image as ImageIcon, // Renamed to avoid conflict with RN Image component
  Video,
  FileText,
  AudioLines, // Changed from AudioWaveformIcon for lucide-react-native
} from 'lucide-react-native';

// TODO: RN-Adapt - Consider moving Message type to a shared types file if used across the app
type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

export const getFileIcon = (fileType: string): React.ReactNode => {
  const iconSize = 16; // Standard size for these inline icons
  const iconColor = "#555"; // Default color

  if (fileType.startsWith('image/')) {
    return <ImageIcon size={iconSize} color={iconColor} />;
  }
  if (fileType.startsWith('video/')) {
    return <Video size={iconSize} color={iconColor} />;
  }
  if (fileType.startsWith('audio/')) {
    return <AudioLines size={iconSize} color={iconColor} />;
  }
  if (fileType === 'application/pdf') {
    return <FileText size={iconSize} color="red" />; // Specific color for PDF
  }
  return <File size={iconSize} color={iconColor} />;
};

export const formatTime = (timestamp: Date | string) => {
  let dateObject: Date;
  if (timestamp instanceof Date) {
    dateObject = timestamp;
  } else {
    dateObject = new Date(timestamp);
  }

  if (isNaN(dateObject.getTime())) {
    return "Invalid Date";
  }
  return dateObject.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const chatUtils = {
  getFileIcon,
  formatTime
};

export default chatUtils;
