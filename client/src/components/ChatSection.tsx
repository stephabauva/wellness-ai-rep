import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Send, Upload, Camera } from "lucide-react";
import { CoachSelect } from "@/components/ui/coach-select";
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
import { TranscriptionProvider } from "@shared/schema";
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

const ChatSection: React.FC = () => {
  const { coachingMode, setCoachingMode } = useAppContext();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Get chat history
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['/api/messages'],
    queryFn: async () => {
      const response = await fetch('/api/messages');
      if (!response.ok) throw new Error('Failed to fetch messages');
      return await response.json() as Message[];
    }
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
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/messages', { 
        content, 
        coachingMode,
        aiProvider: settings?.aiProvider || "openai",
        aiModel: settings?.aiModel || "gpt-4o"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
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
    if (inputMessage.trim()) {
      sendMessageMutation.mutate(inputMessage);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle the selected file
      const fileInfo = `[File: ${file.name} (${(file.size / 1024).toFixed(1)}KB)]`;
      setInputMessage(prev => prev + (prev ? ' ' : '') + fileInfo);
      toast({
        title: "File attached",
        description: `${file.name} has been attached to your message.`,
      });
    }
  };

  const handleCameraChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle the captured photo
      const photoInfo = `[Photo: ${file.name} (${(file.size / 1024).toFixed(1)}KB)]`;
      setInputMessage(prev => prev + (prev ? ' ' : '') + photoInfo);
      toast({
        title: "Photo captured",
        description: "Your photo has been attached to the message.",
      });
    }
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
            <CoachSelect value={coachingMode} onValueChange={setCoachingMode} />
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
              content={message.content}
              isUserMessage={message.isUserMessage}
              timestamp={message.timestamp}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            capture="environment"
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
            disabled={!inputMessage.trim() || sendMessageMutation.isPending}
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
    </div>
  );
};

export default ChatSection;