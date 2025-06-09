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
  messages: Message[],
  pendingUserMessage: string | null,
  currentConversationId: string | null,
  welcomeMessage: Message | null
): Message[] => {
  let messagesToDisplay: Message[] = [];

  console.log("Generating messages to display:", {
    messagesCount: messages?.length || 0,
    pendingUserMessage: !!pendingUserMessage,
    currentConversationId,
    hasWelcomeMessage: !!welcomeMessage
  });

  // If we have a current conversation, show its messages
  if (currentConversationId && messages && messages.length > 0) {
    // Sort messages by timestamp to ensure correct order
    messagesToDisplay = [...messages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    console.log("Showing conversation messages:", messagesToDisplay.length);
  } 
  // If no conversation but we have a welcome message, show it
  else if (!currentConversationId && welcomeMessage) {
    messagesToDisplay = [welcomeMessage];
    console.log("Showing welcome message");
  }

  // Add pending user message if it exists
  if (pendingUserMessage) {
    const pendingMessage: Message = {
      id: `pending-${Date.now()}`,
      userId: 1,
      conversationId: currentConversationId || 'pending',
      content: pendingUserMessage,
      isUserMessage: true,
      timestamp: new Date().toISOString(),
      attachments: []
    };
    messagesToDisplay = [...messagesToDisplay, pendingMessage];
    console.log("Added pending message");
  }

  console.log("Final messages to display:", messagesToDisplay.length);
  return messagesToDisplay;
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

// Default export as an object containing all the utilities
const chatUtils = {
  getFileIcon,
  generateMessagesToDisplay,
  formatTime
};

export default chatUtils;