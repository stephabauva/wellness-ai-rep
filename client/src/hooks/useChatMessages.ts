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
  

  type SendMessageParams = {
    content: string;
    attachments: AttachedFile[];
    conversationId: string | null;
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

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return await response.json();
    },
  });

// Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments, conversationId }: SendMessageParams) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachments, conversationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      return await response.json();
    },
    onMutate: async ({ content, attachments, conversationId }) => {
      // Cancel any outgoing refetches
      const queryKey = ["messages", conversationId || "new"];
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: Message[] = []) => {
        const existingMessages = old.filter(msg => msg.id !== "welcome-message");
        
        // Add the user message optimistically
        const optimisticUserMessage: Message = {
          id: `temp-user-${Date.now()}`,
          content,
          isUserMessage: true,
          timestamp: new Date(),
          attachments: attachments?.map(f => ({ 
            name: f.fileName || f.displayName, 
            type: f.fileType 
          }))
        };

        return [...existingMessages, optimisticUserMessage];
      });

      // Return a context object with the snapshotted value
      return { previousMessages, queryKey };
    },
    onSuccess: (data, variables, context) => {
      console.log("Message sent successfully:", data);

      // Update conversation ID if this was a new conversation
      if (data.conversationId && !currentConversationId) {
        console.log("Setting conversation ID to:", data.conversationId);
        setCurrentConversationId(data.conversationId);
      }

      // Update the cache with the real server response
      const targetQueryKey = ["messages", data.conversationId];
      
      // If this was a new conversation, we need to update the cache key
      if (variables.conversationId !== data.conversationId) {
        // Move data from "new" to actual conversation ID
        const tempData = queryClient.getQueryData(context?.queryKey);
        queryClient.setQueryData(targetQueryKey, tempData);
        queryClient.removeQueries({ queryKey: context?.queryKey });
      }

      // Replace optimistic messages with real ones
      queryClient.setQueryData(targetQueryKey, (old: Message[] = []) => {
        // Remove any temporary messages
        const cleanMessages = old.filter(msg => !msg.id.startsWith('temp-'));
        
        return [
          ...cleanMessages,
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
    },
    onError: (error, variables, context) => {
      console.error("Message send error:", error);
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(context.queryKey, context.previousMessages);
      }
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
    messages,
    loadingMessages,
    currentConversationId,
    sendMessageMutation,
    handleSelectConversation,
    handleNewChat,
  };
};