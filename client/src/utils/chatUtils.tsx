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

export const generateMessagesToDisplay = (
  messages: Message[],
  pendingUserMessage: { content: string; timestamp: Date; attachments?: { name: string; type: string }[] } | null,
  currentConversationId: string | null,
  welcomeMessage: Message | null
): Message[] => {
  let messagesToDisplay: Message[] = [];

  console.log("Generating messages to display:", {
    messagesCount: messages?.length || 0,
    pendingUserMessage: !!pendingUserMessage,
    currentConversationId,
    hasWelcomeMessage: !!welcomeMessage,
    allMessages: messages?.map(m => ({ id: m.id, content: m.content.substring(0, 30) + '...', isUser: m.isUserMessage })),
    messagesContainWelcome: messages?.some(m => m.id === "welcome-message")
  });

  // Always prioritize showing pending message if it exists
  if (pendingUserMessage) {
    const pendingMessage: Message = {
      id: `pending-${Date.now()}`,
      content: pendingUserMessage.content,
      isUserMessage: true,
      timestamp: pendingUserMessage.timestamp,
      attachments: pendingUserMessage.attachments
    };

    // If we have a conversation with messages, add pending to existing messages
    if (currentConversationId && messages && messages.length > 0) {
      const conversationMessages = messages.filter(m => m.id !== "welcome-message");
      messagesToDisplay = [...conversationMessages, pendingMessage].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      console.log("Showing conversation messages with pending message");
    } else {
      // New conversation or empty conversation - show only pending message
      messagesToDisplay = [pendingMessage];
      console.log("Showing pending message only");
    }
  }
  // No pending message - show existing conversation or welcome
  else if (currentConversationId && messages && messages.length > 0) {
    const conversationMessages = messages.filter(m => m.id !== "welcome-message");
    if (conversationMessages.length > 0) {
      messagesToDisplay = [...conversationMessages].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      console.log("Showing conversation messages:", messagesToDisplay.length);
      console.log("Messages being displayed:", messagesToDisplay.map(m => ({ id: m.id, content: m.content.substring(0, 30) + '...', isUser: m.isUserMessage })));
    }
  }
  // Default: show welcome message if no conversation and no pending message
  else if (welcomeMessage) {
    messagesToDisplay = [welcomeMessage];
    console.log("Showing welcome message");
  }

  console.log("Final messages to display:", messagesToDisplay.length);
  console.log("Final message list:", messagesToDisplay.map(m => ({ id: m.id, content: m.content.substring(0, 30) + '...', isUser: m.isUserMessage })));
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