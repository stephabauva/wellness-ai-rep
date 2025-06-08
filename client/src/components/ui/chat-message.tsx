import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Zap } from "lucide-react";

interface Attachment {
  name: string;
  type: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  attachments?: Attachment[];
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return <Zap className="h-4 w-4" />;
  if (fileType.startsWith("video/")) return <Zap className="h-4 w-4" />;
  if (
    fileType.includes("pdf") ||
    fileType.includes("document") ||
    fileType.includes("text")
  ) {
    return <Zap className="h-4 w-4" />;
  }
  return <Zap className="h-4 w-4" />;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp, attachments }) => {
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
        {attachments && attachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="rounded border p-2 bg-background/10">
                {attachment.type.startsWith("image/") ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getFileIcon(attachment.type)}
                      <span className="text-xs font-medium">{attachment.name}</span>
                    </div>
                    <img
                      src={`/uploads/${attachment.name}`}
                      alt={attachment.name}
                      className="w-32 h-32 object-cover rounded border"
                      onError={(e) => {
                        // If image fails to load, hide it
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {getFileIcon(attachment.type)}
                    <span className="text-xs">{attachment.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div 
          className="prose prose-sm dark:prose-invert max-w-none" 
          dangerouslySetInnerHTML={{ 
            __html: (message || '').replace(/\n/g, '<br>') 
          }} 
        />

        {/* Buttons for AI suggestions */}
        {!isUser && message && message.includes("stretching routine") && (
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