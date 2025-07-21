// Chat Message Database Handler Service
// @used-by server/routes/chat-routes.ts

import { 
  db, conversationMessages, storage
} from "../routes/shared-dependencies.js";

const FIXED_USER_ID = 1;

/**
 * Saves a user message to the database
 * @param conversationId The conversation ID
 * @param content Message content
 * @param attachments Optional attachments metadata
 * @returns The saved message record
 */
export async function saveUserMessage(
  conversationId: string,
  content: string,
  attachments?: any[]
) {
  const [savedUserMessage] = await db.insert(conversationMessages).values({
    conversationId: conversationId,
    role: 'user',
    content: content,
    metadata: attachments?.length ? { attachments } : undefined
  }).returning();

  console.log('[MESSAGE_HANDLER] Saved user message:', {
    messageId: savedUserMessage.id,
    conversationId: conversationId
  });

  return savedUserMessage;
}

/**
 * Saves an AI assistant message to the database
 * @param conversationId The conversation ID
 * @param content AI response content
 * @returns The saved message record
 */
export async function saveAiMessage(
  conversationId: string,
  content: string
) {
  const [savedAiMessage] = await db.insert(conversationMessages).values({
    conversationId: conversationId,
    role: 'assistant',
    content: content
  }).returning();

  console.log('[MESSAGE_HANDLER] Saved AI message:', {
    messageId: savedAiMessage.id,
    conversationId: conversationId,
    responseLength: content.length
  });

  return savedAiMessage;
}

/**
 * Creates a legacy message for backward compatibility
 * @param content Message content
 * @param isUserMessage Whether this is a user message or AI message
 * @returns The legacy message record
 */
export async function createLegacyMessage(
  content: string,
  isUserMessage: boolean
) {
  return await storage.createMessage({
    userId: FIXED_USER_ID,
    content: content,
    isUserMessage: isUserMessage
  });
}