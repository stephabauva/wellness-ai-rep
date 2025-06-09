import React from "react";
import { Avatar, AvatarFallback } from "./avatar";
import { Badge } from "./badge";
import { getFileIcon } from "@/utils/chatUtils";
import { Bot, User } from "lucide-react";

interface Attachment {
  name: string;
  type: string;
  fileName?: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  attachments?: Attachment[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  timestamp,
  attachments
}) => {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTimestamp = (timestamp: Date) => {
    // Validate the date before formatting
    if (!timestamp || isNaN(timestamp.getTime())) {
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-blue-100" : "bg-green-100"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'AI Coach'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(timestamp)}
          </span>
        </div>

        {/* Display attachments if present */}
        {attachments && attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-1">
                {attachment.type.startsWith("image/") ? (
                  <div className="relative">
                    <img
                      src={`/uploads/${attachment.fileName || attachment.name}?t=${Date.now()}`}
                      alt={attachment.name}
                      className="max-w-64 max-h-48 rounded-lg object-cover border border-gray-200"
                      onLoad={() => {
                        console.log(`Image loaded successfully: ${attachment.fileName || attachment.name}`);
                      }}
                      onError={(e) => {
                        console.error(`Failed to load image: ${attachment.fileName || attachment.name}`);
                        // Fallback to badge if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const badge = target.nextElementSibling as HTMLElement;
                        if (badge) badge.style.display = 'flex';
                      }}
                    />
                    <Badge variant="secondary" className="hidden items-center gap-1 mt-1">
                      {getFileIcon(attachment.type)}
                      <span className="text-xs truncate max-w-32">
                        {attachment.name}
                      </span>
                    </Badge>
                  </div>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getFileIcon(attachment.type)}
                    <span className="text-xs truncate max-w-32">
                      {attachment.name}
                    </span>
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Display message content */}
        {message && (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              isUser
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
            }`}
          >
            <div className="whitespace-pre-wrap break-words">
              {message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};