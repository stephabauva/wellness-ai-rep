import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAppContext } from '@/context/AppContext';
import type { AttachedFile } from './useFileManagement';

type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

const welcomeMessage: Message = {
  id: "welcome-message",
  content:
    "Welcome to your AI wellness coach! I'm here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you're focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I'm ready to help. What would you like to work on today?",
  isUserMessage: false,
  timestamp: new Date(),
};

export const useChatMessages = () => {
  const { coachingMode } = useAppContext();
  const [currentConversationId, setConversationId] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<{
    content: string;
    timestamp: Date;
    attachments?: { name: string; type: string }[];
  } | null>(null);

  type SendMessageParams = {
    content: string;
    attachments: AttachedFile[];
    conversationId: string | null;
    aiProvider?: string;
    aiModel?: string;
    automaticModelSelection?: boolean;
  }

  const {
    data: messages,
    isLoading: loadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ["messages", currentConversationId || "new"],
    queryFn: async () => {
      if (!currentConversationId) {
        return [welcomeMessage];
      }
      const response = await fetch(`/api/conversations/${currentConversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch conversation messages");
      const convMessages = await response.json();
      console.log("Loaded messages for conversation:", currentConversationId, convMessages);
      const formattedMessages = Array.isArray(convMessages) ? convMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUserMessage: msg.role === "user",
        timestamp: new Date(msg.createdAt),
        attachments: msg.metadata?.attachments ? msg.metadata.attachments.map((att: any) => ({
          name: att.fileName || att.name,
          type: att.fileType || att.type
        })) : undefined
      })) : [];
      
      console.log("Formatted messages:", formattedMessages.length, formattedMessages);
      return formattedMessages.length > 0 ? formattedMessages : [welcomeMessage];
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    enabled: true, // Always enable this query
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments, conversationId, aiProvider, aiModel, automaticModelSelection }: SendMessageParams) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          attachments, 
          conversationId,
          aiProvider: aiProvider || "openai",
          aiModel: aiModel || "gpt-4o",
          automaticModelSelection: automaticModelSelection || false
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return await response.json();
    },
    onMutate: async ({ content, attachments }) => {
      // Set pending message for immediate display
      setPendingUserMessage({
        content,
        timestamp: new Date(),
        attachments: attachments?.map(f => ({ 
          name: f.fileName || f.displayName, 
          type: f.fileType 
        }))
      });
    },
    onSuccess: (data) => {
      console.log("Message sent successfully:", data);

      const conversationId = data.conversationId || currentConversationId;

      // Set conversation ID if it's a new conversation
      if (data.conversationId && !currentConversationId) {
        console.log("Setting conversation ID to:", data.conversationId);
        setConversationId(data.conversationId);
      }

      // Clear pending message
      setPendingUserMessage(null);

      // Invalidate and refetch immediately
      queryClient.invalidateQueries({ 
        queryKey: ["messages"] 
      });

      queryClient.invalidateQueries({ 
        queryKey: ["conversations"] 
      });

      // Force immediate refetch with correct conversation ID
      queryClient.refetchQueries({ 
        queryKey: ["messages", conversationId] 
      });

      // Secondary refetch to ensure data consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ["messages", conversationId] 
        });
        queryClient.refetchQueries({ 
          queryKey: ["messages", conversationId] 
        });
      }, 200);
    },
    onError: (error) => {
      console.error("Message send error:", error);

      // Clear pending message on error
      setPendingUserMessage(null);
    },
  });

  const handleSelectConversation = (conversationId: string) => {
    setConversationId(conversationId);
  };

  const handleNewChat = () => {
    setConversationId(null);
    queryClient.invalidateQueries({ queryKey: ["messages", "new"] });
  };

  const setCurrentConversationId = useCallback((conversationId: string | null) => {
    console.log("Switching to conversation:", conversationId);
    setConversationId(conversationId);
    setPendingUserMessage(null);

    // Clear all message cache and force fresh fetch
    queryClient.invalidateQueries({ 
      queryKey: ["messages"] 
    });

    // Force immediate refetch for the new conversation
    if (conversationId) {
      queryClient.refetchQueries({ 
        queryKey: ["messages", conversationId] 
      });
    } else {
      queryClient.refetchQueries({ 
        queryKey: ["messages", "new"] 
      });
    }
  }, []);

  return {
    messages: messages || [],
    loadingMessages,
    currentConversationId,
    sendMessageMutation,
    handleSelectConversation,
    handleNewChat,
    pendingUserMessage,
    welcomeMessage,
    setCurrentConversationId,
  };
};