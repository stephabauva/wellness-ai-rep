import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Send, Mic, MicOff } from "lucide-react";
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

// Add TypeScript definitions for SpeechRecognition
interface SpeechRecognition {
  new(): SpeechRecognition;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognition;
    webkitSpeechRecognition: SpeechRecognition;
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type Message = {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
};

const ChatSection: React.FC = () => {
  const { coachingMode, setCoachingMode } = useAppContext();
  const [inputMessage, setInputMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        aiProvider: settings?.aiProvider || "google",
        aiModel: settings?.aiModel || "gemini-2.0-flash-exp"
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
  
  // Handle voice input
  const toggleVoiceInput = () => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  };
  
  const startListening = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Use the SpeechRecognition API
      // Use any type to work around TypeScript limitations with browser APIs
      const SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as any;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Speak now to add your message.",
        });
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => prev + transcript);
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast({
          title: "Error",
          description: "There was a problem with voice recognition.",
          variant: "destructive"
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    } catch (error) {
      console.error('Failed to initialize speech recognition', error);
      toast({
        title: "Error",
        description: "Failed to initialize speech recognition.",
        variant: "destructive"
      });
      setIsListening(false);
    }
  };
  
  const stopListening = () => {
    setIsListening(false);
    // The recognition will stop automatically due to onend event
  };
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Chat Mode Selector */}
      <div className="p-4 border-b border-border bg-card sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Wellness Coach</h1>
        <div className="hidden md:flex items-center ml-4">
          <CoachSelect value={coachingMode} onValueChange={setCoachingMode} />
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 px-4 py-6 space-y-4 chat-container overflow-y-auto">
        {loadingMessages ? (
          // Loading state
          <>
            <div className="flex items-start">
              <Skeleton className="h-10 w-10 rounded-full mr-4" />
              <Skeleton className="h-24 w-2/3 rounded-[18px]" />
            </div>
            <div className="flex items-start justify-end">
              <Skeleton className="h-16 w-1/2 rounded-[18px]" />
            </div>
            <div className="flex items-start">
              <Skeleton className="h-10 w-10 rounded-full mr-4" />
              <Skeleton className="h-32 w-2/3 rounded-[18px]" />
            </div>
          </>
        ) : (
          // Messages
          messages?.map((message) => (
            <ChatMessage
              key={message.id}
              message={message.content}
              isUser={message.isUserMessage}
              timestamp={new Date(message.timestamp)}
            />
          ))
        )}
        
        {/* Typing indicator during send */}
        {sendMessageMutation.isPending && (
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-4">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="message-bubble ai-message p-3 shadow-sm">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card sticky bottom-0">
        <div className="flex items-center rounded-lg bg-muted p-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Attach file">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button 
            onClick={toggleVoiceInput}
            variant="ghost" 
            size="icon" 
            className={`ml-1 text-muted-foreground hover:text-foreground ${isListening ? 'text-red-500 hover:text-red-600' : ''}`}
            title={isListening ? "Stop voice input" : "Voice input"}
            aria-label={isListening ? "Stop voice input" : "Voice input"}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button 
            onClick={handleSendMessage} 
            disabled={sendMessageMutation.isPending || !inputMessage.trim()} 
            className="ml-2 rounded-full h-10 w-10 p-0"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground flex justify-between items-center">
          <span>Powered by WellnessAI</span>
          <Button 
            variant="link" 
            size="sm" 
            className="text-primary hover:text-primary/80"
            onClick={handleDownloadPDF}
            disabled={downloadReportMutation.isPending}
          >
            Download Health Report (PDF)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;
