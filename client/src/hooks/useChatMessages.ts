import { useState, useCallback, useMemo, useRef } from 'react';
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
      
      return formattedMessages;
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: false,
    enabled: true // Always enable this query
  });

  // Get active conversation ID by checking cache for actual conversation data
  let activeConversationId = currentConversationId;
  
  // If no current conversation ID, check cache for active conversations
  if (!currentConversationId) {
    const allQueries = queryClient.getQueriesData({ queryKey: ["messages"] });
    for (const [queryKey, data] of allQueries) {
      const [, conversationId] = queryKey as [string, string];
      if (conversationId !== "new" && Array.isArray(data) && data.length > 0) {
        const hasRealMessages = data.some((msg: any) => msg.id !== "welcome-message");
        if (hasRealMessages) {
          console.log("Found active conversation in cache:", conversationId);
          activeConversationId = conversationId;
          // Update the state to match the cached data (but don't cause infinite re-renders)
          setTimeout(() => setConversationId(conversationId), 0);
          break;
        }
      }
    }
  }

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
    onMutate: async ({ content, attachments, conversationId }) => {
      console.log("onMutate triggered - setting pending message:", { content, conversationId });
      
      // Cancel any outgoing queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["messages"] });

      // Create the user message immediately in cache for all scenarios
      const userMessage = {
        id: `temp-user-${Date.now()}`,
        content,
        isUserMessage: true,
        timestamp: new Date(),
        attachments: attachments?.map(f => ({ 
          name: f.fileName || f.displayName || 'Unknown file', 
          type: f.fileType 
        }))
      };

      // For existing conversation, add to existing messages
      if (conversationId) {
        const existingMessages = queryClient.getQueryData(["messages", conversationId]) || [];
        const filteredMessages = Array.isArray(existingMessages) ? 
          existingMessages.filter(m => m.id !== "welcome-message") : [];
        
        queryClient.setQueryData(
          ["messages", conversationId], 
          [...filteredMessages, userMessage]
        );
        console.log("User message added to existing conversation cache");
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });

      } else {
        // For new conversation, create new cache entry
        queryClient.setQueryData(["messages", "new"], [userMessage]);
        console.log("User message added to new conversation cache");
        queryClient.invalidateQueries({ queryKey: ["messages", "new"] });

      }

      // Don't rely on pending state - use direct cache updates
      return { userMessage };
    },
    onSuccess: async (data, variables, context) => {
      console.log("Message sent successfully:", data);

      // Always set conversation ID from response to ensure we have the correct one
      if (data.conversationId) {
        console.log("Setting conversation ID to:", data.conversationId);
        
        // Get existing messages from cache (including our temp message)
        const existingMessages = queryClient.getQueryData(["messages", data.conversationId]) || 
                                 queryClient.getQueryData(["messages", "new"]) || [];
        
        // Remove temp messages and welcome message
        const cleanMessages = Array.isArray(existingMessages) ? 
          existingMessages.filter((msg: any) => 
            msg.id !== "welcome-message" && 
            !msg.id.startsWith("temp-")
          ) : [];
        
        // Format the new messages from the response
        const newMessages = [];
        
        if (data.userMessage) {
          newMessages.push({
            id: data.userMessage.id.toString(),
            content: data.userMessage.content,
            isUserMessage: true,
            timestamp: new Date(data.userMessage.timestamp),
            attachments: data.userMessage.attachments
          });
        }
        
        if (data.aiMessage) {
          newMessages.push({
            id: data.aiMessage.id.toString(),
            content: data.aiMessage.content,
            isUserMessage: false,
            timestamp: new Date(data.aiMessage.timestamp),
            attachments: data.aiMessage.attachments
          });
        }
        
        // Combine clean existing and new messages
        const allMessages = [...cleanMessages, ...newMessages];
        
        // Sort by timestamp and set immediately
        const sortedMessages = allMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        queryClient.setQueryData(["messages", data.conversationId], sortedMessages);
        
        // Set the conversation ID immediately
        setConversationId(data.conversationId);
        
        // Clear the "new" query cache since we now have a conversation
        queryClient.removeQueries({ queryKey: ["messages", "new"] });
        
        console.log("Updated cache with final messages:", sortedMessages.length);
        // Explicitly invalidate messages for the specific conversation
        queryClient.invalidateQueries({ queryKey: ["messages", data.conversationId] });
        await queryClient.refetchQueries({ queryKey: ["messages", data.conversationId], exact: true });
      }

      // Invalidate conversations list
      queryClient.invalidateQueries({ 
        queryKey: ["conversations"] 
      });
    },
    onError: (error, variables, context) => {
      console.error("Message send error:", error);

      // Rollback optimistic updates if we had a conversation ID
      if (variables.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: ["messages", variables.conversationId] 
        });
      }
    },
  });

  const handleSelectConversation = (conversationId: string) => {
    setConversationId(conversationId);
  };

  const handleNewChat = () => {
    console.log("Starting new chat - clearing current conversation");
    setConversationId(null);
    setPendingUserMessage(null);
    
    // Clear all message caches to ensure fresh start
    queryClient.removeQueries({ queryKey: ["messages"] });
    
    // Set welcome message immediately for new chat
    queryClient.setQueryData(["messages", "new"], [welcomeMessage]);
  };

  const setCurrentConversationId = useCallback((conversationId: string | null) => {
    console.log("Switching to conversation:", conversationId);
    setConversationId(conversationId);
    setPendingUserMessage(null);
  }, []);

  return {
    messages: messages || [],
    loadingMessages,
    currentConversationId: activeConversationId,
    sendMessageMutation,
    handleSelectConversation,
    handleNewChat,
    pendingUserMessage,
    welcomeMessage,
    setCurrentConversationId,
  };
};