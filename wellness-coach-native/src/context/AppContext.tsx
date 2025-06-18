import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
// TODO: RN-Adapt - Adjust path to shared schema. This path is a placeholder.
// It might be something like '../../../../shared/schema' or need path aliasing in tsconfig.json.
import { CoachingMode } from "../../../shared/schema";
import { useUserSettings } from "../hooks/useUserSettings"; // Adjusted path
// import { API_CONFIG } from "../config/api"; // No longer needed directly
import { getFromApi, postToApi } from '../services/apiClient'; // Import apiClient functions

export type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

// TODO: RN-Adapt - Review AttachedFile for React Native.
// `content: ArrayBuffer` might be less common; URIs from pickers are more typical.
// `cid` and `path` might also change based on how RN handles local files.
export type AttachedFile = {
  fileName: string;
  fileType: string;
  fileSize: number;
  content?: ArrayBuffer; // Or string if base64. For RN, `uri` is often used.
  uri?: string; // Common in React Native for local file paths
  cid?: string;
  path?: string;
  displayName?: string;
};

export type ActiveSection = "chat" | "health" | "devices" | "memory" | "files" | "settings";

export interface AppSettings {
  aiProvider?: string;
  aiModel?: string;
  automaticModelSelection?: boolean;
  transcriptionProvider?: string; // Note: "webspeech" is browser-specific
}

interface AppContextType {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  coachingMode: string; // Should ideally use CoachingMode type from schema
  setCoachingMode: (mode: string) => void;
  appSettings: AppSettings;
  messages: Message[];
  currentConversationId: string | null;
  loadingMessages: boolean;
  sendMessage: (params: SendMessageParams) => void;
  selectConversation: (conversationId: string | null) => void;
  newChat: () => void;
  refreshMessages: () => void;
  setStreamingActive: (active: boolean) => void;
  isStreamingActive: boolean;
  addOptimisticMessage: (message: Message) => void;
  updateOptimisticMessage: (id: string, updates: Partial<Message>) => void;
}

interface SendMessageParams {
  content: string;
  attachments?: AttachedFile[]; // Uses the local AttachedFile type
  conversationId?: string | null;
  aiProvider?: string;
  aiModel?: string;
  automaticModelSelection?: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

const welcomeMessage: Message = {
  id: "welcome",
  content: "Hi! I'm your AI wellness coach. How can I help you today?",
  isUserMessage: false,
  timestamp: new Date(),
};

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [activeSection, setActiveSectionState] = useState<ActiveSection>("chat");
  const [coachingMode, setCoachingModeState] = useState<string>("weight-loss" as CoachingMode); // Cast to CoachingMode

  const [currentConversationId, setCurrentConversationIdState] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [newlyCreatedConvId, setNewlyCreatedConvId] = useState<string | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState<boolean>(false);

