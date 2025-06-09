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
  messages: any[] = [],
  pendingUserMessage: any,
  currentConversationId: string | null,
  welcomeMessage: any
) => {
  // If we have a conversation ID, we're in an active conversation
  if (currentConversationId) {
    // Start with existing messages (or empty array if still loading)
    const conversationMessages = messages ? [...messages] : [];

    // Add pending message if it exists
    if (pendingUserMessage) {
      conversationMessages.push({
        id: "pending-user",
        content: pendingUserMessage.content,
        isUserMessage: true,
        timestamp: pendingUserMessage.timestamp,
        attachments: pendingUserMessage.attachments?.map(att => ({
          name: att.name,
          type: att.type
        }))
      });
    }

    return conversationMessages;
  }

  // For new conversations (no ID), show welcome message and any pending
  const newConversationMessages = [welcomeMessage];

  if (pendingUserMessage) {
    newConversationMessages.push({
      id: "pending-user",
      content: pendingUserMessage.content,
      isUserMessage: true,
      timestamp: pendingUserMessage.timestamp,
      attachments: pendingUserMessage.attachments?.map(att => ({
        name: att.name,
        type: att.type
      }))
    });
  }

  return newConversationMessages;
};