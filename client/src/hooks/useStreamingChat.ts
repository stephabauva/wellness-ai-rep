import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/AppContext';

interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  isStreaming: boolean;
}

interface StreamingChatOptions {
  onMessageComplete?: (message: any) => void;
  onConversationCreate?: (conversationId: string) => void;
  onUserMessageSent?: (userMessage: any) => void;
}

export function useStreamingChat(options: StreamingChatOptions = {}) {
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshMessages, setStreamingActive, addOptimisticMessage } = useAppContext();

  const startStreaming = useCallback(async (messageData: {
    content: string;
    conversationId?: string;
    coachingMode?: string;
    aiProvider?: string;
    aiModel?: string;
    attachments?: any[];
    automaticModelSelection?: boolean;
  }) => {
    try {
      // Prevent concurrent streaming
      if (isConnected) {
        console.log('[Streaming] Stream already active, ignoring request');
        return;
      }

      // Close existing connection
      if (eventSourceRef.current) {
        console.log('[Streaming] Closing existing EventSource');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // CHATGPT-STYLE FIX 1: Show user message immediately (optimistic UI)
      const userMessage = {
        id: `user-${Date.now()}`,
        content: messageData.content,
        isUserMessage: true,
        timestamp: new Date(),
        attachments: messageData.attachments?.map(att => ({
          name: att.fileName || att.name,
          type: att.fileType || att.type
        }))
      };
      
      console.log('[Streaming] CHATGPT-STYLE: Adding user message immediately');
      addOptimisticMessage(userMessage);
      setPendingUserMessage(userMessage);

      // Reset streaming state and start new stream
      setStreamingMessage(null);
      setStreamingActive(true);
      setIsThinking(true);

      // Send the message via POST to start streaming
      const response = await fetch('/api/messages/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      setIsConnected(true);
      setStreamingMessage({
        id: Date.now().toString(),
        content: '',
        isComplete: false,
        isStreaming: true
      });

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          setIsConnected(false);
          setIsThinking(false);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamEvent(data);
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }

    } catch (error) {
      console.error('Streaming error:', error);
      setIsConnected(false);
      setIsThinking(false);
      setStreamingMessage(null);
      toast({
        title: "Connection Error",
        description: "Failed to connect to AI service. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, queryClient]);

  const handleStreamEvent = useCallback((data: any) => {
    switch (data.type) {
      case 'start':
        setIsThinking(true);
        setStreamingActive(true);
        console.log('[Streaming] Started:', data.message);
        break;

      case 'thinking':
        setIsThinking(true);
        break;

      case 'user_message_saved':
        console.log('[Streaming] User message saved', data.conversationId);
        if (data.conversationId && options.onConversationCreate) {
          console.log('[Streaming] Triggering conversation creation callback');
          options.onConversationCreate(data.conversationId);
        }
        break;

      case 'ai_model_selected':
        console.log('[Streaming] AI model selected:', data.provider, data.model);
        break;

      case 'chunk':
        setIsThinking(false);
        
        // Ensure clean text accumulation without corruption
        const cleanChunk = data.content || '';
        
        setStreamingMessage(prev => {
          // Use a consistent ID for the current streaming session
          const streamingId = prev?.id || `ai-streaming-${Date.now()}`;
          const accumulatedContent = prev ? prev.content + cleanChunk : cleanChunk;
          
          const newMessage = {
            id: streamingId,
            content: accumulatedContent,
            isComplete: false,
            isStreaming: true
          };
          
          // Throttle optimistic updates for smooth performance
          if (addOptimisticMessage) {
            // Use requestIdleCallback for non-blocking updates
            if (window.requestIdleCallback) {
              window.requestIdleCallback(() => {
                const streamingAiMessage = {
                  id: streamingId,
                  content: accumulatedContent,
                  isUserMessage: false,
                  timestamp: new Date(),
                  attachments: []
                };
                addOptimisticMessage(streamingAiMessage);
              });
            } else {
              // Fallback for browsers without requestIdleCallback
              setTimeout(() => {
                const streamingAiMessage = {
                  id: streamingId,
                  content: accumulatedContent,
                  isUserMessage: false,
                  timestamp: new Date(),
                  attachments: []
                };
                addOptimisticMessage(streamingAiMessage);
              }, 0);
            }
          }
          
          return newMessage;
        });
        break;

      case 'complete':
        setIsThinking(false);
        setStreamingMessage(prev => prev ? {
          ...prev,
          content: data.fullResponse,
          isComplete: true,
          isStreaming: false
        } : null);
        break;

      case 'done':
        setIsConnected(false);
        setIsThinking(false);
        
        // CHATGPT-STYLE FIX 2: Commit streaming message to persistent state WITHOUT database reload
        if (streamingMessage && streamingMessage.content) {
          console.log('[Streaming] CHATGPT-STYLE: Committing streaming message to persistent state');
          const finalAiMessage = {
            id: data.messageId || streamingMessage.id, // Use server ID if available
            content: streamingMessage.content,
            isUserMessage: false,
            timestamp: new Date(),
            attachments: []
          };
          
          // Add final message to persistent state
          addOptimisticMessage(finalAiMessage);
          
          // Mark streaming as complete but keep message visible
          setStreamingMessage(prev => prev ? {
            ...prev,
            isComplete: true,
            isStreaming: false
          } : null);
        }

        if (options.onMessageComplete && data.aiMessage) {
          options.onMessageComplete(data.aiMessage);
        }

        // CHATGPT-STYLE FIX 3: Disable streaming state immediately to prevent DB reload
        console.log('[Streaming] CHATGPT-STYLE: Disabling streaming state to prevent DB reload');
        setStreamingActive(false);
        
        // CRITICAL: Clear UI states only AFTER persistence is complete
        setTimeout(() => {
          console.log('[Streaming] CHATGPT-STYLE: Clearing temporary UI states after persistence');
          setPendingUserMessage(null);
          // Keep streamingMessage briefly for smooth transition
          setTimeout(() => setStreamingMessage(null), 100);
        }, 50); // Minimal delay for persistence
        break;

      case 'error':
        setIsConnected(false);
        setIsThinking(false);
        setStreamingMessage(null);
        toast({
          title: "AI Error",
          description: data.message || "An error occurred while processing your message.",
          variant: "destructive",
        });
        break;

      default:
        console.log('[Streaming] Unknown event:', data);
    }
  }, [streamingMessage?.id, options.onMessageComplete, queryClient, toast, refreshMessages, addOptimisticMessage]);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsThinking(false);
    setStreamingMessage(null);
  }, []);

  return {
    streamingMessage,
    isConnected,
    isThinking,
    startStreaming,
    stopStreaming,
    pendingUserMessage
  };
}