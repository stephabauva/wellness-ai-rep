
import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Send, Upload, Camera, X, FileText, Image, Video, File, History } from "lucide-react";

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
};

type AttachedFile = {
  id: string;
  fileName: string; // Backend storage filename
  displayName?: string; // Original filename for display
  fileType: string;
  fileSize: number;
  url?: string;
};

// Define a static welcome message to be reused
const welcomeMessage: Message = {
  id: 'welcome-message',
  content: 'Welcome to your AI wellness coach! I\'m here to support you on your wellness journey with personalized guidance tailored to your goals. Whether you\'re focused on weight loss, muscle gain, fitness, mental wellness, or nutrition, I\'m ready to help. What would you like to work on today?',
  isUserMessage: false,
  timestamp: new Date()
};

const ChatSection: React.FC = () => {
  const { coachingMode, setCoachingMode } = useAppContext();
  const [inputMessage, setInputMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Create a consistent query key based on the conversation ID
  const messagesQueryKey = currentConversationId ? ['messages', currentConversationId] : ['messages', 'new'];

  // Get chat history for current conversation
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: messagesQueryKey,
    queryFn: async () => {
      // Handle the "new chat" case directly instead of a separate API call
      if (!currentConversationId) {
        return [welcomeMessage];
      }

      // Get conversation messages
      const response = await fetch(`/api/conversations/${currentConversationId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch conversation messages');
      const convMessages = await response.json();

      // Convert to a consistent format
      return convMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUserMessage: msg.role === 'user',
        timestamp: new Date(msg.createdAt)
      }));
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Get user settings for AI configuration
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments: AttachedFile[] }) => {
      console.log(`Sending message with conversation ID: ${currentConversationId}`);
      return apiRequest('POST', '/api/messages', { 
        content, 
        conversationId: currentConversationId, // Will be null for the first message
        coachingMode,
        aiProvider: settings?.aiProvider || "openai",
        aiModel: settings?.aiModel || "gpt-4o",
        attachments: attachments.map(file => ({
          id: file.id,
          fileName: file.fileName,
          displayName: file.displayName,
          fileType: file.fileType,
          fileSize: file.fileSize
        })),
        automaticModelSelection: settings?.automaticModelSelection ?? true
      });
    },
    onMutate: async ({ content }) => {
      // Use the consistent query key from above
      await queryClient.cancelQueries({ queryKey: messagesQueryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(messagesQueryKey);

      const optimisticUserMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        isUserMessage: true,
        timestamp: new Date()
      };

      // Update the currently active query optimistically
      queryClient.setQueryData<Message[]>(messagesQueryKey, (old = []) => [
        ...old,
        optimisticUserMessage
      ]);

      return { previousMessages, messagesQueryKey };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(context.messagesQueryKey, context.previousMessages);
      }
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    },
    onSuccess: (data, variables, context) => {
      console.log('Message sent successfully:', data);
      console.log(`Response conversation ID: ${data?.conversationId}`);
      console.log(`Current conversation ID: ${currentConversationId}`);
      
      // This is the core fix for the first message display
      const isFirstMessage = !currentConversationId;

      if (isFirstMessage && data?.conversationId) {
        const newConversationId = data.conversationId;
        const newConversationQueryKey = ['messages', newConversationId];

        // 1. Get the current optimistic state from the 'new' chat cache
        const optimisticMessages = queryClient.getQueryData<Message[]>(['messages', 'new']) || [];

        // 2. Remove the temporary optimistic message
        const finalMessages = optimisticMessages.filter(msg => !msg.id.startsWith('temp-'));

        // 3. Add the real messages from the server response
        finalMessages.push({
          id: data.userMessage.id,
          content: data.userMessage.content,
          isUserMessage: true,
          timestamp: new Date(data.userMessage.timestamp)
        });
        finalMessages.push({
          id: data.aiMessage.id,
          content: data.aiMessage.content,
          isUserMessage: false,
          timestamp: new Date(data.aiMessage.timestamp)
        });

        // 4. Pre-populate the cache for the new conversation ID
        queryClient.setQueryData(newConversationQueryKey, finalMessages);

        // 5. Remove the 'new' chat query from cache to ensure it's fresh next time
        queryClient.removeQueries({ queryKey: ['messages', 'new'] });

        // 6. NOW update the state to switch to the new conversation
        setCurrentConversationId(newConversationId);

      } else {
        // This is for subsequent messages in an existing conversation
        queryClient.setQueryData<Message[]>(context.messagesQueryKey, (old = []) => {
          // Replace optimistic message with real messages
          const existingMessages = old.filter(msg => !msg.id.startsWith('temp-'));
          return [
            ...existingMessages,
            {
              id: data.userMessage.id,
              content: data.userMessage.content,
              isUserMessage: true,
              timestamp: new Date(data.userMessage.timestamp)
            },
            {
              id: data.aiMessage.id,
              content: data.aiMessage.content,
              isUserMessage: false,
              timestamp: new Date(data.aiMessage.timestamp)
            }
          ];
        });
      }

      // Invalidate the list of conversations so the history panel updates
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });

      setAttachedFiles([]);
    }
  });

  // Download PDF report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/reports/health-pdf', {});
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
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (inputMessage.trim() || attachedFiles.length > 0) {
      sendMessageMutation.mutate({ 
        content: inputMessage, 
        attachments: attachedFiles 
      });
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDownloadPDF = () => {
    downloadReportMutation.mutate();
  };

  const handleTranscriptionComplete = (text: string) => {
    setInputMessage(prev => prev + (prev ? ' ' : '') + text);
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
      formData.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload file');
      return await response.json();
    },
    onSuccess: (data, file) => {
      const attachedFile: AttachedFile = {
        id: data.file.id,
        fileName: data.file.fileName,
        displayName: data.file.displayName || data.file.originalName,
        fileType: file.type,
        fileSize: file.size,
        url: data.file.url
      };
      setAttachedFiles(prev => [...prev, attachedFile]);
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setInputMessage("");
    setAttachedFiles([]);
  };

  // Simplified and corrected "New Chat" handler
  const handleNewChat = () => {
    console.log('Starting new chat - resetting state');
    setCurrentConversationId(null); // This will trigger useQuery to use ['messages', 'new']
    setInputMessage("");
    setAttachedFiles([]);
    // Optionally, invalidate the query to be certain it re-fetches
    queryClient.invalidateQueries({ queryKey: ['messages', 'new'] });
    console.log('New chat initialized');
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
            >
              + New Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
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
          messages?.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.content}
              isUser={message.isUserMessage}
              timestamp={message.timestamp}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Attached files display */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file) => (
              <Badge key={file.id} variant="secondary" className="flex items-center gap-2 pr-1">
                {getFileIcon(file.fileType)}
                <span className="text-xs truncate max-w-32">{file.displayName || file.fileName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeAttachedFile(file.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
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
                <span className="text-xs text-muted-foreground ml-2">(Mobile: Camera, Desktop: File)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <Paperclip className="h-4 w-4 mr-2" />
                Download Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleCameraChange}
            style={{ display: 'none' }}
          />

          <AudioRecorder
            onTranscriptionComplete={handleTranscriptionComplete}
            provider={(settings?.transcriptionProvider as TranscriptionProvider) || "webspeech"}
            disabled={sendMessageMutation.isPending}
          />

          <Button 
            onClick={handleSendMessage} 
            disabled={(!inputMessage.trim() && attachedFiles.length === 0) || sendMessageMutation.isPending}
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
