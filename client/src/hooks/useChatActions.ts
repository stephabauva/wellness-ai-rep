import { useCallback } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useFileManagement, AttachedFile } from "@shared/hooks/useFileManagement"; // Import AttachedFile
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useAppContext, AppSettings } from "@shared"; // Import AppSettings

// Define the props for the hook
interface UseChatActionsProps {
  inputMessage: string;
  setInputMessage: React.Dispatch<React.SetStateAction<string>>;
  currentConversationId: string | null;
}

export function useChatActions({
  inputMessage,
  setInputMessage,
  currentConversationId,
}: UseChatActionsProps) {
  const { appSettings, selectConversation, addOptimisticMessage }: { 
    appSettings?: AppSettings, 
    selectConversation?: (id: string | null) => void,
    addOptimisticMessage?: (message: any) => void 
  } = useAppContext();
  const { sendMessageMutation } = useChatMessages();
  const {
    attachedFiles, // This will now be Array<AttachedFile>
    // setAttachedFiles, // Not directly used by actions, but by FileManagement hook
    clearAttachedFiles,
    uploadFileMutation,
    removeAttachedFile,
  } = useFileManagement();

  // Streaming chat functionality
  const {
    streamingMessage,
    isConnected,
    isThinking,
    startStreaming,
    stopStreaming,
    pendingUserMessage
  } = useStreamingChat({
    onConversationCreate: (conversationId: string) => {
      console.log('[useChatActions] onConversationCreate called with:', conversationId);
      if (selectConversation) {
        selectConversation(conversationId);
      }
    },
    onUserMessageSent: (userMessage: any) => {
      // CRITICAL FIX: This will be handled by adding a state for pending user message
      console.log('[useChatActions] User message sent:', userMessage);
    }
  });

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() || (attachedFiles && attachedFiles.length > 0)) {
      const aiProvider = appSettings?.aiProvider || "openai";
      const aiModel = appSettings?.aiModel || "gpt-4o";

      const currentAttachedFiles: AttachedFile[] = attachedFiles || [];
      const hasImages = currentAttachedFiles.some(file => file.fileType?.startsWith('image/'));
      const automaticModelSelection = appSettings?.automaticModelSelection ?? hasImages;

      // CRITICAL FIX: Add optimistic user message immediately
      if (addOptimisticMessage) {
        const optimisticUserMessage = {
          id: `temp-user-${Date.now()}`,
          content: inputMessage,
          isUserMessage: true,
          timestamp: new Date(),
          attachments: currentAttachedFiles.map(att => ({
            name: att.fileName,
            type: att.fileType
          }))
        };
        console.log("[useChatActions] CHATGPT-STYLE: Adding optimistic user message:", optimisticUserMessage.id);
        addOptimisticMessage(optimisticUserMessage);
      }

      console.log("[useChatActions] Starting streaming with optimistic user message:", {
        aiProvider,
        aiModel,
        automaticModelSelection,
        attachmentsCount: currentAttachedFiles.length
      });

      // Start streaming for AI response
      startStreaming({
        content: inputMessage,
        conversationId: currentConversationId || undefined,
        coachingMode: "weight-loss",
        aiProvider,
        aiModel,
        attachments: currentAttachedFiles,
        automaticModelSelection,
      });

      setInputMessage("");
      clearAttachedFiles();
    }
  }, [
    inputMessage,
    setInputMessage,
    attachedFiles,
    currentConversationId,
    appSettings,
    startStreaming,
    clearAttachedFiles,
    addOptimisticMessage,
  ]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach((file) => {
          uploadFileMutation.mutate(file);
        });
      }
      // It's good practice to clear the input value after selection
      if (e.target) {
        e.target.value = "";
      }
    },
    [uploadFileMutation]
  );

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach((file) => {
          uploadFileMutation.mutate(file);
        });
      }
      if (e.target) {
        e.target.value = "";
      }
    },
    [uploadFileMutation]
  );

  // removeAttachment is already provided by useFileManagement,
  // so we can directly return it or wrap it if additional logic is needed.
  // For now, let's assume useFileManagement().removeAttachedFile is sufficient.

  const actions = {
    handleSendMessage,
    handleFileChange,
    handleCameraCapture,
    removeAttachedFile, // from useFileManagement
    uploadFileMutation, // Exposing for disabled state in UI
    sendMessageMutation, // Exposing for disabled state in UI
    attachedFiles, // Exposing for UI rendering
    clearAttachedFiles, // Exposing for UI interaction (e.g. manually clear all)
    // Streaming functionality
    streamingMessage,
    isConnected,
    isThinking,
    stopStreaming,
    pendingUserMessage,
  };

  return actions;
}

export type UseChatActionsReturn = ReturnType<typeof useChatActions>;
