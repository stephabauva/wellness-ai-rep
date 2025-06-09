import React, { useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ui/chat-message"; // Assuming this is the correct path
import { AttachedFile } from "@/hooks/useFileManagement"; // For message attachments type

// Import the Message type from utils to ensure consistency
type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

interface MessageDisplayAreaProps {
  messagesToDisplay: Message[];
  isLoading?: boolean; // To show a loader if messages are loading
}

export function MessageDisplayArea({
  messagesToDisplay,
  isLoading,
}: MessageDisplayAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesToDisplay]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messagesToDisplay && messagesToDisplay.map((message) => (
        <ChatMessage
          key={message.id}
          message={message.content}
          isUser={message.isUserMessage}
          timestamp={message.timestamp}
          // Map attachments to ChatMessage's expected format
          attachments={message.attachments?.map(att => ({
            name: att.name,
            type: att.type,
          }))}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
