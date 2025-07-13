
import { useState, useCallback, useMemo } from "react";
import { Button } from "@shared/components/ui/button";
import { History } from "lucide-react"; // Only History is needed from lucide-react here
import { useChatMessages } from "@/hooks/useChatMessages";
// useFileManagement is now used indirectly via useChatActions
// import { generateMessagesToDisplay } from "@/utils/chatUtils"; // Removed
import { useAppContext } from "@shared";
import { useChatActions } from "@/hooks/useChatActions"; // Import the new hook

// Import the new components
import { MessageDisplayArea } from "@/components/MessageDisplayArea";
import { ChatInputArea } from "@/components/ChatInputArea";
import { AttachmentPreview } from "@/components/AttachmentPreview";
import { ConversationHistory } from "@/components/ConversationHistory";
import { ChatErrorBoundary } from "@/components/ChatErrorBoundary";

function ChatSection() {
  const [inputMessage, setInputMessage] = useState("");
  const [isConversationHistoryOpen, setIsConversationHistoryOpen] = useState(false);
  
  const { appSettings } = useAppContext();
  
  const {
    messages,
    currentConversationId,
    setCurrentConversationId,
    handleNewChat,
    loadingMessages
  } = useChatMessages();

  // Consolidate actions into useChatActions
  const chatActions = useChatActions({
    inputMessage,
    setInputMessage,
    currentConversationId,
  });

  // Extract streaming functionality and file management
  const { 
    removeAttachedFile, 
    attachedFiles, 
    streamingMessage, 
    isConnected, 
    isThinking,
    pendingUserMessage
  } = chatActions;

  // Generate messages to display - unified approach without duplication
  const messagesToDisplay = useMemo(() => {
    // Simply use messages from context - optimistic updates are handled there
    return [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages]);

  const handleConversationSelect = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsConversationHistoryOpen(false);
  }, [setCurrentConversationId]);

  console.log("[ChatSection] Component render - Messages:", messages?.length, "ConversationId:", currentConversationId, "Loading:", loadingMessages);

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatErrorBoundary onReset={() => {
        handleNewChat();
        setIsConversationHistoryOpen(false);
      }}>
        {/* Loading state */}
        {loadingMessages && !currentConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading conversation...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">AI Wellness Coach</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                >
                  New Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConversationHistoryOpen(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <MessageDisplayArea
              messagesToDisplay={messagesToDisplay}
              isLoading={loadingMessages && !!currentConversationId} // Show inline loader when switching conversations
              streamingMessage={streamingMessage}
              isThinking={isThinking}
            />

            {/* Attached Files Preview */}
            <AttachmentPreview
              attachedFiles={attachedFiles} // From chatActions
              onRemoveAttachment={removeAttachedFile} // From chatActions
            />

            {/* Input Area */}
            <ChatInputArea
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              chatActions={chatActions}
              settings={appSettings}
            />
          </>
        )}

        {/* Conversation History Modal */}
        <ConversationHistory
          isOpen={isConversationHistoryOpen}
          onClose={() => setIsConversationHistoryOpen(false)}
          onConversationSelect={handleConversationSelect}
          currentConversationId={currentConversationId || undefined}
        />
      </ChatErrorBoundary>
    </div>
  );
}

export default ChatSection;
