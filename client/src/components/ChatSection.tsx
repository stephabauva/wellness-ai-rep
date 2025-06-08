
import React, { useState, useRef, useEffect } from "react";
import {
  Paperclip,
  Send,
  Upload,
  Camera,
  X,
  FileText,
  Image,
  Video,
  File,
  History,
} from "lucide-react";

import { ChatMessage } from "@/components/ui/chat-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/context/AppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { generatePDF } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ConversationHistory } from "@/components/ConversationHistory";
import { TranscriptionProvider } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
};

type AttachedFile = {
  id: string;
  fileName: string;
  displayName?: string;
  fileType: string;
  fileSize: number;
  url?: string;
};

const welcomeMessage: Message = {
  id: "welcome-message",
  content:
    "Welcome to your AI wellness coach! I'm here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you're focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I'm ready to help. What would you like to work on today?",
  isUserMessage: false,
  timestamp: new Date(),
};

const ChatSection: React.FC = () => {
  const { coachingMode } = useAppContext();
  const [inputMessage, setInputMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [pendingUserMessage, setPendingUserMessage] = useState<{
    content: string;
    timestamp: Date;
    attachments?: any[];
  } | null>(null);

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", currentConversationId || "new"],
    queryFn: async () => {
      if (!currentConversationId) {
        return [welcomeMessage];
      }
      const response = await fetch(
        `/api/conversations/${currentConversationId}/messages`,
      );
      if (!response.ok)
        throw new Error("Failed to fetch conversation messages");
      const convMessages = await response.json();
      return convMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUserMessage: msg.role === "user",
        timestamp: new Date(msg.createdAt),
      }));
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return await response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      attachments,
      conversationId,
    }: {
      content: string;
      attachments: AttachedFile[];
      conversationId: string | null;
    }) => {
      console.log("Sending message with conversation ID:", conversationId);
      const response = await apiRequest("POST", "/api/messages", {
        content,
        conversationId,
        coachingMode,
        aiProvider: settings?.aiProvider || "openai",
        aiModel: settings?.aiModel || "gpt-4o",
        attachments: attachments.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          displayName: file.displayName,
          fileType: file.fileType,
          fileSize: file.fileSize,
        })),
        automaticModelSelection: settings?.automaticModelSelection ?? true,
      });
      console.log("API Response data:", response);
      return response;
    },
    onMutate: async ({ content, attachments }) => {
      setPendingUserMessage({
        content,
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments.map(f => ({ 
          name: f.fileName, 
          type: f.fileType 
        })) : undefined
      });
    },
    onSuccess: (data) => {
      console.log("Message sent successfully:", data);
      const finalConversationId = data.conversationId;
      console.log("Response conversation ID:", finalConversationId);
      console.log("Current conversation ID:", currentConversationId);

      setPendingUserMessage(null);

      if (!currentConversationId) {
        console.log("Updating conversation ID from null to", finalConversationId);
        setCurrentConversationId(finalConversationId);
      }

      queryClient.setQueryData<Message[]>(["messages", finalConversationId], (old = []) => {
        const existingMessages = old || [];
        return [
          ...existingMessages,
          {
            id: data.userMessage.id,
            content: data.userMessage.content,
            isUserMessage: true,
            timestamp: new Date(data.userMessage.timestamp),
            attachments: attachedFiles.length > 0 ? attachedFiles.map(f => ({ 
              name: f.fileName, 
              type: f.fileType 
            })) : undefined
          },
          {
            id: data.aiMessage.id,
            content: data.aiMessage.content,
            isUserMessage: false,
            timestamp: new Date(data.aiMessage.timestamp),
          },
        ];
      });

      setAttachedFiles([]);
      setInputMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error) => {
      console.error("Message send error:", error);
      setPendingUserMessage(null);
    },
  });

  const handleSendMessage = () => {
    if (inputMessage.trim() || attachedFiles.length > 0) {
      sendMessageMutation.mutate({
        content: inputMessage,
        attachments: attachedFiles,
        conversationId: currentConversationId,
      });
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDownloadPDF = () => {
    downloadReportMutation.mutate();
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

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload file");
      return await response.json();
    },
    onSuccess: (data, file) => {
      const attachedFile: AttachedFile = {
        id: data.file.id,
        fileName: data.file.fileName,
        displayName: data.file.displayName || data.file.originalName,
        fileType: file.type,
        fileSize: file.size,
        url: data.file.url,
      };
      setAttachedFiles((prev) => [...prev, attachedFile]);
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/reports/health-pdf", {});
      return response.json();
    },
    onSuccess: (data) => {
      generatePDF(data);
      toast({
        title: "Report downloaded",
        description: "Your health report has been downloaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download the health report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        uploadFileMutation.mutate(file);
      });
    }
  };

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setInputMessage("");
    setAttachedFiles([]);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setInputMessage("");
    setAttachedFiles([]);
    queryClient.invalidateQueries({ queryKey: ["messages", "new"] });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (
      fileType.includes("pdf") ||
      fileType.includes("document") ||
      fileType.includes("text")
    ) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingUserMessage, sendMessageMutation.isPending]);

  let welcomeMessages = [welcomeMessage];
  let messagesToDisplay = messages && messages.length > 0 ? messages : welcomeMessages;

  if (pendingUserMessage) {
    if (!currentConversationId) {
      messagesToDisplay = [
        {
          id: "temp-pending",
          content: pendingUserMessage.content,
          isUserMessage: true,
          timestamp: pendingUserMessage.timestamp,
          attachments: pendingUserMessage.attachments,
        }
      ];
    } else {
      messagesToDisplay = [
        ...messagesToDisplay,
        {
          id: "temp-pending",
          content: pendingUserMessage.content,
          isUserMessage: true,
          timestamp: pendingUserMessage.timestamp,
          attachments: pendingUserMessage.attachments,
        }
      ];
    }
  }

  return (
    <div className="flex flex-col h-full">
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
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              + New Chat
            </Button>
          </div>
        </div>
      </div>

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

      <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            onChange={handleFileChange}
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
            provider={
              (settings?.transcriptionProvider as TranscriptionProvider) ||
              "webspeech"
            }
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

        {sendMessageMutation.isPending && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <div className="h-1 w-1 rounded-full bg-current animate-pulse" />
            <div className="h-1 w-1 rounded-full bg-current animate-pulse delay-75" />
            <div className="h-1 w-1 rounded-full bg-current animate-pulse delay-150" />
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      <ConversationHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectConversation={handleSelectConversation}
        currentConversationId={currentConversationId || undefined}
      />
    </div>
  );
};

export default ChatSection;
