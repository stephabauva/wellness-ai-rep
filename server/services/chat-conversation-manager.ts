// Chat Conversation Management Service
// @used-by server/routes/chat-routes.ts

import { 
  db, eq, desc, conversations, conversationMessages
} from "../routes/shared-dependencies.js";

const FIXED_USER_ID = 1;

/**
 * Creates or validates a conversation and returns the conversation ID
 * @param conversationId Optional existing conversation ID
 * @param content Message content for title generation
 * @param attachments Optional attachments for title generation
 * @returns The conversation ID (existing or newly created)
 */
export async function ensureConversation(
  conversationId: string | null | undefined,
  content?: string,
  attachments?: any[]
): Promise<string> {
  let currentConversationId: string | null = conversationId || null;

  // Validate existing conversation
  if (currentConversationId) {
    const existingConv = await db.select()
      .from(conversations)
      .where(eq(conversations.id, currentConversationId))
      .limit(1);
    
    if (existingConv.length === 0) {
      currentConversationId = null;
    }
  }

  // Create new conversation if needed
  if (!currentConversationId) {
    let title = content?.slice(0, 50) + (content && content.length > 50 ? '...' : '');
    
    if (!title && attachments?.length) {
      title = attachments.map(a => a.displayName || a.fileName).join(', ').slice(0, 50);
    }
    
    if (!title) title = "New Conversation";

    const [newConversation] = await db.insert(conversations).values({
      userId: FIXED_USER_ID, 
      title
    }).returning();
    
    currentConversationId = newConversation.id;
    
    console.log('[CONVERSATION_MANAGER] Created new conversation:', {
      conversationId: currentConversationId,
      title: title
    });
  }

  return currentConversationId;
}

/**
 * Gets all conversations for the fixed user
 * @returns Array of user conversations ordered by most recent
 */
export async function getUserConversations() {
  console.log('[CONVERSATION_MANAGER] Fetching conversations for user:', FIXED_USER_ID);
  
  const userConversations = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, FIXED_USER_ID))
    .orderBy(desc(conversations.updatedAt));
  
  console.log('[CONVERSATION_MANAGER] Retrieved conversations:', {
    count: userConversations.length,
    conversations: userConversations.map((c: any) => ({
      id: c.id,
      title: c.title?.substring(0, 30) + '...',
      updatedAt: c.updatedAt,
      timeSinceUpdate: new Date().getTime() - new Date(c.updatedAt).getTime()
    }))
  });
  
  return userConversations;
}

/**
 * Gets conversation history messages
 * @param conversationId The conversation ID
 * @param limit Maximum number of messages to retrieve
 * @returns Array of conversation messages
 */
export async function getConversationHistory(conversationId: string, limit: number = 20) {
  return await db.select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.createdAt)
    .limit(limit);
}

/**
 * Gets messages for a specific conversation
 * @param conversationId The conversation ID
 * @returns Array of conversation messages ordered by creation time
 */
export async function getConversationMessages(conversationId: string) {
  return await db.select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.createdAt);
}

/**
 * Updates conversation timestamp to move it to top of history
 * @param conversationId The conversation ID to update
 */
export async function updateConversationTimestamp(conversationId: string) {
  try {
    const updateResult = await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();
    
    console.log('[CONVERSATION_MANAGER] Conversation timestamp updated:', {
      conversationId: conversationId,
      updateResult: updateResult,
      newTimestamp: new Date().toISOString()
    });
    
    // Verify the update actually happened
    const verifyUpdate = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    
    console.log('[CONVERSATION_MANAGER] Updated conversation verified:', {
      conversationId: conversationId,
      dbRecord: verifyUpdate[0],
      updatedAt: verifyUpdate[0]?.updatedAt
    });
  } catch (updateError) {
    console.error('[CONVERSATION_MANAGER] Failed to update conversation timestamp:', {
      conversationId: conversationId,
      error: updateError
    });
    // Don't throw - this is not critical enough to fail the entire request
  }
}