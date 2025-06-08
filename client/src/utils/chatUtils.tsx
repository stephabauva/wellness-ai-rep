import React from "react";
import { FileText, Image, Video, File } from "lucide-react";

export const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />;
  if (
    fileType.includes("pdf") ||
    fileType.includes("document") ||
    fileType.includes("text")
  ) {
    return <FileText className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
};

export const generateMessagesToDisplay = (
  messages: Message[] | undefined,
  pendingUserMessage: { content: string; timestamp: Date; attachments?: any[] } | null,
  currentConversationId: string | null,
  welcomeMessage: Message
) => {
  // If no conversation is selected (new chat), show welcome message
  if (!currentConversationId) {
    if (pendingUserMessage) {
      // User has sent a message in new chat - show pending message instead of welcome
      return [
        {
          id: "temp-pending",
          content: pendingUserMessage.content,
          isUserMessage: true,
          timestamp: pendingUserMessage.timestamp,
          attachments: pendingUserMessage.attachments
        }
      ];
    }
    return [welcomeMessage];
  }

  // For existing conversations, always show messages
  // If messages is undefined (loading), show empty array to prevent flicker
  // If messages is an array (loaded), show all messages
  let messagesToDisplay = Array.isArray(messages) ? [...messages] : [];

  // Add pending message if exists
  if (pendingUserMessage) {
    messagesToDisplay = [
      ...messagesToDisplay,
      {
        id: "temp-pending",
        content: pendingUserMessage.content,
        isUserMessage: true,
        timestamp: pendingUserMessage.timestamp,
        attachments: pendingUserMessage.attachments
      }
    ];
  }

  return messagesToDisplay;
};