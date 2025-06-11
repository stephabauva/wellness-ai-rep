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
  streamingMessage?: {
    id: string;
    content: string;
    isComplete: boolean;
    isStreaming: boolean;
  } | null;
  isThinking?: boolean;
}

export function MessageDisplayArea({
  messagesToDisplay,
  isLoading,
  streamingMessage,
  isThinking,
}: MessageDisplayAreaProps) {
  console.log("[MessageDisplayArea] Props received. messagesToDisplay count:", messagesToDisplay ? messagesToDisplay.length : 'undefined', "isLoading:", isLoading);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("[MessageDisplayArea useEffect scroll] messagesToDisplay count:", messagesToDisplay ? messagesToDisplay.length : 'undefined');
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesToDisplay, streamingMessage]);

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
      
      {/* AI thinking indicator - discrete design */}
      {isThinking && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
          </div>
          <div className="flex-1 bg-muted/50 rounded-lg p-2 px-3">
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Streaming message - only show if content exists and no regular message with same content */}
      {streamingMessage && streamingMessage.content && !messagesToDisplay.some(msg => !msg.isUserMessage && msg.content === streamingMessage.content) && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <div className="flex-1 bg-muted rounded-lg p-3">
            <div className="text-sm whitespace-pre-wrap">
              {streamingMessage.content}
              {streamingMessage.isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
              )}
            </div>
            {streamingMessage.isComplete && !streamingMessage.isStreaming && (
              <div className="text-xs text-muted-foreground mt-1 opacity-60">
                Saving...
              </div>
            )}
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
