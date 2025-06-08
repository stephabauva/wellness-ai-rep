import React, { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Send,
  Upload,
  Camera,
  X,
  History,
} from "lucide-react";

import { ChatMessage } from "@/components/ui/chat-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ConversationHistory } from "@/components/ConversationHistory";
import { TranscriptionProvider } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Custom hooks
import { useFileManagement } from "@/hooks/useFileManagement";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useReportGeneration } from "@/hooks/useReportGeneration";

// Utilities
import { getFileIcon, generateMessagesToDisplay } from "@/utils/chatUtils";

const welcomeMessage = {
  id: "welcome-message",
  content:
    "Welcome to your AI wellness coach! I'm here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you're focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I'm ready to help. What would you like to work on today?",
  isUserMessage: false,
  timestamp: new Date(),
};

const ChatSection: React.FC = () => {
  const [inputMessage, setInputMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Custom hooks
  const {
    attachedFiles,
    uploadFileMutation,
    removeAttachedFile,
    clearAttachedFiles,
    handleFileChange,
  } = useFileManagement();

  const {
    messages,
    loadingMessages,
    currentConversationId,
    pendingUserMessage,
    sendMessageMutation,
    handleSelectConversation,
    handleNewChat,
  } = useChatMessages();

  const { downloadReportMutation, handleDownloadPDF } = useReportGeneration();

  // Event handlers
  const handleSendMessage = () => {
    if (inputMessage.trim() || attachedFiles.length > 0) {
      sendMessageMutation.mutate({
        content: inputMessage,
        attachments: attachedFiles,
        conversationId: currentConversationId,
      });
      setInputMessage("");
      clearAttachedFiles();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTranscriptionComplete = (text: string) => {
    setInputMessage((prev) => prev + (prev ? " " : "") + text);
  };

  const handleFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(event.target.files);
  };

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const handleNewChatWithCleanup = () => {
    handleNewChat();
    setInputMessage("");
    clearAttachedFiles();
  };

  const handleSelectConversationWithCleanup = (conversationId: string) => {
    handleSelectConversation(conversationId);
    setInputMessage("");
    clearAttachedFiles();
  };

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingUserMessage, sendMessageMutation.isPending]);

  // Force scroll on conversation change
  useEffect(() => {
    if (currentConversationId) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [currentConversationId]);

  // Force scroll when loading finishes
  useEffect(() => {
    if (!loadingMessages && messages && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [loadingMessages, messages]);

  // Generate messages to display
  const messagesToDisplay = generateMessagesToDisplay(
    messages,
    pendingUserMessage,
    currentConversationId,
    welcomeMessage
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI Wellness Coach</h2>
            <p className="text-sm text-muted-foreground">
              Your personal health and wellness companion
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewChatWithCleanup}>
              + New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          messagesToDisplay?.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.content}
              isUser={message.isUserMessage}
              timestamp={message.timestamp}
              attachments={message.attachments}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="relative bg-secondary rounded-lg p-2 max-w-48"
              >
                {file.fileType.startsWith("image/") ? (
                  <div className="space-y-2">
                    <img
                      src={`/uploads/${file.fileName}`}
                      alt={file.displayName || file.fileName}
                      className="w-full h-20 object-cover rounded"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate flex-1">
                        {file.displayName || file.fileName}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground ml-1"
                        onClick={() => removeAttachedFile(file.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.fileType)}
                    <span className="text-xs truncate max-w-32">
                      {file.displayName || file.fileName}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeAttachedFile(file.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Controls */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your health, fitness goals, or wellness plans..."
              className="pr-12"
              disabled={sendMessageMutation.isPending}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={downloadReportMutation.isPending}
                title="Attach file or capture photo"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleFileImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCameraCapture}>
                <Camera className="h-4 w-4 mr-2" />
                Take Picture
                <span className="text-xs text-muted-foreground ml-2">
                  (Mobile: Camera, Desktop: File)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <Paperclip className="h-4 w-4 mr-2" />
                Download Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            multiple
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleCameraChange}
            style={{ display: "none" }}
          />

          <AudioRecorder
            onTranscriptionComplete={handleTranscriptionComplete}
            provider="webspeech"
            disabled={sendMessageMutation.isPending}
          />

          <Button
            onClick={handleSendMessage}
            disabled={
              (!inputMessage.trim() && attachedFiles.length === 0) ||
              sendMessageMutation.isPending
            }
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading Indicator */}
        {sendMessageMutation.isPending && (
          <div className="flex items-center gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" />
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce delay-100" />
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce delay-200" />
            </div>
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              🤖 AI is processing your message...
            </span>
          </div>
        )}
      </div>

      {/* Conversation History Modal */}
      <ConversationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectConversation={handleSelectConversationWithCleanup}
        currentConversationId={currentConversationId || undefined}
      />
    </div>
  );
};

export default ChatSection;