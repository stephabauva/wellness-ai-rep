
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
  messages: any[],
  pendingUserMessage: any,
  currentConversationId: string | null,
  welcomeMessage: any
) => {
  let welcomeMessages = [welcomeMessage];
  let messagesToDisplay = messages && messages.length > 0 ? messages : welcomeMessages;

  if (pendingUserMessage) {
    if (!currentConversationId) {
      messagesToDisplay = [
        {
          id: "temp-pending",
          content: pendingUserMessage.content,
          isUserMessage: true,
          timestamp: pendingUserMessage.timestamp,
          attachments: pendingUserMessage.attachments,
        }
      ];
    } else {
      messagesToDisplay = [
        ...messagesToDisplay,
        {
          id: "temp-pending",
          content: pendingUserMessage.content,
          isUserMessage: true,
          timestamp: pendingUserMessage.timestamp,
          attachments: pendingUserMessage.attachments,
        }
      ];
    }
  }

  return messagesToDisplay;
};
