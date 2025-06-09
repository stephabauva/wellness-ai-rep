
import React from "react";
import { 
  FileIcon, 
  ImageIcon, 
  VideoIcon, 
  FileTextIcon,
  AudioWaveformIcon
} from "lucide-react";

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

export const generateMessagesToDisplay = (
  messages: any[] = [],
  pendingUserMessage: any = null,
  currentConversationId: string | null,
  welcomeMessage: any
) => {
  // Ensure messages is an array
  const safeMessages = Array.isArray(messages) ? messages : [];
  
  // If we have a conversation ID, show the real messages
  if (currentConversationId) {
    const result = [...safeMessages];
    
    // Add pending message if it exists
    if (pendingUserMessage) {
      result.push({
        id: `pending-${Date.now()}`,
        content: pendingUserMessage.content,
        isUserMessage: true,
        timestamp: pendingUserMessage.timestamp,
        attachments: pendingUserMessage.attachments
      });
    }
    
    return result;
  }
  
  // For new conversations, show welcome message and pending message
  const result = [];
  
  // Add welcome message for new conversations
  if (welcomeMessage) {
    result.push(welcomeMessage);
  }
  
  // Add pending message if it exists
  if (pendingUserMessage) {
    result.push({
      id: `pending-${Date.now()}`,
      content: pendingUserMessage.content,
      isUserMessage: true,
      timestamp: pendingUserMessage.timestamp,
      attachments: pendingUserMessage.attachments
    });
  }
  
  return result;
};

export const formatTime = (timestamp: Date) => {
  if (!timestamp || !(timestamp instanceof Date)) {
    return "";
  }
  return timestamp.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};
