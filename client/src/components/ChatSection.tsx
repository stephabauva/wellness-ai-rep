
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Paperclip, Send, Mic, MicOff, Camera, History } from "lucide-react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useFileManagement } from "@/hooks/useFileManagement";
import { generateMessagesToDisplay } from "@/utils/chatUtils";
import { ChatMessage } from "@/components/ui/chat-message";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ConversationHistory } from "@/components/ConversationHistory";
import { useAppContext } from "@/context/AppContext";

export function ChatSection() {
  // All hooks must be called in the same order every render
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isConversationHistoryOpen, setIsConversationHistoryOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { settings } = useAppContext();
  
  const {
    messages,
    currentConversationId,
    pendingUserMessage,
    welcomeMessage,
    sendMessageMutation,
    setCurrentConversationId,
    loadingMessages
  } = useChatMessages();

  const {
    attachedFiles,
    setAttachedFiles,
    clearAttachedFiles,
    uploadFileMutation,
    getFileIcon
  } = useFileManagement();

  // Scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingUserMessage]);

  // Generate messages to display
  const messagesToDisplay = generateMessagesToDisplay(
    messages,
    pendingUserMessage,
    currentConversationId,
    welcomeMessage
  );

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() || attachedFiles.length > 0) {
      const aiProvider = settings?.aiProvider || "openai";
      const aiModel = settings?.aiModel || "gpt-4o";
      const automaticModelSelection = settings?.automaticModelSelection || false;

      sendMessageMutation.mutate({
        content: inputMessage,
        attachments: attachedFiles,
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
    attachedFiles,
    currentConversationId,
    settings,
    sendMessageMutation,
    clearAttachedFiles
  ]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        uploadFileMutation.mutate(file);
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadFileMutation]);

  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        uploadFileMutation.mutate(file);
      });
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  }, [uploadFileMutation]);

  const removeAttachment = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  }, [setAttachedFiles]);

  const handleRecordingComplete = useCallback((audioBlob: Blob) => {
    const audioFile = new File([audioBlob], "recording.webm", {
      type: "audio/webm;codecs=opus"
    });
    uploadFileMutation.mutate(audioFile);
    setIsRecording(false);
  }, [uploadFileMutation]);

  const handleConversationSelect = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsConversationHistoryOpen(false);
  }, [setCurrentConversationId]);

  if (loadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Wellness Coach</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConversationHistoryOpen(true)}
        >
          <History className="h-4 w-4 mr-2" />
          History
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesToDisplay?.map((message) => (
          <ChatMessage
            key={message.id}
            message={message.content}
            isUser={message.isUserMessage}
            timestamp={message.timestamp}
            attachments={message.attachments}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pb-2">
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="relative bg-secondary rounded-lg p-2 min-w-0"
                  >
                    {file.fileType.startsWith("image/") ? (
                      <div className="relative">
                        <img
                          src={`/uploads/${file.fileName}`}
                          alt={file.displayName}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <button
                          onClick={() => removeAttachment(file.id)}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/80"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 max-w-[150px]">
                        {getFileIcon(file.fileType)}
                        <span className="text-xs truncate">
                          {file.displayName}
                        </span>
                        <button
                          onClick={() => removeAttachment(file.id)}
                          className="text-destructive hover:text-destructive/80 ml-1"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          {/* File Upload Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadFileMutation.isPending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Camera Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploadFileMutation.isPending}
          >
            <Camera className="h-4 w-4" />
          </Button>

          {/* Audio Recording */}
          <div className="relative">
            {isRecording ? (
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onCancel={() => setIsRecording(false)}
              />
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsRecording(true)}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Text Input */}
          <div className="flex-1">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={sendMessageMutation.isPending}
              className="resize-none"
            />
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || (!inputMessage.trim() && attachedFiles.length === 0)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Conversation History Modal */}
      <ConversationHistory
        isOpen={isConversationHistoryOpen}
        onClose={() => setIsConversationHistoryOpen(false)}
        onConversationSelect={handleConversationSelect}
      />
    </div>
  );
}
