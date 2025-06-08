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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Grid3X3, List, Image as ImageIcon } from "lucide-react";

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

interface FileManagerFile {
  id: string;
  fileName: string;
  displayName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
}

const ChatSection: React.FC = () => {
  const [inputMessage, setInputMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [fileManagerViewMode, setFileManagerViewMode] = useState<'list' | 'list-with-icons' | 'grid'>('list');
  const [selectedManagerFiles, setSelectedManagerFiles] = useState<Set<string>>(new Set());
  const [managerFiles, setManagerFiles] = useState<FileManagerFile[]>([]);
  const [loadingManagerFiles, setLoadingManagerFiles] = useState(false);
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
    setAttachedFiles,
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

  const handleOpenFileManager = async () => {
    setShowFileManager(true);
    setLoadingManagerFiles(true);
    setSelectedManagerFiles(new Set());
    
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const files = await response.json();
        setManagerFiles(files);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoadingManagerFiles(false);
    }
  };

  const handleSelectManagerFile = (fileId: string) => {
    const newSelected = new Set(selectedManagerFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedManagerFiles(newSelected);
  };

  const handleSelectAllManagerFiles = () => {
    if (selectedManagerFiles.size === managerFiles.length) {
      setSelectedManagerFiles(new Set());
    } else {
      setSelectedManagerFiles(new Set(managerFiles.map(f => f.id)));
    }
  };

  const handleImportSelectedFiles = () => {
    const filesToImport = managerFiles.filter(f => selectedManagerFiles.has(f.id));
    
    filesToImport.forEach(file => {
      const attachedFile = {
        id: file.id,
        fileName: file.fileName,
        displayName: file.displayName,
        fileType: file.fileType,
        fileSize: file.fileSize,
      };
      setAttachedFiles(prev => {
        // Avoid duplicates
        if (prev.find(f => f.id === file.id)) return prev;
        return [...prev, attachedFile];
      });
    });
    
    setShowFileManager(false);
    setSelectedManagerFiles(new Set());
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
              <DropdownMenuItem onClick={handleOpenFileManager}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Import from File Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleFileImport}>
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
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
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <div className="h-1 w-1 rounded-full bg-current animate-pulse" />
            <div className="h-1 w-1 rounded-full bg-current animate-pulse delay-75" />
            <div className="h-1 w-1 rounded-full bg-current animate-pulse delay-150" />
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      {/* File Manager Modal */}
      <Dialog open={showFileManager} onOpenChange={setShowFileManager}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Import Files from File Manager
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={managerFiles.length > 0 && selectedManagerFiles.size === managerFiles.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedManagerFiles.size > 0 && selectedManagerFiles.size < managerFiles.length;
                  }}
                  onCheckedChange={handleSelectAllManagerFiles}
                  disabled={loadingManagerFiles}
                />
                <span className="text-sm font-medium">
                  {selectedManagerFiles.size > 0 ? `${selectedManagerFiles.size} selected` : 'Select all'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    variant={fileManagerViewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFileManagerViewMode('list')}
                    className="h-7 w-7 p-0"
                    title="List view"
                  >
                    <List className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={fileManagerViewMode === 'list-with-icons' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFileManagerViewMode('list-with-icons')}
                    className="h-7 w-7 p-0"
                    title="List with icons"
                  >
                    <ImageIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant={fileManagerViewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFileManagerViewMode('grid')}
                    className="h-7 w-7 p-0"
                    title="Grid view"
                  >
                    <Grid3X3 className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button 
                  onClick={handleImportSelectedFiles}
                  disabled={selectedManagerFiles.size === 0}
                  size="sm"
                >
                  Import {selectedManagerFiles.size > 0 ? selectedManagerFiles.size : ''} Files
                </Button>
              </div>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-auto">
              {loadingManagerFiles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <div className="h-8 w-8 animate-spin mx-auto text-muted-foreground">⚪</div>
                    <p className="text-muted-foreground">Loading files...</p>
                  </div>
                </div>
              ) : managerFiles.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No files found</h3>
                    <p className="text-muted-foreground text-center">
                      Upload some files to see them here.
                    </p>
                  </CardContent>
                </Card>
              ) : fileManagerViewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {managerFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`relative border rounded-lg p-3 transition-colors cursor-pointer ${
                        selectedManagerFiles.has(file.id) ? "bg-accent border-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectManagerFile(file.id)}
                    >
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedManagerFiles.has(file.id)}
                          onCheckedChange={() => handleSelectManagerFile(file.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="flex flex-col items-center space-y-2 mt-6">
                        <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                          {file.fileType.startsWith('image/') ? (
                            <img
                              src={`/uploads/${file.fileName}`}
                              alt={file.displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`flex items-center justify-center w-full h-full ${file.fileType.startsWith('image/') ? 'hidden' : ''}`}>
                            {getFileIcon(file.fileType)}
                          </div>
                        </div>

                        <div className="text-center space-y-1 w-full">
                          <h4 className="text-xs font-medium truncate" title={file.displayName}>
                            {file.displayName}
                          </h4>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(file.uploadDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="space-y-2 p-4">
                    {managerFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          selectedManagerFiles.has(file.id) ? "bg-accent" : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleSelectManagerFile(file.id)}
                      >
                        <Checkbox
                          checked={selectedManagerFiles.has(file.id)}
                          onCheckedChange={() => handleSelectManagerFile(file.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        {fileManagerViewMode === 'list-with-icons' && (
                          <div className="flex-shrink-0 w-10 h-10 bg-muted rounded overflow-hidden flex items-center justify-center">
                            {file.fileType.startsWith('image/') ? (
                              <img
                                src={`/uploads/${file.fileName}`}
                                alt={file.displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`flex items-center justify-center w-full h-full ${file.fileType.startsWith('image/') ? 'hidden' : ''}`}>
                              {getFileIcon(file.fileType)}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">
                            {file.displayName}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>{formatDate(file.uploadDate)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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