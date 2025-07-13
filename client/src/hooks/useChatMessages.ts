// Removed most local state, useEffect, and mutation logic.
// This hook will now primarily consume AppContext.

// Import Message type from AppContext to ensure consistency, or a shared types file
import { useAppContext, Message } from '@shared';
// Removed unused React features like useState, useEffect, etc.
// Removed useMutation, queryClient, apiRequest as mutation is in AppContext
// Removed AttachedFile type as SendMessageParams is not defined here anymore
// Removed welcomeMessage constant as it's defined in AppContext

export const useChatMessages = () => {
  const context = useAppContext();

  // Log hook instantiation
  console.log("[useChatMessages] Hook instantiated, consuming AppContext.");

  // The hook now returns values derived from AppContext.
  // The exact structure of what AppContext provides for sendMessage
  // (e.g., the mutation object itself or just the mutate function)
  // will determine how sendMessageMutation is shaped here.
  // For now, assuming AppContext provides 'sendMessage' as the mutate function,
  // 'selectConversation' as 'setCurrentConversationId', and 'newChat'.

  // Ensure the returned object matches the expected structure by dependent components.
  // This might require some temporary placeholders or type assertions if the
  // context shape isn't a direct 1:1 match for the old hook's return.

  // Log state before returning from context
  console.log("[useChatMessages] Returning from context:", {
    messagesCount: context.messages?.length,
    currentConversationId: context.currentConversationId,
    loadingMessages: context.loadingMessages,
  });

  return {
    messages: context.messages || [],
    loadingMessages: context.loadingMessages || false,
    currentConversationId: context.currentConversationId || null,
    // Adapt how sendMessageMutation is exposed if ChatSection expects a .mutate property
    // If context.sendMessage is the mutate function:
    sendMessageMutation: { mutate: context.sendMessage } as any, // 'as any' is a temporary escape hatch
    handleNewChat: context.newChat, // Assuming context.newChat is the newChatHandler
    setCurrentConversationId: context.selectConversation, // Assuming context.selectConversation is the selectConversationHandler

    // Ensure all previously returned properties are considered,
    // even if they are now just passthroughs from the context.
    // coachingMode is not directly part of this hook's original return, but was used internally.
    // It's available via useAppContext() if needed directly in components.
  };
};