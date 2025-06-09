import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
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
  const [currentConversationId, setConversationId] = useState<string | null>(null);
  // Log hook instantiation with initial state value for currentConversationId
  // Note: This log captures the initial value from useState, not necessarily the activeConversationId used later
  console.log("[useChatMessages] Hook instantiated. Initial internal currentConversationId (from useState):", currentConversationId);
  const { coachingMode } = useAppContext();
  const [newlyCreatedConvId, setNewlyCreatedConvId] = useState<string | null>(null);
  // pendingUserMessage state is removed
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);


  useEffect(() => {
    console.log("[useEffect messages] Running. currentConversationId:", currentConversationId, "newlyCreatedConvId:", newlyCreatedConvId);
    // Renamed for clarity within useEffect
    const loadConversationMessages = async () => {
      if (currentConversationId === null) {
        // Standard new chat session (e.g., user clicked "New Chat" button)
        setActiveMessages([welcomeMessage]);
        setIsLoadingMessages(false);
        setNewlyCreatedConvId(null); // Clear flag
        return;
      }

      if (newlyCreatedConvId && currentConversationId === newlyCreatedConvId) {
        // This conversation was just created by sending the first message.
        // onSuccess has already updated activeMessages with this first message.
        // So, we don't need to fetch history from the server for it right now.
        setIsLoadingMessages(false);
        setNewlyCreatedConvId(null); // Consume/clear the signal
        return;
      }

      // Proceed to fetch messages for existing conversations or if the new flag isn't relevant
      setIsLoadingMessages(true);
      setNewlyCreatedConvId(null); // Ensure flag is cleared if we are fetching
      try {
        const response = await fetch(`/api/conversations/${currentConversationId}/messages?_t=${Date.now()}`);
        if (!response.ok) {
          console.error("Failed to fetch conversation messages");
          // Potentially set an error state here
          setActiveMessages([welcomeMessage]); // Fallback to welcome message on error
          return;
        }
        const convMessages = await response.json();
        console.log("Loaded messages for conversation:", currentConversationId, convMessages);

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

        formattedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        console.log("[useEffect messages] Fetched initial messages, about to call setActiveMessages. Count:", formattedMessages.length, "Messages:", formattedMessages.map(m => ({id: m.id, content: m.content.substring(0,20), att: m.attachments?.length || 0 })));
        setActiveMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching initial messages:", error);
        setActiveMessages([welcomeMessage]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadConversationMessages(); // Call the renamed function
  }, [currentConversationId, newlyCreatedConvId]); // Added newlyCreatedConvId to dependencies

  // The activeConversationId derivation logic (iterating queryClient.getQueriesData) is removed.
  // currentConversationId from useState will be the source of truth.

  type SendMessageParams = {
    content: string;
    attachments: AttachedFile[];
    conversationId: string | null;
    aiProvider?: string;
    aiModel?: string;
    automaticModelSelection?: boolean;
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
      console.log("onMutate triggered for optimistic update:", { content, conversationId });

      // Create the optimistic user message
      const userMessage: Message = { // Ensure Message type is used
        id: `temp-user-${Date.now()}`, // Temporary ID
        content,
        isUserMessage: true,
        timestamp: new Date(),
        attachments: attachments?.map(f => ({
          name: f.fileName || f.displayName || 'Unknown file',
          type: f.fileType || 'application/octet-stream' // Provide a default type if necessary
        }))
      };
      console.log("[onMutate] About to add optimistic message. Current activeMessages count:", activeMessages.length, "Optimistic message:", {id: userMessage.id, content: userMessage.content.substring(0,20), att: userMessage.attachments?.length || 0});
      // Add optimistic message to local state
      setActiveMessages(prevMessages => [...prevMessages, userMessage]);

      // Return context with the optimistic message
      return { optimisticMessage: userMessage };
    },
    onSuccess: async (data, variables, context: { optimisticMessage?: Message } | undefined) => {
      console.log("[onSuccess] Received server data. About to update activeMessages. Current activeMessages count:", activeMessages.length, "Server data:", data, "Optimistic context ID:", context?.optimisticMessage?.id);

      setActiveMessages(prevMessages => {
        // Filter out the optimistic message using its temporary ID
        const filteredMessages = context?.optimisticMessage
          ? prevMessages.filter(msg => msg.id !== context.optimisticMessage!.id)
          : prevMessages;

        const newMessagesFromServer = [];
        // Ensure server response structure for userMessage and aiMessage is handled
        // And that their IDs are strings
        if (data.userMessage && data.userMessage.id) {
          newMessagesFromServer.push({
            ...data.userMessage,
            id: data.userMessage.id.toString(), // Ensure ID is a string
            timestamp: new Date(data.userMessage.timestamp),
            attachments: data.userMessage.attachments?.map((att: any) => ({
              name: att.fileName || att.name || 'Unknown file',
              type: att.fileType || att.type || 'application/octet-stream'
            }))
          });
        }
        if (data.aiMessage && data.aiMessage.id) {
          newMessagesFromServer.push({
            ...data.aiMessage,
            id: data.aiMessage.id.toString(), // Ensure ID is a string
            timestamp: new Date(data.aiMessage.timestamp),
            attachments: data.aiMessage.attachments?.map((att: any) => ({
              name: att.fileName || att.name || 'Unknown file',
              type: att.fileType || att.type || 'application/octet-stream'
            }))
          });
        }

        const updatedMessages = [...filteredMessages, ...newMessagesFromServer];
        updatedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return updatedMessages;
      });

      if (data.conversationId) {
        // If the conversationId changed (e.g., for a new chat), update it.
        // This will also trigger the useEffect to fetch initial messages if its logic
        // is to refetch/verify when currentConversationId is set.
        if (currentConversationId !== data.conversationId) {
            setConversationId(data.conversationId);
        }
      }

      // Signal if a new conversation was just created by this message send
      if (variables.conversationId === null && data.conversationId) {
        setNewlyCreatedConvId(data.conversationId);
      } else {
        setNewlyCreatedConvId(null); // Clear if it's not a new ID from a null original ID
      }

      // Invalidate conversations list (for sidebar updates, etc.)
      queryClient.invalidateQueries({ 
        queryKey: ["conversations"] 
      });
    },
    onError: (error: Error, variables, context: { optimisticMessage?: Message } | undefined) => {
      console.error("Failed to send message:", error);
      if (context?.optimisticMessage) {
        // Remove the optimistic message from local state
        setActiveMessages(prevMessages =>
          prevMessages.filter(msg => msg.id !== context.optimisticMessage!.id)
        );
        // Optionally, add a system message or mark the failed message
        // For example, to add an error message to the chat:
        // const errorMessage: Message = {
        //   id: `error-${Date.now()}`,
        //   content: `Failed to send message: "${context.optimisticMessage.content.substring(0, 30)}...". Error: ${error.message}`,
        //   isUserMessage: false, // Or true if you want to show it as a user's error bubble
        //   timestamp: new Date(),
        //   attachments: [] // No attachments for an error message
        // };
        // setActiveMessages(prevMessages => [...prevMessages, errorMessage].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()));
      }
      // No need to invalidate queries for ["messages", ...] as we handle UI directly.
    },
  });

  const handleSelectConversation = (conversationId: string) => {
    setConversationId(conversationId); // Triggers useEffect to load messages
  };

  const handleNewChat = () => {
    console.log("Starting new chat - clearing current conversation");
    setConversationId(null); // This will trigger useEffect to set welcomeMessage
    // pendingUserMessage removed, so no setPendingUserMessage(null) needed
  };

  const setCurrentConversationId = useCallback((conversationId: string | null) => {
    console.log("Switching to conversation:", conversationId);
    setConversationId(conversationId); // This will trigger useEffect to load messages
    // pendingUserMessage removed, so no setPendingUserMessage(null) needed
  }, []);

  // Log state before returning
  console.log("[useChatMessages] Returning state:", {
    messagesCount: activeMessages.length, // Log count instead of full messages array for brevity
    currentConversationId: currentConversationId, // Now directly using the state variable
    loadingMessages: isLoadingMessages,
    newlyCreatedConvId: newlyCreatedConvId
  });
  return {
    messages: activeMessages,
    loadingMessages: isLoadingMessages,
    currentConversationId: currentConversationId, // Now directly using the state variable
    sendMessageMutation,
    handleSelectConversation,
    handleNewChat,
    setCurrentConversationId,
  };
};