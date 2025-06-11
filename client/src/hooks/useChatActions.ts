import { useCallback } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useFileManagement, AttachedFile } from "@/hooks/useFileManagement"; // Import AttachedFile
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useAppContext, AppSettings } from "@/context/AppContext"; // Import AppSettings

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

      console.log("[useChatActions] Starting streaming with:", {
        aiProvider,
        aiModel,
        automaticModelSelection,
        attachmentsCount: currentAttachedFiles.length
      });

      // Use streaming for real-time AI responses - this handles both user and AI messages
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
