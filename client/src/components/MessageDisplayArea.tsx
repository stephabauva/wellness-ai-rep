import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { ChatMessage } from "@/components/ui/chat-message";
import { AttachedFile } from "@/hooks/useFileManagement";
import { useVirtualScrolling } from "@/hooks/useVirtualScrolling";
import { useMessagePagination } from "@/hooks/useMessagePagination";
import { useWebWorker } from "@/hooks/useWebWorker";
import { Button } from "@/components/ui/button";
import { ChevronUp, Search } from "lucide-react";

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
  isLoading?: boolean;
  streamingMessage?: {
    id: string;
    content: string;
    isComplete: boolean;
    isStreaming: boolean;
  } | null;
  isThinking?: boolean;
  enableVirtualScrolling?: boolean;
  enablePagination?: boolean;
  searchQuery?: string;
}

export function MessageDisplayArea({
  messagesToDisplay,
  isLoading,
  streamingMessage,
  isThinking,
  enableVirtualScrolling = false,
  enablePagination = false,
  searchQuery = "",
}: MessageDisplayAreaProps) {
  console.log("[MessageDisplayArea] Props received. messagesToDisplay count:", messagesToDisplay ? messagesToDisplay.length : 'undefined', "isLoading:", isLoading);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [processedMessages, setProcessedMessages] = useState<any[]>([]);

  // Web Worker for heavy computations
  const { postMessage: processMessages, isLoading: isProcessing } = useWebWorker({
    workerPath: '/src/workers/messageProcessor.ts',
    onMessage: useCallback((data: any) => {
      if (data.type === 'PARSE_MESSAGES') {
        setProcessedMessages(data.result);
      } else if (data.type === 'SEARCH_MESSAGES') {
        setProcessedMessages(data.result);
      }
    }, []),
    onError: useCallback((error: any) => {
      console.error('[MessageDisplayArea] Worker error:', error);
    }, [])
  });

  // Process messages with optimizations
  const allDisplayMessages = useMemo(() => {
    console.log("[MessageDisplayArea] Processing messages:", messagesToDisplay?.length, messagesToDisplay);
    if (!messagesToDisplay || messagesToDisplay.length === 0) {
      console.log("[MessageDisplayArea] No messages to display");
      return [];
    }
    
    const sortedMessages = [...messagesToDisplay].sort((a: Message, b: Message) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return aTime - bTime;
    });
    
    console.log("[MessageDisplayArea] Sorted messages:", sortedMessages.length, sortedMessages);
    
    // Use Web Worker for heavy processing if there are many messages
    if (sortedMessages.length > 50) {
      processMessages({
        type: searchQuery ? 'SEARCH_MESSAGES' : 'PARSE_MESSAGES',
        payload: searchQuery ? { messages: sortedMessages, query: searchQuery } : { messages: sortedMessages },
        id: `process-${Date.now()}`
      });
      return processedMessages.length > 0 ? processedMessages : sortedMessages;
    }
    
    return sortedMessages;
  }, [messagesToDisplay, searchQuery, processedMessages, processMessages]);

  // Pagination for large message sets
  const {
    currentItems: paginatedMessages,
    loadMore,
    hasNextPage,
    isLoading: isPaginationLoading
  } = useMessagePagination(allDisplayMessages, {
    pageSize: 50,
    initialPage: 1
  });

  // Virtual scrolling for performance
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll: handleVirtualScroll,
    scrollToIndex
  } = useVirtualScrolling(enablePagination ? paginatedMessages : allDisplayMessages, {
    itemHeight: 120, // Approximate message height
    containerHeight,
    overscan: 5
  });

  // Container height measurement
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Scroll to bottom functionality
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollToBottom(!isNearBottom);
    
    if (enableVirtualScrolling) {
      handleVirtualScroll(event);
    }
  }, [enableVirtualScrolling, handleVirtualScroll]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll effect with performance optimization
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!showScrollToBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [allDisplayMessages, showScrollToBottom]);

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

  // Determine which messages to render based on optimization settings
  const messagesToRender = enableVirtualScrolling ? visibleItems : (enablePagination ? paginatedMessages : allDisplayMessages);

  console.log("[MessageDisplayArea] About to render. Messages:", messagesToRender?.length);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {allDisplayMessages && allDisplayMessages.length > 0 ? (
        allDisplayMessages.map((message: Message, index: number) => {
          const isActivelyStreaming = message.id.startsWith('ai-streaming-') && !message.isUserMessage;
          
          return (
            <ChatMessage
              key={message.id}
              message={message.content}
              isUser={message.isUserMessage}
              timestamp={message.timestamp}
              isStreaming={isActivelyStreaming}
              isStreamingComplete={false}
              attachments={message.attachments?.map((att: any) => ({
                name: att.name,
                type: att.type,
              }))}
            />
          );
        })
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
      
      {/* AI thinking indicator */}
      {isThinking && !allDisplayMessages.some(msg => msg.id.startsWith('ai-streaming-')) && (
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
      
      <div ref={messagesEndRef} />
    </div>
  );
}
