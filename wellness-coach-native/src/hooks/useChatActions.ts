import { useCallback } from "react";
import { useChatMessages } from "./useChatMessages"; // Adjusted path
import { useFileManagement, AttachedFile } from "./useFileManagement"; // Adjusted path, ensure AttachedFile is exported or defined appropriately for RN
import { useStreamingChat } from "./useStreamingChat"; // Adjusted path
import { useAppContext, AppSettings } from "../context/AppContext"; // Adjusted path

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
    attachedFiles,
    clearAttachedFiles,
    uploadFileMutation,
    removeAttachedFile,
  } = useFileManagement();

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

      startStreaming({
        content: inputMessage,
        conversationId: currentConversationId || undefined,
        coachingMode: "weight-loss", // TODO: RN-Adapt - This might come from context or props
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

  // TODO: RN-Adapt - Replace HTMLInputElement with React Native specific file/image picker result
  const handleFileChange = useCallback(
    (e: any /* React.ChangeEvent<HTMLInputElement> */) => {
      // const files = e.target.files; // Web specific
      // For React Native, `e` would be the result from a document/image picker
      // e.g., if (e.assets && e.assets.length > 0) { const file = e.assets[0]; ... }
      // This needs to be adapted based on the chosen picker library.
      // For now, assuming `files` is an array of File-like objects.
      const files = e.target?.files || e.assets; // Placeholder for adaptation
      if (files) {
        Array.from(files).forEach((file: any) => { // TODO: RN-Adapt - `file` needs proper typing from picker
          // uploadFileMutation.mutate(file); // `file` needs to be a File object or adapted
          console.warn("[useChatActions] handleFileChange needs adaptation for RN file objects", file);
        });
      }
      if (e.target) { // Also web specific
        e.target.value = "";
      }
    },
    [uploadFileMutation]
  );

  // TODO: RN-Adapt - Replace HTMLInputElement with React Native specific camera result
  const handleCameraCapture = useCallback(
    (e: any /* React.ChangeEvent<HTMLInputElement> */) => {
      // const files = e.target.files; // Web specific
      // Similar to handleFileChange, adapt based on camera result
      const files = e.target?.files || e.assets; // Placeholder for adaptation
      if (files) {
        Array.from(files).forEach((file: any) => { // TODO: RN-Adapt - `file` needs proper typing
          // uploadFileMutation.mutate(file);
          console.warn("[useChatActions] handleCameraCapture needs adaptation for RN file objects", file);
        });
      }
      if (e.target) { // Web specific
        e.target.value = "";
      }
    },
    [uploadFileMutation]
  );

  const actions = {
    handleSendMessage,
    handleFileChange, // Needs RN adaptation
    handleCameraCapture, // Needs RN adaptation
    removeAttachedFile,
    uploadFileMutation,
    sendMessageMutation,
    attachedFiles,
    clearAttachedFiles,
    streamingMessage,
    isConnected,
    isThinking,
    stopStreaming,
    pendingUserMessage,
  };

  return actions;
}

export type UseChatActionsReturn = ReturnType<typeof useChatActions>;
