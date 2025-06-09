
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
  // If we have a current conversation, show all messages from that conversation
  if (currentConversationId && messages && messages.length > 0) {
    let messagesToDisplay = messages;
    
    console.log(`Displaying ${messagesToDisplay.length} messages for conversation ${currentConversationId}`);
    messagesToDisplay.forEach((msg, index) => {
      if (msg.attachments && msg.attachments.length > 0) {
        console.log(`Message ${index} has ${msg.attachments.length} attachments:`, msg.attachments);
      }
    });

    // Always append pending message if it exists
    if (pendingUserMessage) {
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

    return messagesToDisplay;
  }

  // If no conversation ID (new chat), show welcome message or existing messages
  let messagesToDisplay = messages && messages.length > 0 ? messages : [welcomeMessage];

  // Always append pending message if it exists
  if (pendingUserMessage) {
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

  return messagesToDisplay;
};
