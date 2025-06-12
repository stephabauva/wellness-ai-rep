import type { Express } from "express";
import { z } from "zod";
import { db } from "./db";
import { conversations, conversationMessages, insertConversationSchema, insertConversationMessageSchema } from "@shared/schema";
import { storage } from "./storage";

// Simple message schema for testing
const simpleMessageSchema = z.object({
  content: z.string(),
  conversationId: z.string().nullable().optional()
});

export function registerSimpleRoutes(app: Express) {
  // Simple conversation recording endpoint for testing
  app.post("/api/messages/simple", async (req, res) => {
    try {
      console.log("Simple message endpoint called:", req.body);
      
      const { content, conversationId } = simpleMessageSchema.parse(req.body);
      const userId = 1; // Default user
      
      let currentConversationId = conversationId;
      
      // Create new conversation if needed
      if (!currentConversationId) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        
        const [newConversation] = await db.insert(conversations).values({
          userId,
          title
        }).returning();
        
        currentConversationId = newConversation.id;
        console.log(`Created new conversation: ${currentConversationId}`);
      }
      
      // Save user message
      const [savedUserMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId,
        role: 'user',
        content
      }).returning();
      
      console.log(`Saved user message: ${savedUserMessage.id}`);
      
      // Create a simple AI response without external APIs
      const simpleResponse = `Thank you for your message: "${content}". This is a simple response to test conversation recording.`;
      
      // Save AI response
      const [savedAiMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId,
        role: 'assistant',
        content: simpleResponse
      }).returning();
      
      console.log(`Saved AI message: ${savedAiMessage.id}`);
      
      // Also save to legacy storage for compatibility
      const legacyUserMessage = await storage.createMessage({
        userId,
        content,
        isUserMessage: true
      });
      
      const legacyAiMessage = await storage.createMessage({
        userId,
        content: simpleResponse,
        isUserMessage: false
      });
      
      res.status(201).json({
        success: true,
        conversationId: currentConversationId,
        userMessage: savedUserMessage,
        aiMessage: savedAiMessage,
        legacyUserMessage,
        legacyAiMessage
      });
      
    } catch (error) {
      console.error('Simple message error:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });
  
  // Get conversations for testing
  app.get("/api/conversations/simple", async (req, res) => {
    try {
      const conversationsWithMessages = await db
        .select({
          id: conversations.id,
          title: conversations.title,
          userId: conversations.userId,
          createdAt: conversations.createdAt,
          messageCount: db.$count(conversationMessages, eq => eq.conversationId === conversations.id)
        })
        .from(conversations)
        .orderBy(conversations.createdAt)
        .limit(10);
      
      res.json(conversationsWithMessages);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  
  // Get messages for a conversation
  app.get("/api/conversations/:id/messages/simple", async (req, res) => {
    try {
      const conversationId = req.params.id;
      
      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);
      
      res.json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
}