  const { userSettings } = useUserSettings(); // isLoadingSettings not used here
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userSettings) {
      console.log("[AppContext] User settings loaded (RN):", userSettings);
    }
  }, [userSettings]);

  const appSettings = useMemo<AppSettings>(() => ({
    aiProvider: userSettings?.aiProvider || "google",
    aiModel: userSettings?.aiModel || "gemini-2.0-flash-exp", // TODO: RN-Adapt - ensure model names are valid for API
    automaticModelSelection: userSettings?.automaticModelSelection ?? true,
    // TODO: RN-Adapt - "webspeech" is browser-specific. Default to a non-web option or make it configurable for RN.
    transcriptionProvider: userSettings?.transcriptionProvider === "webspeech" ? "openai" : userSettings?.transcriptionProvider || "openai",
  }), [userSettings]);

  useEffect(() => {
    console.log("[AppContext messages useEffect (RN)] CurrentId:", currentConversationId, "Streaming:", isStreamingActive);
    if (isStreamingActive) {
      console.log("[AppContext] Streaming active - preserving messages (RN)");
      setIsLoadingMessages(false);
      return;
    }

    const loadMessages = async () => {
      if (!currentConversationId) {
        setActiveMessages([welcomeMessage]);
        setIsLoadingMessages(false);
        return;
      }
      // Preserve messages if some exist for current conversation, to avoid flicker on re-select
      const existingMessagesForConv = activeMessages.filter(msg => msg.id !== "welcome");
      if (existingMessagesForConv.length > 0 && !newlyCreatedConvId) {
         console.log("[AppContext] Preserve existing messages for (RN):", currentConversationId);
         setIsLoadingMessages(false);
         return;
      }

      setIsLoadingMessages(true);
      setNewlyCreatedConvId(null); // Reset flag
      try {
        const messagesArray = await getFromApi<any[]>(`conversations/${currentConversationId}/messages?_t=${Date.now()}`);
        // Ensure messagesArray is actually an array before mapping
        if (Array.isArray(messagesArray)) {
          const formattedMessages: Message[] = messagesArray.map((msg: any) => ({
            id: msg.id.toString(),
            content: msg.content,
            isUserMessage: msg.role === "user",
            timestamp: new Date(msg.createdAt),
            attachments: msg.metadata?.attachments?.map((att: any) => ({
              name: att.fileName || att.name || 'Unknown file',
              type: att.fileType || att.type || 'application/octet-stream'
            })) || undefined
          })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setActiveMessages(formattedMessages.length > 0 ? formattedMessages : [welcomeMessage]);
        } else {
          // Handle cases where API might not return an array (e.g. error object)
          // getFromApi should throw an error in such cases based on response.ok,
          // so this path might only be reached if API returns 200 OK with non-array body.
          console.error("[AppContext] Fetched messages are not an array (RN):", messagesArray);
          setActiveMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error("[AppContext] Error fetching messages (RN):", error);
        setActiveMessages([welcomeMessage]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();
  }, [currentConversationId, isStreamingActive, newlyCreatedConvId]); // Removed activeMessages from deps to control reloads

  const sendMessageMutation = useMutation<any, Error, SendMessageParams, { optimisticMessage?: Message }>({
    mutationFn: async (params) => {
      const requestBody = {
        ...params,
        aiProvider: params.aiProvider || appSettings.aiProvider,
        aiModel: params.aiModel || appSettings.aiModel,
        automaticModelSelection: params.automaticModelSelection ?? appSettings.automaticModelSelection,
      };
      return postToApi<any>('messages', requestBody);
    },
    onMutate: async (variables) => {
      const optimisticMessage: Message = {
        id: `temp-user-${Date.now()}`, content: variables.content, isUserMessage: true, timestamp: new Date(),
        attachments: variables.attachments?.map(att => ({ name: att.displayName || att.fileName, type: att.fileType }))
      };
      setActiveMessages(prev => [...prev, optimisticMessage]);
      return { optimisticMessage };
    },
    onSuccess: (data, variables, context) => {
      setActiveMessages(prev => prev.filter(msg => msg.id !== context?.optimisticMessage?.id));
      const newMessages: Message[] = [];
      if (data.userMessage?.id) newMessages.push({ ...data.userMessage, id: data.userMessage.id.toString(), timestamp: new Date(data.userMessage.timestamp) });
      if (data.aiMessage?.id) newMessages.push({ ...data.aiMessage, id: data.aiMessage.id.toString(), timestamp: new Date(data.aiMessage.timestamp) });
      setActiveMessages(prev => [...prev, ...newMessages].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()));

      if (data.conversationId && currentConversationId !== data.conversationId) {
        setCurrentConversationIdState(data.conversationId);
         if (variables.conversationId === null) setNewlyCreatedConvId(data.conversationId);
      } else if (variables.conversationId === null && data.conversationId) {
         // This case handles when a new chat starts, server returns new conv ID
         // but currentConversationId was already (optimistically or otherwise) set to this new ID.
         // We still want to treat it as "newly created" for the useEffect logic to load if empty.
         setNewlyCreatedConvId(data.conversationId);
      } else {
        setNewlyCreatedConvId(null);
      }
    },
    onError: (error, variables, context) => {
      console.error("[AppContext] SendMessage error (RN):", error);
      if (context?.optimisticMessage) {
        setActiveMessages(prev => prev.filter(msg => msg.id !== context.optimisticMessage!.id));
      }
      // Optionally, add a toast or error message to UI
    },
  });

  const setActiveSection = useCallback((section: ActiveSection) => setActiveSectionState(section), []);
  const setCoachingMode = useCallback((mode: string) => setCoachingModeState(mode as CoachingMode), []);
  const selectConversationHandler = useCallback((id: string | null) => {
    if (id !== currentConversationId) {
      setCurrentConversationIdState(id);
      // If selecting a new conversation, mark it as newly created to trigger message load if empty
      if (id) setNewlyCreatedConvId(id);
      else setActiveMessages([welcomeMessage]); // No ID, reset to welcome
    }
  }, [currentConversationId]);
  const newChatHandler = useCallback(() => {
    setCurrentConversationIdState(null);
    setActiveMessages([welcomeMessage]);
    setNewlyCreatedConvId(null);
    setIsStreamingActive(false);
  }, []);
  const sendMessageHandler = useCallback((params: SendMessageParams) => sendMessageMutation.mutate(params), [sendMessageMutation]);

  const refreshMessagesHandler = useCallback(async () => {
    // Simplified refresh: re-trigger useEffect for loading messages
    if (currentConversationId) {
        setNewlyCreatedConvId(currentConversationId); // Mark as new to force reload in effect
    }
  }, [currentConversationId]);


  const setStreamingActiveHandler = useCallback((active: boolean) => setIsStreamingActive(active), []);
  const addOptimisticMessageHandler = useCallback((message: Message) => {
    setActiveMessages(prev => {
      const existing = prev.find(m => m.id === message.id);
      if (existing) return prev.map(m => m.id === message.id ? {...m, ...message} : m);
      return [...prev, message].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
  }, []);
  const updateOptimisticMessageHandler = useCallback((id: string, updates: Partial<Message>) => {
    setActiveMessages(prev => prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg));
  }, []);

  const contextValue = useMemo((): AppContextType => ({
    activeSection, setActiveSection, coachingMode, setCoachingMode, appSettings,
    messages: activeMessages, currentConversationId, loadingMessages: isLoadingMessages,
    sendMessage: sendMessageHandler, selectConversation: selectConversationHandler, newChat: newChatHandler,
    refreshMessages: refreshMessagesHandler, setStreamingActive: setStreamingActiveHandler, isStreamingActive,
    addOptimisticMessage: addOptimisticMessageHandler, updateOptimisticMessage: updateOptimisticMessageHandler,
  }), [
    activeSection, coachingMode, appSettings, activeMessages, currentConversationId, isLoadingMessages,
    isStreamingActive, setActiveSection, setCoachingMode, sendMessageHandler,
    selectConversationHandler, newChatHandler, refreshMessagesHandler,
    setStreamingActiveHandler, addOptimisticMessageHandler, updateOptimisticMessageHandler
  ]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error("useAppContext must be used within an AppProvider");
  return context;
};
