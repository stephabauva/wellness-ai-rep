import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast'; // Adjusted path
import { useAppContext } from '../context/AppContext'; // Adjusted path
import { API_CONFIG } from '../config/api'; // Import API_CONFIG for direct fetch

interface StreamingMessage {
  id: string;
  content: string;
  isComplete: boolean;
  isStreaming: boolean;
}

interface StreamingChatOptions {
  onMessageComplete?: (message: any) => void; // message type can be more specific
  onConversationCreate?: (conversationId: string) => void;
  onUserMessageSent?: (userMessage: any) => void; // message type can be more specific
}

// TODO: RN-Adapt - Review and test stream handling thoroughly in React Native environment.
// While fetch with ReadableStream is standard, RN's implementation details might have quirks.
export function useStreamingChat(options: StreamingChatOptions = {}) {
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<any>(null); // Type can be more specific
  // eventSourceRef was removed as the implementation uses fetch streaming
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshMessages, setStreamingActive, addOptimisticMessage } = useAppContext();

  const startStreaming = useCallback(async (messageData: {
    content: string;
    conversationId?: string;
    coachingMode?: string;
    aiProvider?: string;
    aiModel?: string;
    attachments?: any[]; // Type can be more specific
    automaticModelSelection?: boolean;
  }) => {
    try {
      if (isConnected) {
        console.log('[Streaming] Stream already active, ignoring request');
        return;
      }

      console.log('[Streaming] Starting stream (RN)');
      setPendingUserMessage(null);
      setStreamingMessage(null);
      setStreamingActive(true);
      setIsThinking(true);

      // The initial POST request to start the stream.
      // postToApi itself does not handle the streaming response part, only the initial request.
      // The fetch call for actual streaming needs to be separate if postToApi auto-reads/closes the body.
      // For now, let's assume the server sends a specific signal or header if it's upgrading to SSE,
      // and the actual SSE connection is then established.
      // OR, if postToApi can be modified to return the raw Response object for stream handling:
      // This current implementation of postToApi reads response.json(), so it's not suitable for direct SSE.
      // Using direct fetch for the streaming endpoint.
      const response = await fetch(`${API_CONFIG.baseUrl}/messages/stream`, {
        method: 'POST',
        headers: { ...API_CONFIG.defaultHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
        // TODO: RN-Adapt - Add AbortController signal for this fetch if stopStreaming needs to abort it.
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to start streaming' }));
        throw new Error(errorBody.message || 'Failed to start streaming');
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setIsConnected(true);
      setStreamingMessage({ id: Date.now().toString(), content: '', isComplete: false, isStreaming: true });

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
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleStreamEvent(data);
            } catch (e) {
              console.warn('Failed to parse SSE-like data chunk:', line, e);
            }
          }
        }
      }

    } catch (error) {
      console.error('Streaming error (RN):', error);
      setIsConnected(false);
      setIsThinking(false);
      setStreamingMessage(null);
      setStreamingActive(false); // Ensure streaming state is reset on error
      toast({
        title: "Connection Error",
        description: (error instanceof Error ? error.message : "Failed to connect to AI service.") + " Please try again.",
        variant: "destructive",
      });
    }
  // Ensure all dependencies for useCallback are listed
  }, [toast, queryClient, isConnected, setStreamingActive, addOptimisticMessage, API_CONFIG.baseUrl, API_CONFIG.defaultHeaders]);

  const handleStreamEvent = useCallback((data: any) => { // data type can be more specific
    switch (data.type) {
      case 'start':
        setIsThinking(true);
        setStreamingActive(true);
        console.log('[Streaming] Started (RN):', data.message);
        break;
      case 'thinking':
        setIsThinking(true);
        break;
      case 'user_message_saved':
        console.log('[Streaming] User message saved (RN)', data.conversationId);
        if (data.conversationId && options.onConversationCreate) {
          options.onConversationCreate(data.conversationId);
        }
        break;
      case 'ai_model_selected':
        console.log('[Streaming] AI model selected (RN):', data.provider, data.model);
        break;
      case 'chunk':
        setIsThinking(false);
        const cleanChunk = data.content || '';
        setStreamingMessage(prev => {
          const streamingId = prev?.id || `ai-streaming-${Date.now()}`;
          const accumulatedContent = prev ? prev.content + cleanChunk : cleanChunk;
          const streamingAiMessage = {
            id: streamingId, content: accumulatedContent, isUserMessage: false, timestamp: new Date(), attachments: []
          };
          setTimeout(() => { if (addOptimisticMessage) addOptimisticMessage(streamingAiMessage); }, 0);
          return { id: streamingId, content: accumulatedContent, isComplete: false, isStreaming: true };
        });
        break;
      case 'complete': // Server indicates it has sent all data for this response part
        setIsThinking(false);
        setStreamingMessage(prev => prev ? { ...prev, content: data.fullResponse, isComplete: true, isStreaming: false } : null);
        break;
      case 'done': // Entire stream interaction is finished
        setIsConnected(false);
        setIsThinking(false);
        if (streamingMessage && streamingMessage.content) {
          const finalAiMessage = {
            id: data.messageId || streamingMessage.id, content: streamingMessage.content, isUserMessage: false, timestamp: new Date(), attachments: []
          };
          addOptimisticMessage(finalAiMessage);
          setStreamingMessage(prev => prev ? { ...prev, isComplete: true, isStreaming: false } : null);
        }
        if (options.onMessageComplete && data.aiMessage) {
          options.onMessageComplete(data.aiMessage);
        }
        setStreamingActive(false);
        setTimeout(() => {
          setPendingUserMessage(null);
          // Keep streamingMessage briefly for UI transition, then clear
          // setTimeout(() => setStreamingMessage(null), 100); // Or clear if not needed
        }, 50);
        break;
      case 'error':
        setIsConnected(false);
        setIsThinking(false);
        setStreamingMessage(null);
        setStreamingActive(false); // Ensure streaming state is reset
        toast({
          title: "AI Error",
          description: data.message || "An error occurred while processing your message.",
          variant: "destructive",
        });
        break;
      default:
        console.log('[Streaming] Unknown event (RN):', data);
    }
  }, [streamingMessage, options.onMessageComplete, options.onConversationCreate, queryClient, toast, refreshMessages, addOptimisticMessage, setStreamingActive]); // Added dependencies

  const stopStreaming = useCallback(() => {
    // TODO: RN-Adapt - If fetch is used, aborting involves AbortController.
    // This current logic implies EventSource, which was removed.
    // For fetch, an AbortController signal should be passed to fetch and controller.abort() called here.
    // This needs to be implemented if manual stop is required during fetch streaming.
    console.warn("[Streaming] stopStreaming() called, but manual fetch abort not yet implemented in this version for RN.");
    setIsConnected(false);
    setIsThinking(false);
    setStreamingMessage(null);
    setStreamingActive(false);
  }, [setStreamingActive]);

  return {
    streamingMessage,
    isConnected,
    isThinking,
    startStreaming,
    stopStreaming, // Needs implementation for fetch abort
    pendingUserMessage
  };
}
