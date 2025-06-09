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
): Message[] => {
  if (!currentConversationId) {
    const messagesToShow = [welcomeMessage];

    if (pendingUserMessage) {
      messagesToShow.push({
        id: "pending-user",
        content: pendingUserMessage.content,
        isUserMessage: true,
        timestamp: pendingUserMessage.timestamp && !isNaN(pendingUserMessage.timestamp.getTime()) 
          ? pendingUserMessage.timestamp 
          : new Date(),
        attachments: pendingUserMessage.attachments
      });
    }

    return messagesToShow;
  }

  const messagesToShow = messages || [];

  if (pendingUserMessage) {
    const pendingMessage: Message = {
      id: "pending-user",
      content: pendingUserMessage.content,
      isUserMessage: true,
      timestamp: pendingUserMessage.timestamp && !isNaN(pendingUserMessage.timestamp.getTime()) 
        ? pendingUserMessage.timestamp 
        : new Date(),
      attachments: pendingUserMessage.attachments
    };
    return [...messagesToShow, pendingMessage];
  }

  return messagesToShow;
};