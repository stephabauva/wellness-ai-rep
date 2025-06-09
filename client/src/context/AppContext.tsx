import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from "react";
import { useMutation, QueryClient } from '@tanstack/react-query'; // queryClient might not be directly used here but good for consistency
import { CoachingMode } from "@shared/schema";

// Define Message type locally for now
export type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

// Placeholder for AttachedFile type
export type AttachedFile = {
  fileName: string;
  fileType: string;
  fileSize: number;
  content: ArrayBuffer; // Or string if it's base64
  cid?: string; // Optional: Content ID for inline attachments
  path?: string; // Optional: Path if saved temporarily
  displayName?: string;
};


export type ActiveSection = "chat" | "health" | "devices" | "memory" | "files" | "settings";

export interface AppSettings {
  aiProvider?: string;
  aiModel?: string;
  automaticModelSelection?: boolean;
  transcriptionProvider?: string;
}

interface AppContextType {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  coachingMode: string;
  setCoachingMode: (mode: string) => void;
  settings?: AppSettings;
  // Chat related context values
  messages: Message[];
  currentConversationId: string | null;
  loadingMessages: boolean;
  sendMessage: (params: SendMessageParams) => void; // Matches mutation's mutate signature
  selectConversation: (conversationId: string | null) => void;
  newChat: () => void;
  // newlyCreatedConvId is internal and doesn't need to be in context type
}

// Define SendMessageParams locally for now
type SendMessageParams = {
  content: string;
  attachments: AttachedFile[];
  conversationId: string | null;
  aiProvider?: string;
  aiModel?: string;
  automaticModelSelection?: boolean;
};


const AppContext = createContext<AppContextType | undefined>(undefined);

// Define welcomeMessage constant locally
const welcomeMessage: Message = {
  id: "welcome-message",
  content:
    "Welcome to your AI wellness coach! I'm here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you're focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I'm ready to help. What would you like to work on today?",
  isUserMessage: false,
  timestamp: new Date(),
};

