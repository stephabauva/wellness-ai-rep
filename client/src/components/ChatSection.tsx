
import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react"; // Only History is needed from lucide-react here
import { useChatMessages } from "@/hooks/useChatMessages";
// useFileManagement is now used indirectly via useChatActions
// import { generateMessagesToDisplay } from "@/utils/chatUtils"; // Removed
import { useAppContext } from "@/context/AppContext";
import { useChatActions } from "@/hooks/useChatActions"; // Import the new hook

// Import the new components
import { MessageDisplayArea } from "@/components/MessageDisplayArea";
import { ChatInputArea } from "@/components/ChatInputArea";
import { AttachmentPreview } from "@/components/AttachmentPreview";
import { ConversationHistory } from "@/components/ConversationHistory";

function ChatSection() {
  const [inputMessage, setInputMessage] = useState("");
  console.log("[ChatSection] Component body execution (render/re-render). InputMessage state:", inputMessage);
  const [isConversationHistoryOpen, setIsConversationHistoryOpen] = useState(false);
  
  const { settings } = useAppContext();
  
  const {
    messages,
    currentConversationId,
    // pendingUserMessage, // Removed
    // welcomeMessage, // Removed
    // sendMessageMutation, // Now handled by useChatActions
    setCurrentConversationId,
    handleNewChat,
    loadingMessages
  } = useChatMessages();
  console.log("[ChatSection] Received from useChatMessages hook:", { messagesCount: messages?.length, currentConversationId, loadingMessages });

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
    isThinking 
  } = chatActions;


  // Generate messages to display
  const messagesToDisplay = messages; // Simplified

  const handleConversationSelect = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsConversationHistoryOpen(false);
  }, [setCurrentConversationId]);

  // The loading state from useChatMessages can be passed to MessageDisplayArea
  if (loadingMessages && !currentConversationId) { // Show full loader only on initial load or new chat
    console.log("[ChatSection] Rendering full loading screen.");
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
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
        settings={settings}
      />

      {/* Conversation History Modal */}
      <ConversationHistory
        isOpen={isConversationHistoryOpen}
        onClose={() => setIsConversationHistoryOpen(false)}
        onConversationSelect={handleConversationSelect}
      />
    </div>
  );
  // Log before main return
  console.log("[ChatSection] Rendering. messagesToDisplay count:", messagesToDisplay.length, "isLoading (inline):", (loadingMessages && !!currentConversationId) );
  // The duplicated return block below was removed.
}

export default ChatSection;
