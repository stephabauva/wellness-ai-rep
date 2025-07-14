import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CoachingMode } from "@shared/schema";
import { useUserSettings } from "@/hooks/useUserSettings";

/**
 * Global application context
 * @used-by app/root, unknown/needs-classification, chat, settings
 */

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

export type ActiveSection = "chat" | "health" | "devices" | "memory" | "files" | "settings" | "godmode";

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
  appSettings: AppSettings;
  // Chat related context values
  messages: Message[];
  currentConversationId: string | null;
  loadingMessages: boolean;
  sendMessage: (params: SendMessageParams) => void;
  selectConversation: (conversationId: string | null) => void;
  newChat: () => void;
  refreshMessages: () => void;
  // Streaming control methods
  setStreamingActive: (active: boolean) => void;
  isStreamingActive: boolean;
  // Optimistic update methods for smooth streaming
  addOptimisticMessage: (message: Message) => void;
  updateOptimisticMessage: (id: string, updates: Partial<Message>) => void;
  // Lazy loading control
  loadedSections: ActiveSection[];
  isSettingsLoaded: boolean;
}

interface SendMessageParams {
  content: string;
  attachments?: AttachedFile[];
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
  const [coachingMode, setCoachingModeState] = useState<string>("weight-loss");

  // Chat state
  const [currentConversationId, setCurrentConversationIdState] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [newlyCreatedConvId, setNewlyCreatedConvId] = useState<string | null>(null);
  const [isStreamingActive, setIsStreamingActive] = useState<boolean>(false);

  // Lazy loading state
  const [loadedSections, setLoadedSections] = useState<ActiveSection[]>(['chat']);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(false);

