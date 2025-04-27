import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Zap } from "lucide-react";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp }) => {
  return (
    <div className={cn(
      "flex items-start",
      isUser && "justify-end"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 mr-4">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
      <div className={cn(
        "message-bubble p-4 shadow-sm",
        isUser ? "user-message" : "ai-message"
      )}>
        <div 
          className="prose prose-sm dark:prose-invert max-w-none" 
          dangerouslySetInnerHTML={{ 
            __html: message.replace(/\n/g, '<br>') 
          }} 
        />
        
        {/* Buttons for AI suggestions */}
        {!isUser && message.includes("stretching routine") && (
          <div className="mt-4 flex space-x-2">
            <button className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition-colors">
              View demonstration
            </button>
            <button className="px-4 py-2 bg-card border border-border text-foreground rounded-md text-sm hover:bg-muted transition-colors">
              Set reminder
            </button>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-2">
          {format(timestamp, 'h:mm a')}
        </div>
      </div>
    </div>
  );
};
