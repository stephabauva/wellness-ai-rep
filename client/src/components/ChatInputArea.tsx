import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, Camera } from "lucide-react"; // Mic removed as AudioRecorder handles its own icon
import { AudioRecorder } from "@/components/AudioRecorder";
import { UseChatActionsReturn } from "@/hooks/useChatActions";
import { AppSettings } from "@/context/AppContext"; // Corrected import path
import { AttachedFile } from "@/hooks/useFileManagement"; // Import AttachedFile

interface ChatInputAreaProps {
  inputMessage: string;
  setInputMessage: React.Dispatch<React.SetStateAction<string>>;
  chatActions: UseChatActionsReturn;
  settings: AppSettings | null | undefined; // Match AppContext type (settings is optional)
}

export function ChatInputArea({
  inputMessage,
  setInputMessage,
  chatActions,
  settings,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Type assertion for chatActions to ensure correct types from the hook
  const {
    handleSendMessage,
    handleFileChange,
    handleCameraCapture,
    uploadFileMutation,
    sendMessageMutation,
    attachedFiles, // Used for disabling send button, now correctly typed as AttachedFile[] | null
  } = chatActions as UseChatActionsReturn;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-end gap-2">
        {/* File Upload Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadFileMutation.isPending}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Camera Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploadFileMutation.isPending}
          aria-label="Use camera"
        >
          <Camera className="h-4 w-4" />
        </Button>

        {/* Audio Recording */}
        <AudioRecorder
          onTranscriptionComplete={(text) => setInputMessage(text)}
          provider={(settings?.transcriptionProvider as any) || "webspeech"}
        />

        {/* Text Input */}
        <div className="flex-1">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sendMessageMutation.isPending}
            className="resize-none" // Consider using Textarea if multi-line is desired and not just auto-height
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={
            sendMessageMutation.isPending ||
            (!inputMessage.trim() &&
             (!attachedFiles || (attachedFiles as AttachedFile[]).length === 0) // Ensure attachedFiles is treated as array
            )
          }
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden File Inputs */}
      <input
        data-testid="file-input-upload"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        multiple
        className="hidden"
      />
      <input
        data-testid="file-input-camera"
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
    </div>
  );
}