// Placeholder for queryClient if not already configured globally for mutations
// This might be better if queryClient is imported from a central place like @/lib/queryClient
const queryClient = new QueryClient();

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  console.log("[AppContext] AppProvider body execution.");
  const [activeSection, setActiveSectionState] = useState<ActiveSection>("chat");
  const [coachingMode, setCoachingModeState] = useState<string>("weight-loss");

  // Chat state
  const [currentConversationId, setCurrentConversationIdState] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [newlyCreatedConvId, setNewlyCreatedConvId] = useState<string | null>(null);

  // Default settings for AI provider (can be moved or made dynamic later)
  const settings = {
    aiProvider: "openai",
    aiModel: "gpt-4o",
    automaticModelSelection: true,
    transcriptionProvider: "webspeech"
  };

  // Message Loading useEffect (adapted from useChatMessages)
  useEffect(() => {
    console.log("[AppContext useEffect messages] Running. currentConversationId:", currentConversationId, "newlyCreatedConvId:", newlyCreatedConvId);
    const loadConversationMessages = async () => {
      if (currentConversationId === null) {
        setActiveMessages([welcomeMessage]);
        setIsLoadingMessages(false);
        setNewlyCreatedConvId(null);
        return;
      }
      if (newlyCreatedConvId && currentConversationId === newlyCreatedConvId) {
        setIsLoadingMessages(false);
        setNewlyCreatedConvId(null);
        return;
      }
      setIsLoadingMessages(true);
      setNewlyCreatedConvId(null);
      try {
        const response = await fetch(`/api/conversations/${currentConversationId}/messages?_t=${Date.now()}`);
        if (!response.ok) {
          console.error("[AppContext] Failed to fetch conversation messages");
          setActiveMessages([welcomeMessage]);
          return;
        }
        const convMessages = await response.json();
        const messagesArray = Array.isArray(convMessages) ? convMessages : [];
        const formattedMessages: Message[] = messagesArray.map((msg: any) => ({
          id: msg.id.toString(),
          content: msg.content,
          isUserMessage: msg.role === "user",
          timestamp: new Date(msg.createdAt),
          attachments: msg.metadata?.attachments?.map((att: any) => ({
            name: att.fileName || att.name || 'Unknown file',
            type: att.fileType || att.type || 'application/octet-stream'
          })) || undefined
        }));
        console.log("[AppContext useEffect messages] Fetched initial messages, about to call setActiveMessages. Count:", formattedMessages.length);
        setActiveMessages(formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
      } catch (error) {
        console.error("[AppContext] Error fetching initial messages:", error);
        setActiveMessages([welcomeMessage]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadConversationMessages();
  }, [currentConversationId, newlyCreatedConvId]);

  // Send Message Mutation (adapted from useChatMessages)
  const sendMessageMutation = useMutation<any, Error, SendMessageParams, { optimisticMessage?: Message }>({
    mutationFn: async ({ content, attachments, conversationId, aiProvider, aiModel, automaticModelSelection }) => {
      const requestBody = {
        content,
        attachments,
        conversationId,
        aiProvider: aiProvider || settings.aiProvider,
        aiModel: aiModel || settings.aiModel,
        automaticModelSelection: automaticModelSelection ?? settings.automaticModelSelection
      };
      console.log("[AppContext mutationFn] Sending to /api/messages. Request Body:", JSON.stringify(requestBody, null, 2));
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        console.error("[AppContext mutationFn] Error from /api/messages. Status:", response.status, "StatusText:", response.statusText);
        const errorText = await response.text().catch(() => "Could not read error body.");
        console.error("[AppContext mutationFn] Error response body:", errorText);
        throw new Error(`Failed to send message. Status: ${response.status}. ${errorText}`);
      }
      return response.json();
    },
    onMutate: async ({ content, attachments }) => {
      console.log("[AppContext onMutate] Adding optimistic message.");
      const userMessage: Message = {
        id: `temp-user-${Date.now()}`,
        content,
        isUserMessage: true,
        timestamp: new Date(),
        attachments: attachments?.map(f => ({
          name: f.fileName || f.displayName || 'Unknown file',
          type: f.fileType || 'application/octet-stream'
        }))
      };
      setActiveMessages(prevMessages => [...prevMessages, userMessage]);
      return { optimisticMessage: userMessage };
    },
    onSuccess: (data, variables, context) => {
      console.log("[AppContext onSuccess] Received server data:", data);
      setActiveMessages(prevMessages => {
        const filteredMessages = context?.optimisticMessage
          ? prevMessages.filter(msg => msg.id !== context.optimisticMessage!.id)
          : prevMessages;
        const newMessagesFromServer: Message[] = [];
        if (data.userMessage && data.userMessage.id) {
          newMessagesFromServer.push({
            ...data.userMessage,
            id: data.userMessage.id.toString(),
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
            id: data.aiMessage.id.toString(),
            timestamp: new Date(data.aiMessage.timestamp),
            attachments: data.aiMessage.attachments?.map((att: any) => ({
              name: att.fileName || att.name || 'Unknown file',
              type: att.fileType || att.type || 'application/octet-stream'
            }))
          });
        }
        return [...filteredMessages, ...newMessagesFromServer].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      if (data.conversationId && currentConversationId !== data.conversationId) {
        setCurrentConversationIdState(data.conversationId);
      }
      if (variables.conversationId === null && data.conversationId) {
        setNewlyCreatedConvId(data.conversationId);
      } else {
        setNewlyCreatedConvId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error, variables, context) => {
      console.error("[AppContext onError] Failed to send message:", error);
      if (context?.optimisticMessage) {
        setActiveMessages(prevMessages => prevMessages.filter(msg => msg.id !== context.optimisticMessage!.id));
      }
    },
  });

  // Handlers
  const setActiveSection = useCallback((section: ActiveSection) => {
    setActiveSectionState(section);
  }, []);

  const setCoachingMode = useCallback((mode: string) => {
    setCoachingModeState(mode);
  }, []);

  const selectConversationHandler = useCallback((id: string | null) => {
    setCurrentConversationIdState(id);
  }, []);

  const newChatHandler = useCallback(() => {
    setCurrentConversationIdState(null); // useEffect will handle setting welcome message and clearing newlyCreatedConvId
  }, []);

  const sendMessageHandler = useCallback((params: SendMessageParams) => {
    sendMessageMutation.mutate(params);
  }, [sendMessageMutation]);


  // Memoize the context value
  const contextValue = useMemo(() => ({
    activeSection,
    setActiveSection,
    coachingMode,
    setCoachingMode,
    settings,
    messages: activeMessages,
    currentConversationId,
    loadingMessages: isLoadingMessages,
    sendMessage: sendMessageHandler,
    selectConversation: selectConversationHandler,
    newChat: newChatHandler,
  }), [
    activeSection, setActiveSection, coachingMode, setCoachingMode, settings,
    activeMessages, currentConversationId, isLoadingMessages,
    sendMessageHandler, selectConversationHandler, newChatHandler
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};