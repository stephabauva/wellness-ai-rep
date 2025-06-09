import React from "react";
import { 
  FileIcon, 
  ImageIcon, 
  VideoIcon, 
  FileTextIcon,
  AudioWaveformIcon
} from "lucide-react";

type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

export const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4 text-blue-500" />;
  }
  if (fileType.startsWith('video/')) {
    return <VideoIcon className="h-4 w-4 text-purple-500" />;
  }
  if (fileType.startsWith('audio/')) {
    return <AudioWaveformIcon className="h-4 w-4 text-green-500" />;
  }
  if (fileType === 'application/pdf') {
    return <FileTextIcon className="h-4 w-4 text-red-500" />;
  }
  return <FileIcon className="h-4 w-4 text-gray-500" />;
};

// generateMessagesToDisplay function removed

export const formatTime = (timestamp: Date) => {
  if (!timestamp || !(timestamp instanceof Date)) {
    return "";
  }
  return timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Default export as an object containing all the utilities
const chatUtils = {
  getFileIcon,
  // generateMessagesToDisplay, // Removed
  formatTime
};

export default chatUtils;