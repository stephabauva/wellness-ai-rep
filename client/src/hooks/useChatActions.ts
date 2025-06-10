import { useCallback } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useFileManagement, AttachedFile } from "@/hooks/useFileManagement"; // Import AttachedFile
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
  const { settings }: { settings?: AppSettings } = useAppContext(); // Apply AppSettings type
  const { sendMessageMutation } = useChatMessages();
  const {
    attachedFiles, // This will now be Array<AttachedFile>
    // setAttachedFiles, // Not directly used by actions, but by FileManagement hook
    clearAttachedFiles,
    uploadFileMutation,
    removeAttachedFile,
  } = useFileManagement();

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() || (attachedFiles && attachedFiles.length > 0)) {
      const aiProvider = settings?.aiProvider || "openai";
      const aiModel = settings?.aiModel || "gpt-4o";

      const currentAttachedFiles: AttachedFile[] = attachedFiles || []; // Ensure type correctness
      const hasImages = currentAttachedFiles.some(file => file.fileType?.startsWith('image/'));
      const automaticModelSelection = settings?.automaticModelSelection ?? hasImages;

      console.log("[useChatActions] Effective AI Settings for send:", {
        contextSettings: settings, // Log the whole settings object from context
        resolvedAiProvider: aiProvider,
        resolvedAiModel: aiModel,
        resolvedAutomaticModelSelection: automaticModelSelection
      });

      sendMessageMutation.mutate({
        content: inputMessage,
        attachments: currentAttachedFiles,
        conversationId: currentConversationId,
        aiProvider,
        aiModel,
        automaticModelSelection,
      });

      setInputMessage("");
      clearAttachedFiles();
    }
  }, [
    inputMessage,
    setInputMessage, // Added setInputMessage
    attachedFiles,
    currentConversationId,
    settings,
    sendMessageMutation,
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
  };

  return actions;
}

export type UseChatActionsReturn = ReturnType<typeof useChatActions>;
