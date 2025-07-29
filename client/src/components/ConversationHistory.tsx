
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { History, MessageSquare, Clock, Search, X, Sparkles, Archive } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  hasAttachments?: boolean;
};

type ConversationHistoryProps = {
  isOpen: boolean;
  onClose: () => void;
  onConversationSelect: (conversationId: string) => void;
  currentConversationId?: string;
};

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  isOpen,
  onClose,
  onConversationSelect,
  currentConversationId
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['/api/conversations'],
    queryFn: async () => {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return await response.json() as Conversation[];
    },
    enabled: isOpen,
    staleTime: 0, // Always refetch when opening
    gcTime: 0  // Don't cache conversations to ensure fresh data
  });

  // Refetch conversations when modal opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const filteredConversations = conversations?.filter(conv =>
    conv.title?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Use conditional rendering instead of early return to avoid hook violations
  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
      <Card className="w-full max-w-3xl h-[85vh] mx-auto shadow-2xl border-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 animate-in slide-in-from-bottom-4 duration-500 flex flex-col">
        {/* Header with gradient and enhanced styling */}
        <CardHeader className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-b border-border/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
                <History className="h-5 w-5 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Conversation History
              </span>
              <Badge variant="secondary" className="ml-2 text-xs font-medium bg-primary/10 text-primary border-primary/20">
                {filteredConversations.length} conversations
              </Badge>
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
            >
              <X className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 flex flex-col flex-1 overflow-hidden">
          {/* Enhanced search with modern styling */}
          <div className="relative group mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
              <Input
                placeholder="Search your conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 bg-background/50 backdrop-blur-sm border-2 border-border/50 rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all duration-200 text-base"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg opacity-60 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Content area with enhanced scroll and styling */}
          <div className="flex-1 overflow-y-auto px-8 py-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className="relative group"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="bg-gradient-to-r from-muted/80 via-muted/40 to-muted/80 h-20 rounded-2xl animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer" />
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-2xl opacity-50" />
                  <div className="relative p-6 bg-gradient-to-br from-muted/50 to-muted/80 rounded-2xl inline-block">
                    {searchTerm ? (
                      <Search className="h-12 w-12 mx-auto text-muted-foreground/60" />
                    ) : (
                      <Archive className="h-12 w-12 mx-auto text-muted-foreground/60" />
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm ? 'No matching conversations' : 'No conversations yet'}
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                  {searchTerm 
                    ? `No conversations found matching "${searchTerm}". Try a different search term.`
                    : 'Start a new conversation to see it appear here. Your chat history will be saved automatically.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConversations.map((conversation, index) => (
                  <div
                    key={conversation.id}
                    className="group relative animate-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {/* Background glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Main card */}
                    <Card
                      className={`relative cursor-pointer border-2 transition-all duration-300 ease-out rounded-2xl overflow-hidden group-hover:shadow-lg group-hover:scale-[1.02] group-hover:-translate-y-1 ${
                        currentConversationId === conversation.id 
                          ? 'border-primary/50 bg-gradient-to-br from-primary/5 via-background to-secondary/5 shadow-lg shadow-primary/10' 
                          : 'border-border/50 bg-gradient-to-br from-background via-background to-muted/20 hover:border-primary/30'
                      }`}
                      onClick={() => {
                        onConversationSelect(conversation.id);
                        onClose();
                      }}
                    >
                      {/* Active conversation indicator */}
                      {currentConversationId === conversation.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary" />
                      )}
                      
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Conversation title */}
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 p-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
                                <MessageSquare className="h-4 w-4 text-primary" />
                              </div>
                              <h3 className="font-semibold text-foreground truncate text-base leading-tight">
                                {conversation.title || 'Untitled Conversation'}
                              </h3>
                            </div>
                            
                            {/* Timestamp */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium">
                                {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          
                          {/* Badges and metadata */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex gap-2">
                              {conversation.hasAttachments && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                                >
                                  <span className="mr-1">📎</span>
                                  Files
                                </Badge>
                              )}
                              {currentConversationId === conversation.id && (
                                <Badge 
                                  variant="default" 
                                  className="text-xs font-medium bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0"
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            {conversation.messageCount && (
                              <Badge 
                                variant="outline" 
                                className="text-xs font-medium bg-background/50 text-muted-foreground border-border/50"
                              >
                                {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
};
