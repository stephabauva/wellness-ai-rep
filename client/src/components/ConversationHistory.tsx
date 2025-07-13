
import React, { useState, useEffect } from "react";
import { History, MessageSquare, Clock, Search, X } from "lucide-react";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  return isOpen ? (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-2xl h-[80vh] mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Conversation History
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <ScrollArea className="h-[60vh]">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      currentConversationId === conversation.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      onConversationSelect(conversation.id);
                      onClose();
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {conversation.title || 'Untitled Conversation'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          {conversation.hasAttachments && (
                            <Badge variant="secondary" className="text-xs">
                              📎 Files
                            </Badge>
                          )}
                          {conversation.messageCount && (
                            <Badge variant="outline" className="text-xs">
                              {conversation.messageCount} messages
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  ) : null;
};
