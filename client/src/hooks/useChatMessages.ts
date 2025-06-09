
import { useState } from 'react';
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
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
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

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", currentConversationId || "new"],
    queryFn: async () => {
      if (!currentConversationId) {
        return [welcomeMessage];
      }
      const response = await fetch(`/api/conversations/${currentConversationId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch conversation messages");
      const convMessages = await response.json();
      return convMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUserMessage: msg.role === "user",
        timestamp: new Date(msg.createdAt),
        attachments: msg.metadata?.attachments ? msg.metadata.attachments.map((att: any) => ({
          name: att.fileName || att.name,
          type: att.fileType || att.type
        })) : undefined
      }));
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
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

      // Clear pending message
      setPendingUserMessage(null);

      // Update conversation ID if this was a new conversation
      if (data.conversationId && !currentConversationId) {
        console.log("Setting conversation ID to:", data.conversationId);
        setCurrentConversationId(data.conversationId);
      }

      // Update the cache with the real server response
      const targetQueryKey = ["messages", data.conversationId];

      queryClient.setQueryData(targetQueryKey, (old: Message[] = []) => {
        const existingMessages = Array.isArray(old) ? old : [];
        
        // Filter out welcome message if this is a real conversation
        const filteredMessages = data.conversationId ? 
          existingMessages.filter(msg => msg.id !== "welcome-message") : 
          existingMessages;
        
        return [
          ...filteredMessages,
          {
            id: data.userMessage.id,
            content: data.userMessage.content,
            isUserMessage: true,
            timestamp: new Date(data.userMessage.timestamp),
            attachments: data.userMessage.metadata?.attachments?.map((att: any) => ({
              name: att.fileName || att.name,
              type: att.fileType || att.type
            }))
          },
          {
            id: data.aiMessage.id,
            content: data.aiMessage.content,
            isUserMessage: false,
            timestamp: new Date(data.aiMessage.timestamp),
            attachments: data.aiMessage.metadata?.attachments?.map((att: any) => ({
              name: att.fileName || att.name,
              type: att.fileType || att.type
            }))
          }
        ];
      });

      // Also invalidate the query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: targetQueryKey });
    },
    onError: (error) => {
      console.error("Message send error:", error);
      
      // Clear pending message on error
      setPendingUserMessage(null);
    },
  });

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    queryClient.invalidateQueries({ queryKey: ["messages", "new"] });
  };

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
