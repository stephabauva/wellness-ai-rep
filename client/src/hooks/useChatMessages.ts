
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
    attachments?: any[];
  } | null>(null);

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
    enabled: true, // Always enabled
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return await response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      attachments,
      conversationId,
    }: {
      content: string;
      attachments: AttachedFile[];
      conversationId: string | null;
    }) => {
      console.log("Sending message with conversation ID:", conversationId);
      const response = await apiRequest("POST", "/api/messages", {
        content,
        conversationId,
        coachingMode,
        aiProvider: settings?.aiProvider || "openai",
        aiModel: settings?.aiModel || "gpt-4o",
        attachments: attachments.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          displayName: file.displayName,
          fileType: file.fileType,
          fileSize: file.fileSize,
        })),
        automaticModelSelection: settings?.automaticModelSelection ?? true,
      });
      console.log("API Response data:", response);
      return response;
    },
    onMutate: async ({ content, attachments }) => {
      setPendingUserMessage({
        content,
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments.map(f => ({ 
          name: f.fileName, 
          type: f.fileType 
        })) : undefined
      });
    },
    onSuccess: (data) => {
      console.log("Message sent successfully:", data);
      const finalConversationId = data.conversationId;

      setPendingUserMessage(null);

      if (!currentConversationId) {
        console.log("Setting conversation ID to:", finalConversationId);
        setCurrentConversationId(finalConversationId);
      } else if (currentConversationId !== finalConversationId) {
        console.log("Updating conversation ID from", currentConversationId, "to", finalConversationId);
        setCurrentConversationId(finalConversationId);
      }

      // Update cache for the correct conversation
      const targetQueryKey = ["messages", finalConversationId];

      queryClient.setQueryData<Message[]>(targetQueryKey, (old = []) => {
        // For new conversations, start with welcome message
        const existingMessages = !currentConversationId && finalConversationId !== currentConversationId 
          ? [welcomeMessage] 
          : (old || []);
        
        return [
          ...existingMessages,
          {
            id: data.userMessage.id,
            content: data.userMessage.content,
            isUserMessage: true,
            timestamp: new Date(data.userMessage.timestamp),
            attachments: data.userMessage.metadata?.attachments ? data.userMessage.metadata.attachments.map((att: any) => ({
              name: att.fileName || att.name,
              type: att.fileType || att.type
            })) : undefined
          },
          {
            id: data.aiMessage.id,
            content: data.aiMessage.content,
            isUserMessage: false,
            timestamp: new Date(data.aiMessage.timestamp),
          },
        ];
      });
      
      // Invalidate and refetch to ensure UI is up to date
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", finalConversationId] });
    },
    onError: (error) => {
      console.error("Message send error:", error);
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
    messages,
    loadingMessages,
    currentConversationId,
    pendingUserMessage,
    sendMessageMutation,
    handleSelectConversation,
    handleNewChat,
  };
};
