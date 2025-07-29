import React from "react";
import { cn } from "@shared";
import { format } from "date-fns";
import { Zap } from "lucide-react";
import { StreamingText } from "@/components/StreamingText";

interface Attachment {
  name: string;
  type: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  attachments?: Attachment[];
  isStreaming?: boolean;
  isStreamingComplete?: boolean;
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

export const ChatMessage = React.memo<ChatMessageProps>(({ 
  message, 
  isUser, 
  timestamp, 
  attachments, 
  isStreaming = false, 
  isStreamingComplete = false 
}) => {
  return (
    <div className={cn(
      "flex items-start px-4 mb-6",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className={cn(
          "flex-shrink-0",
          isUser ? "ml-3" : "mr-3"
        )}>
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg transform-gpu transition-all duration-300 ease-out hover:scale-110 hover:rotate-12">
            <Zap className="h-5 w-5 text-white" />
          </div>
        </div>
      )}
      <div className={cn(
        "p-4 max-w-[85%] transform-gpu transition-all duration-300 ease-out",
        isUser 
          ? "bg-blue-500 hover:bg-blue-600 text-white rounded-2xl rounded-br-md shadow-md hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]" 
          : "bg-white/95 dark:bg-gray-800/95 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-sm border border-gray-200/80 dark:border-gray-700/80 hover:shadow-md hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] backdrop-blur-sm"
      )}>
        {attachments && attachments.length > 0 && (
          <div className="mb-4 space-y-3">
            {attachments.map((attachment, index) => (
              <div key={index} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700/20 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md">
                {attachment.type.startsWith("image/") ? (
                  <img
                    src={`/uploads/${attachment.name}`}
                    alt={attachment.name}
                    className="w-40 h-40 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      {getFileIcon(attachment.type)}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{attachment.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {!isUser && isStreaming ? (
            <StreamingText 
              content={message || ''} 
              isComplete={isStreamingComplete} 
            />
          ) : (
            <div 
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: (message || '').replace(/\n/g, '<br>') 
              }} 
            />
          )}
        </div>

        {/* Buttons for AI suggestions */}
        {!isUser && message && message.includes("stretching routine") && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm min-h-[44px] transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95">
              View demonstration
            </button>
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm min-h-[44px] transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg active:scale-95">
              Set reminder
            </button>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 opacity-75">
          {format(timestamp, 'h:mm a')}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.message === nextProps.message &&
    prevProps.isUser === nextProps.isUser &&
    prevProps.timestamp.getTime() === nextProps.timestamp.getTime() &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.isStreamingComplete === nextProps.isStreamingComplete &&
    JSON.stringify(prevProps.attachments) === JSON.stringify(nextProps.attachments)
  );
});