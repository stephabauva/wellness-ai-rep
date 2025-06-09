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
      const response = await fetch(`/api/conversations/${currentConversationId}/messages?_t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to fetch conversation messages");
      const convMessages = await response.json();
      console.log("Loaded messages for conversation:", currentConversationId, convMessages);
      
      // Ensure we have an array and properly format all messages
      const messagesArray = Array.isArray(convMessages) ? convMessages : [];
      const formattedMessages = messagesArray.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUserMessage: msg.role === "user",
        timestamp: new Date(msg.createdAt),
        attachments: msg.metadata?.attachments ? msg.metadata.attachments.map((att: any) => ({
          name: att.fileName || att.name || 'Unknown file',
          type: att.fileType || att.type
        })) : undefined
      }));
      
      // Sort messages by timestamp to ensure correct order
      formattedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      console.log("Formatted messages:", formattedMessages.length, formattedMessages);
      console.log("All messages in conversation:", formattedMessages.map(m => ({ id: m.id, content: m.content.substring(0, 50) + '...', isUser: m.isUserMessage })));
      
      return formattedMessages.length > 0 ? formattedMessages : [welcomeMessage];
    },
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    enabled: true // Always enable this query
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
          name: f.fileName || f.displayName || 'Unknown file', 
          type: f.fileType 
        }))
      });
    },
    onSuccess: (data) => {
      console.log("Message sent successfully:", data);

      // Clear pending message first
      setPendingUserMessage(null);

      // Always set conversation ID from response to ensure we have the correct one
      if (data.conversationId) {
        console.log("Setting conversation ID to:", data.conversationId);
        
        // Set the conversation ID first
        setConversationId(data.conversationId);
        
        // Trigger a fresh fetch for the conversation to get all messages
        // This ensures we get the complete conversation history
        queryClient.invalidateQueries({ 
          queryKey: ["messages", data.conversationId] 
        });
        
        // Invalidate the "new" query since we now have a conversation
        queryClient.invalidateQueries({ queryKey: ["messages", "new"] });
      }

      // Invalidate conversations list
      queryClient.invalidateQueries({ 
        queryKey: ["conversations"] 
      });
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
    
    // No need to invalidate - React Query will automatically refetch when the key changes
    // This eliminates race conditions and improves performance
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