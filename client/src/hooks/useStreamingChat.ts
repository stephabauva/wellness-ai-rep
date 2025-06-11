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
}

export function useStreamingChat(options: StreamingChatOptions = {}) {
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshMessages, setStreamingActive } = useAppContext();

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
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

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
        setStreamingMessage(prev => prev ? {
          ...prev,
          content: prev.content + data.content,
          isStreaming: true
        } : {
          id: Date.now().toString(),
          content: data.content,
          isComplete: false,
          isStreaming: true
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
        
        // Mark streaming message as complete but keep it visible
        if (streamingMessage) {
          setStreamingMessage(prev => prev ? {
            ...prev,
            isComplete: true,
            isStreaming: false
          } : null);
        }

        if (options.onMessageComplete && data.aiMessage) {
          options.onMessageComplete(data.aiMessage);
        }

        // Implement robust message persistence with proper state coordination
        const handleStreamingComplete = async () => {
          console.log('[Streaming] Handling streaming completion for conversation:', data.conversationId);
          
          // Extract the conversation ID from the done event
          const completedConversationId = data.conversationId;
          
          // Keep streaming message visible during sync
          console.log('[Streaming] Keeping streaming message visible during database sync');
          
          // Wait for backend database operations to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Turn off streaming to enable normal loading
          console.log('[Streaming] Disabling streaming state to enable database loading');
          setStreamingActive(false);
          
          // Small delay for React state propagation
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Skip conversation context reset during completion to prevent flickering
          // The conversation context is already set correctly from the initial user_message_saved event
          
          // Wait for React state updates to propagate, then cleanup
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Clean up streaming message - AppContext useEffect will handle message loading
          console.log('[Streaming] Database sync complete, clearing streaming message');
          setStreamingMessage(null);
        };
        
        // Execute the completion handler
        handleStreamingComplete();
        
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
  }, [streamingMessage, options, queryClient, toast, refreshMessages]);

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
    stopStreaming
  };
}