
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
import ChatFloatingActionButton from "@/components/ChatFloatingActionButton";

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
    <div className="flex-1 flex flex-col h-full bg-background">
      <ChatErrorBoundary onReset={() => {
        handleNewChat();
        setIsConversationHistoryOpen(false);
      }}>
        {/* Loading state */}
        {loadingMessages && !currentConversationId ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading conversation...</p>
            </div>
          </div>
        ) : (
          <>

            {/* Desktop-only sticky header */}
            <div className="hidden md:block sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-700/80 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 min-h-[48px]">
                <div className="flex-1 min-w-0 mr-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate tracking-tight">AI Wellness Coach</h2>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewChat}
                    className="bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300/60 dark:border-gray-600/60 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl px-4 py-2.5 min-h-[48px] min-w-[48px] text-sm font-semibold transition-all duration-300 ease-out hover:scale-105 hover:shadow-md active:scale-95 touch-ripple whitespace-nowrap"
                  >
                    New Chat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConversationHistoryOpen(true)}
                    className="bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300/60 dark:border-gray-600/60 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl px-4 py-2.5 min-h-[48px] min-w-[48px] text-sm font-semibold transition-all duration-300 ease-out hover:scale-105 hover:shadow-md active:scale-95 touch-ripple flex items-center gap-2.5 whitespace-nowrap"
                  >
                    <History className="h-4 w-4" />
                    History
                  </Button>
                </div>
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

        {/* Floating Action Button - Mobile Only */}
        <ChatFloatingActionButton
          onNewChat={handleNewChat}
          onOpenHistory={() => setIsConversationHistoryOpen(true)}
          isHistoryOpen={isConversationHistoryOpen}
        />
      </ChatErrorBoundary>
    </div>
  );
}

export default ChatSection;
