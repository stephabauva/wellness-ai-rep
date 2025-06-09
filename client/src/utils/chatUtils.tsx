import React from "react";
import { FileText, Image, Video, File } from "lucide-react";

type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

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
  pendingUserMessage: { content: string; timestamp: Date; attachments?: { name: string; type: string }[] } | null,
  currentConversationId: string | null,
  welcomeMessage: Message
): Message[] => {
  // Start with welcome message for new conversations
  let displayMessages: Message[] = [];

  if (!currentConversationId) {
    displayMessages = [welcomeMessage];
  } else if (messages) {
    displayMessages = [...messages];
  }

  // Add pending user message if it exists (this is the key for immediate display!)
  if (pendingUserMessage) {
    if (!currentConversationId) {
      // New conversation - replace welcome message with pending message
      displayMessages = [{
        id: "pending-user",
        content: pendingUserMessage.content,
        isUserMessage: true,
        timestamp: pendingUserMessage.timestamp,
        attachments: pendingUserMessage.attachments
      }];
    } else {
      // Existing conversation - append pending message
      displayMessages = [
        ...displayMessages,
        {
          id: "pending-user",
          content: pendingUserMessage.content,
          isUserMessage: true,
          timestamp: pendingUserMessage.timestamp,
          attachments: pendingUserMessage.attachments
        }
      ];
    }
  }

  return displayMessages;
};