  const { userSettings, isLoadingSettings } = useUserSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userSettings) {
      console.log("[AppContext] User settings loaded:", userSettings);
      setIsSettingsLoaded(true);
    }
  }, [userSettings]);

  // Priority loading logic - implement staggered loading after settings are ready
  useEffect(() => {
    if (isSettingsLoaded && !isLoadingSettings) {
      console.log("[AppContext] Starting staggered section loading...");
      
      // Phase 1: Chat is already loaded immediately
      // Phase 2: Load memory overview after 200ms (lightweight)
      setTimeout(() => {
        queryClient.prefetchQuery({ queryKey: ['/api/memories/overview'] });
        setLoadedSections(prev => [...prev, 'memory']);
      }, 200);

      // Phase 3: Load settings data after 500ms
      setTimeout(() => {
        queryClient.prefetchQuery({ queryKey: ['/api/settings'] });
        queryClient.prefetchQuery({ queryKey: ['/api/ai-models'] });
        setLoadedSections(prev => [...prev, 'settings']);
      }, 500);

      // Phase 4: Background load remaining sections after 1000ms
      setTimeout(() => {
        // Health section
        queryClient.prefetchQuery({ queryKey: ['/api/health-data'] });
        queryClient.prefetchQuery({ queryKey: ['/api/devices'] });
        queryClient.prefetchQuery({ queryKey: ['/api/health-consent/visibility'] });
        queryClient.prefetchQuery({ queryKey: ['/api/health-data/categories'] });
        
        // Files section
        queryClient.prefetchQuery({ queryKey: ['/api/files'] });
        queryClient.prefetchQuery({ queryKey: ['/api/categories'] });
        queryClient.prefetchQuery({ queryKey: ['/api/retention-settings'] });
        
        setLoadedSections(prev => [...prev, 'health', 'files', 'devices']);
      }, 1000);
    }
  }, [isSettingsLoaded, isLoadingSettings, queryClient]);

  const appSettings = useMemo<AppSettings>(() => ({
    aiProvider: userSettings?.aiProvider || "google",
    aiModel: userSettings?.aiModel || "gemini-2.0-flash-exp",
    automaticModelSelection: userSettings?.automaticModelSelection ?? true,
    transcriptionProvider: userSettings?.transcriptionProvider || "webspeech",
  }), [userSettings]);

  // Message Loading useEffect - CHATGPT-STYLE PERFORMANCE FIX
  useEffect(() => {
    console.log("[AppContext useEffect messages] Running. currentConversationId:", currentConversationId, "newlyCreatedConvId:", newlyCreatedConvId, "isStreamingActive:", isStreamingActive, "activeMessages.length:", activeMessages.length);
    
    // CHATGPT-STYLE FIX 1: Skip ALL loading during streaming to prevent reload flickering
    if (isStreamingActive) {
      console.log("[AppContext] CHATGPT-STYLE: Streaming active - preserving current state");
      setIsLoadingMessages(false);
      return;
    }
    
    // CHATGPT-STYLE FIX 2: Preserve existing messages to avoid database reloads
    if (currentConversationId && activeMessages.length > 0) {
      const hasRealMessages = activeMessages.some(msg => 
        msg.id !== "welcome" && 
        !msg.id.startsWith('user-') && 
        !msg.id.startsWith('ai-streaming-')
      );
      
      if (hasRealMessages || activeMessages.length > 1) {
        console.log("[AppContext] CHATGPT-STYLE: Preserving", activeMessages.length, "messages - no reload needed");
        setIsLoadingMessages(false);
        if (newlyCreatedConvId) {
          setNewlyCreatedConvId(null);
        }
        return;
      }
    }

    // Only load from database in these specific cases:
    // 1. Switching to a different existing conversation with no messages
    // 2. Starting the app for the first time
    const shouldLoadFromDatabase = (
      currentConversationId && 
      activeMessages.length === 0 &&
      !newlyCreatedConvId
    );

    if (!shouldLoadFromDatabase) {
      console.log("[AppContext] CHATGPT-STYLE: No database load needed");
      setIsLoadingMessages(false);
      if (newlyCreatedConvId) {
        setNewlyCreatedConvId(null);
      }
      return;
    }
    
    const loadConversationMessages = async () => {
      if (currentConversationId === null) {
        setActiveMessages([welcomeMessage]);
        setIsLoadingMessages(false);
        setNewlyCreatedConvId(null);
        return;
      }
      
      // CRITICAL FIX: Skip database fetch if we have ANY messages for the current conversation
      // This prevents the visible reload that causes flickering
      const currentConvMessages = activeMessages.filter(msg => msg.id !== "welcome");
      if (currentConvMessages.length > 0) {
        console.log("[AppContext] CRITICAL FIX: Conversation has existing messages, preventing database reload to eliminate flickering");
        setIsLoadingMessages(false);
        return;
      }
      
      setIsLoadingMessages(true);
      setNewlyCreatedConvId(null);
      try {
        const response = await fetch(`/api/conversations/${currentConversationId}/messages?_t=${Date.now()}`);
        if (response.ok) {
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
        } else {
          console.error("[AppContext] Error fetching initial messages:", response.status, response.statusText);
          setActiveMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error("[AppContext] Error fetching initial messages:", error);
        setActiveMessages([welcomeMessage]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    // CHATGPT-STYLE: Completely eliminate database reloads after streaming
    // Only load messages if we truly need to (new conversation with no messages)
    if (currentConversationId && activeMessages.length === 0) {
      console.log("[AppContext] CHATGPT-STYLE: Loading messages for conversation with no messages");
      loadConversationMessages();
    } else if (currentConversationId === null && activeMessages.length > 1) {
      // Handle welcome message for null conversation (but preserve if we have messages)
      console.log("[AppContext] CHATGPT-STYLE: Resetting to welcome message for null conversation");
      setActiveMessages([welcomeMessage]);
      setIsLoadingMessages(false);
    } else if (currentConversationId === null && activeMessages.length === 0) {
      // Only set welcome if we have no messages at all
      setActiveMessages([welcomeMessage]);
      setIsLoadingMessages(false);
    } else {
      console.log("[AppContext] CHATGPT-STYLE: Preserving", activeMessages.length, "messages - no reload needed");
      setIsLoadingMessages(false);
    }
  }, [currentConversationId, newlyCreatedConvId]);

  // Send Message Mutation
  const sendMessageMutation = useMutation<any, Error, SendMessageParams, { optimisticMessage?: Message }>({
    mutationFn: async ({ content, attachments, conversationId, aiProvider, aiModel, automaticModelSelection }) => {
      const requestBody = {
        content,
        attachments,
        conversationId,
        aiProvider: aiProvider || appSettings.aiProvider,
        aiModel: aiModel || appSettings.aiModel,
        automaticModelSelection: automaticModelSelection ?? appSettings.automaticModelSelection
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
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log("[AppContext mutationFn] Response from /api/messages:", data);
      return data;
    },
    onMutate: async (variables) => {
      console.log("[AppContext onMutate] Setting optimistic message");
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        content: variables.content,
        isUserMessage: true,
        timestamp: new Date(),
        attachments: variables.attachments?.map(att => ({
          name: att.fileName,
          type: att.fileType
        }))
      };
      setActiveMessages(prevMessages => [...prevMessages, optimisticMessage]);
      return { optimisticMessage };
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
        console.log("[AppContext sendMessage onSuccess] Changing currentConversationId from", currentConversationId, "to:", data.conversationId);
        setCurrentConversationIdState(data.conversationId);
      }
      // Always invalidate conversations query to refresh history after ANY message
      console.log('[QUERY_INVALIDATION_DEBUG] Invalidating conversations query after message:', {
        conversationId: data.conversationId,
        isNewConversation: variables.conversationId === null,
        timestamp: new Date().toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      if (variables.conversationId === null && data.conversationId) {
        setNewlyCreatedConvId(data.conversationId);
      } else {
        setNewlyCreatedConvId(null);
      }
    },
    onError: (error, variables, context) => {
      console.error("[AppContext onError] Mutation failed:", error);
      if (context?.optimisticMessage) {
        setActiveMessages(prevMessages => 
          prevMessages.filter(msg => msg.id !== context.optimisticMessage!.id)
        );
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
    console.log("[AppContext selectConversationHandler] Setting currentConversationId to:", id);
    
    // Only update if the conversation ID is actually different
    if (id !== currentConversationId) {
      setCurrentConversationIdState(id);
      
      if (id) {
        console.log("[AppContext selectConversationHandler] New conversation detected, clearing messages and loading");
        // Clear messages immediately to show loading state
        setActiveMessages([]);
        setIsLoadingMessages(true);
        // DON'T set newlyCreatedConvId for existing conversations
        setNewlyCreatedConvId(null);
      }
    } else {
      console.log("[AppContext selectConversationHandler] Same conversation ID, no update needed");
    }
  }, [currentConversationId]);

  const newChatHandler = useCallback(() => {
    console.log("[AppContext newChatHandler] Resetting to new chat");
    setCurrentConversationIdState(null);
    setActiveMessages([welcomeMessage]);
    setNewlyCreatedConvId(null);
    setIsStreamingActive(false);
  }, []);

  const sendMessageHandler = useCallback((params: SendMessageParams) => {
    sendMessageMutation.mutate(params);
  }, [sendMessageMutation]);

  const refreshMessagesHandler = useCallback(async () => {
    console.log("[AppContext] Manual refresh triggered for conversation:", currentConversationId);
    if (!currentConversationId) {
      console.log("[AppContext] No currentConversationId, skipping refresh");
      return;
    }
    
    try {
      console.log("[AppContext] Clearing newlyCreatedConvId before refresh");
      setNewlyCreatedConvId(null);
      
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        try {
          console.log(`[AppContext] Refresh attempt ${attempt + 1}, URL: /api/conversations/${currentConversationId}/messages`);
          const response = await fetch(`/api/conversations/${currentConversationId}/messages?_t=${Date.now()}&attempt=${attempt}`);
          console.log(`[AppContext] Response status: ${response.status}, ok: ${response.ok}`);
          
          if (response.ok) {
            const convMessages = await response.json();
            console.log("[AppContext] Raw API response:", convMessages);
            const messagesArray = Array.isArray(convMessages) ? convMessages : [];
            console.log("[AppContext] Messages array length:", messagesArray.length);
            
            if (messagesArray.length > 0) {
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
              
              console.log("[AppContext] Manual refresh completed, setting", formattedMessages.length, "messages");
              setActiveMessages(formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
              
              queryClient.invalidateQueries({ queryKey: ["conversations", currentConversationId, "messages"] });
              return;
            } else {
              console.warn("[AppContext] Received empty messages array, retrying...");
            }
          } else {
            console.error(`[AppContext] Refresh attempt ${attempt + 1} failed with status:`, response.status);
            const errorText = await response.text();
            console.error("[AppContext] Error response:", errorText);
          }
        } catch (fetchError) {
          console.error(`[AppContext] Fetch error on attempt ${attempt + 1}:`, fetchError);
        }
        
        attempt++;
        if (attempt < maxAttempts) {
          console.log(`[AppContext] Refresh attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("[AppContext] Outer refresh error:", error);
    }
  }, [currentConversationId, queryClient]);

  const setStreamingActiveHandler = useCallback((active: boolean) => {
    console.log("[AppContext] Setting streaming active:", active);
    setIsStreamingActive(active);
  }, []);

  // CHATGPT-STYLE: Optimistic message management for seamless streaming
  const addOptimisticMessageHandler = useCallback((message: Message) => {
    console.log("[AppContext] CHATGPT-STYLE: Adding optimistic message:", message.id);
    setActiveMessages(prevMessages => {
      // Check if this exact message already exists
      const existingIndex = prevMessages.findIndex(msg => msg.id === message.id);
      if (existingIndex !== -1) {
        // Update existing message
        const updated = [...prevMessages];
        updated[existingIndex] = { ...updated[existingIndex], ...message };
        return updated;
      }
      
      // Add new message without removing others
      return [...prevMessages, message].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
  }, []);

  const updateOptimisticMessageHandler = useCallback((id: string, updates: Partial<Message>) => {
    console.log("[AppContext] CHATGPT-STYLE: Updating optimistic message:", id);
    setActiveMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  // Memoize the context value
  const contextValue = useMemo((): AppContextType => ({
    activeSection,
    setActiveSection,
    coachingMode,
    setCoachingMode,
    appSettings,
    messages: activeMessages,
    currentConversationId,
    loadingMessages: isLoadingMessages,
    sendMessage: sendMessageHandler,
    selectConversation: selectConversationHandler,
    newChat: newChatHandler,
    refreshMessages: refreshMessagesHandler,
    setStreamingActive: setStreamingActiveHandler,
    isStreamingActive,
    addOptimisticMessage: addOptimisticMessageHandler,
    updateOptimisticMessage: updateOptimisticMessageHandler,
    loadedSections,
    isSettingsLoaded,
  }), [
    activeSection, setActiveSection, coachingMode, setCoachingMode, appSettings,
    activeMessages, currentConversationId, isLoadingMessages,
    sendMessageHandler, selectConversationHandler, newChatHandler, refreshMessagesHandler,
    setStreamingActiveHandler, isStreamingActive, addOptimisticMessageHandler, updateOptimisticMessageHandler,
    loadedSections, isSettingsLoaded
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