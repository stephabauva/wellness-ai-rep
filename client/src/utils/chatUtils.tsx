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
  pendingUserMessage: any,
  currentConversationId: string | null,
  welcomeMessage: Message
): Message[] => {
  if (!messages) return [welcomeMessage];

  // For new conversations (no conversation ID), show welcome message
  if (!currentConversationId) {
    return messages.length > 0 ? messages : [welcomeMessage];
  }

  // For existing conversations, show actual messages from cache
  return messages.length > 0 ? messages : [welcomeMessage];
};