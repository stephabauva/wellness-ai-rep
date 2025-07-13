import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";

// Phase 5: Message appearance animation styles
const messageAnimationStyles = `
  @keyframes messageAppear {
    0% {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .message-appear {
    animation: messageAppear 0.3s ease-out forwards;
  }
  
  .message-appear-delayed {
    opacity: 0;
    animation: messageAppear 0.3s ease-out forwards;
  }
`;

// Inject animation styles
if (typeof document !== 'undefined' && !document.getElementById('message-animation-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'message-animation-styles';
  styleElement.textContent = messageAnimationStyles;
  document.head.appendChild(styleElement);
}
import { ChatMessage } from "@/components/ui/chat-message";
import { AttachedFile } from "@shared/hooks/useFileManagement";
import { useVirtualScrolling } from "@/hooks/useVirtualScrolling";
import { useMessagePagination } from "@/hooks/useMessagePagination";
import { useWebWorker } from "@/hooks/useWebWorker";
import { Button } from "@shared/components/ui/button";
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
  
  // All refs first
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // All useState hooks together
  const [containerHeight, setContainerHeight] = useState(400);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [processedMessages, setProcessedMessages] = useState<any[]>([]);
  const [messageAnimationKeys, setMessageAnimationKeys] = useState<Set<string>>(new Set());

  // All useCallback hooks together
  const onWorkerMessage = useCallback((data: any) => {
    if (data.type === 'PARSE_MESSAGES') {
      setProcessedMessages(data.result);
    } else if (data.type === 'SEARCH_MESSAGES') {
      setProcessedMessages(data.result);
    }
  }, []);

  const onWorkerError = useCallback((error: any) => {
    console.error('[MessageDisplayArea] Worker error:', error);
  }, []);

  // Web Worker for heavy computations - always called
  const { postMessage: processMessages, isLoading: isProcessing } = useWebWorker({
    workerPath: '/src/workers/messageProcessor.ts',
    onMessage: onWorkerMessage,
    onError: onWorkerError
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

  // Stabilize virtual scrolling input to prevent hook violations
  const virtualScrollInput = useMemo(() => 
    enablePagination ? paginatedMessages : allDisplayMessages, 
    [enablePagination, paginatedMessages, allDisplayMessages]
  );

  // Virtual scrolling for performance - always call the hook
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll: handleVirtualScroll,
    scrollToIndex
  } = useVirtualScrolling(virtualScrollInput, {
    itemHeight: 120, // Approximate message height
    containerHeight,
    overscan: 5,
    dynamicHeight: true
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
      if (!showScrollToBottom && !enableVirtualScrolling) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (enableVirtualScrolling && allDisplayMessages.length > 0) {
        // For virtual scrolling, scroll to the last message
        scrollToIndex(allDisplayMessages.length - 1);
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [allDisplayMessages, showScrollToBottom, enableVirtualScrolling, scrollToIndex]);

  // Loading state content - avoid early return to prevent hook violations
  const loadingContent = (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading conversation...</p>
      </div>
    </div>
  );

  // Determine which messages to render based on optimization settings
  const messagesToRender = enableVirtualScrolling ? visibleItems : (enablePagination ? paginatedMessages : allDisplayMessages);

  console.log("[MessageDisplayArea] About to render. Messages:", messagesToRender?.length);

  // Track new messages for animation (Phase 5) - MOVED BEFORE LOADING CHECK
  useEffect(() => {
    if (messagesToRender && messagesToRender.length > 0) {
      const currentKeys = new Set(messagesToRender.map((msg: Message) => msg.id));
      const newKeys = new Set([...currentKeys].filter(key => !messageAnimationKeys.has(key)));
      
      if (newKeys.size > 0) {
        setMessageAnimationKeys(currentKeys);
      }
    }
  }, [messagesToRender, messageAnimationKeys]);

  const shouldAnimateMessage = useCallback((messageId: string, index: number) => {
    // Animate new messages that appear
    const isNew = !messageAnimationKeys.has(messageId);
    return isNew;
  }, [messageAnimationKeys]);

  // Use conditional rendering within return statement to prevent hook violations
  return isLoading ? loadingContent : (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4"
      onScroll={handleScroll}
      style={{ position: 'relative' }}
    >
      {enableVirtualScrolling ? (
        // Virtual scrolling implementation
        <div 
          className="virtual-scroll-container" 
          style={{ height: totalHeight, position: 'relative' }}
        >
          <div 
            className="virtual-scroll-content message-spacing"
            style={{ 
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {messagesToRender.map((message: Message, index: number) => {
              const isActivelyStreaming = message.id.startsWith('ai-streaming-') && !message.isUserMessage;
              
              const shouldAnimate = shouldAnimateMessage(message.id, index);
              
              return (
                <div 
                  key={message.id}
                  className={`virtual-scroll-item chat-message-optimized ${
                    shouldAnimate ? 'message-appear' : ''
                  }`}
                  data-index={index}
                  style={{
                    animationDelay: shouldAnimate ? `${Math.min(index * 50, 200)}ms` : '0ms'
                  }}
                >
                  <ChatMessage
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
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Standard rendering with optional pagination
        <div className="space-y-4">
          {messagesToRender && messagesToRender.length > 0 ? (
            messagesToRender.map((message: Message, index: number) => {
              const isActivelyStreaming = message.id.startsWith('ai-streaming-') && !message.isUserMessage;
              
              const shouldAnimate = shouldAnimateMessage(message.id, index);
              
              return (
                <div
                  key={message.id}
                  className={shouldAnimate ? 'message-appear' : ''}
                  style={{
                    animationDelay: shouldAnimate ? `${Math.min(index * 50, 200)}ms` : '0ms'
                  }}
                >
                  <ChatMessage
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
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[200px]">
              <p>No messages yet. Start a conversation!</p>
            </div>
          )}
          
          {/* Load more button for pagination */}
          {enablePagination && hasNextPage && (
            <div className="flex justify-center py-4">
              <Button 
                onClick={loadMore} 
                variant="outline" 
                disabled={isPaginationLoading}
                className={`flex items-center gap-2 ${isPaginationLoading ? 'pagination-loading' : ''}`}
              >
                {isPaginationLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    Loading earlier messages...
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Load Earlier Messages
                  </>
                )}
              </Button>
            </div>
          )}
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
      
      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <Button
          onClick={scrollToBottom}
          variant="outline"
          size="sm"
          className="scroll-to-bottom rounded-full shadow-lg bg-background/95 backdrop-blur-sm border-2"
        >
          <ChevronUp className="h-4 w-4 rotate-180" />
        </Button>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
