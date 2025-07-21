// MAX_LINES: 280
// Chat Routes Module - Conversations, Messages, and Transcription
import { createServer, type Server } from "http";
import { z } from "zod";
import { 
  Express, storage, aiService, transcriptionService, db, eq, desc,
  conversations, conversationMessages, files, attachmentRetentionService,
  multer, join, existsSync, fs, nanoid
} from "./shared-dependencies.js";
import { processNutritionData } from "../services/chat-nutrition-processor.js";
import { chatUpload, processChatAttachment, processMessageAttachments } from "../services/chat-attachment-handler.js";
import { 
  setupStreamingHeaders, sendChunk, sendCompleteResponse, sendError, sendDone,
  sendTypingStart, sendTypingEnd, sendProcessingUpdate, sendCompletion
} from "../services/chat-streaming-handler.js";

const attachmentSchema = z.object({
  id: z.string(), fileName: z.string(), displayName: z.string().optional(),
  fileType: z.string(), fileSize: z.number(), url: z.string().optional(),
  retentionInfo: z.any().optional(), categoryId: z.string().optional(),
});

const messageSchema = z.object({
  content: z.string(), conversationId: z.string().nullable().optional(),
  coachingMode: z.string().optional().default("weight-loss"),
  aiProvider: z.enum(["openai", "google"]).optional().default("openai"),
  aiModel: z.string().optional().default("gpt-4o"),
  attachments: z.array(attachmentSchema).optional(),
  automaticModelSelection: z.boolean().optional().default(false),
  streaming: z.boolean().optional().default(false)
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

export async function registerChatRoutes(app: Express): Promise<Server> {
  
  // Chat-specific file upload endpoint
  app.post('/api/chat/attachments', chatUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const result = await processChatAttachment(req.file);
      res.status(201).json(result);
    } catch (error) {
      console.error('Chat attachment upload error:', error);
      res.status(500).json({ message: "Failed to upload chat attachment" });
    }
  });

  // Get all conversations for a user
  app.get('/api/conversations', async (req, res) => {
    try {
      const userId = 1; // Fixed user ID
      
      console.log('[CONVERSATIONS_FETCH_DEBUG] Fetching conversations for user:', userId);
      
      const userConversations = await db
        .select({
          id: conversations.id,
          title: conversations.title,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        })
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));
      
      console.log('[CONVERSATIONS_FETCH_DEBUG] Retrieved conversations:', {
        count: userConversations.length,
        conversations: userConversations.map((c: any) => ({
          id: c.id,
          title: c.title?.substring(0, 30) + '...',
          updatedAt: c.updatedAt,
          timeSinceUpdate: new Date().getTime() - new Date(c.updatedAt).getTime()
        }))
      });
      
      res.json(userConversations);
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  const httpServer = createServer(app);
  const FIXED_USER_ID = 1;

  app.use('/uploads', (req, res, next) => {
    const filePath = join(process.cwd(), 'uploads', req.path);
    existsSync(filePath) ? res.sendFile(filePath) : res.status(404).send('File not found');
  });

  app.get("/api/messages", async (req, res) => {
    try {
      res.json(await storage.getMessages(FIXED_USER_ID));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages/stream", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection } = messageSchema.parse(req.body);
      let currentConversationId = conversationId;
      const user = await storage.getUser(FIXED_USER_ID);
      const userAiProvider = aiProvider || user?.aiProvider || 'google';
      const userAiModel = aiModel || user?.aiModel || 'gemini-2.0-flash-exp';
      const userAutoSelection = automaticModelSelection ?? user?.automaticModelSelection ?? true;

      setupStreamingHeaders(res);

      console.log('[STREAMING_DEBUG] Starting streaming request:', {
        conversationId: currentConversationId,
        hasContent: !!content,
        timestamp: new Date().toISOString()
      });

      // Create or validate conversation
      if (currentConversationId) {
        const existingConv = await db.select().from(conversations).where(eq(conversations.id, currentConversationId)).limit(1);
        if (existingConv.length === 0) {
          currentConversationId = null;
        }
      }

      if (!currentConversationId) {
        let title = content?.slice(0, 50) + (content && content.length > 50 ? '...' : '');
        if (!title && attachments?.length) {
          title = attachments.map(a => a.displayName || a.fileName).join(', ').slice(0, 50);
        }
        if (!title) title = "New Conversation";

        const [newConversation] = await db.insert(conversations).values({
          userId: FIXED_USER_ID, title
        }).returning();
        currentConversationId = newConversation.id;
        
        console.log('[STREAMING_DEBUG] Created new conversation:', {
          conversationId: currentConversationId,
          title: title
        });
      }

      // Save user message to database
      const [savedUserMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId, role: 'user', content,
        metadata: attachments?.length ? { attachments } : undefined
      }).returning();

      console.log('[STREAMING_DEBUG] Saved user message:', {
        messageId: savedUserMessage.id,
        conversationId: currentConversationId
      });

      // Store AI response as it streams
      let fullAiResponse = '';

      const result = await aiService.getChatResponseStream(
        content, FIXED_USER_ID, currentConversationId!, 0, coachingMode || 'weight-loss', [],
        { provider: userAiProvider, model: userAiModel }, attachments || [], userAutoSelection,
        (chunk: string) => {
          fullAiResponse += chunk;
          sendChunk(res, chunk);
        },
        (complete: string) => {
          fullAiResponse = complete; // Use complete response if provided
          sendCompleteResponse(res, complete);
        },
        (error: Error) => sendError(res, error.message)
      );

      // Save AI response to database
      const [savedAiMessage] = await db.insert(conversationMessages).values({
        conversationId: currentConversationId, role: 'assistant', content: fullAiResponse
      }).returning();

      console.log('[STREAMING_DEBUG] Saved AI message:', {
        messageId: savedAiMessage.id,
        conversationId: currentConversationId,
        responseLength: fullAiResponse.length
      });

      // Process nutrition data in background (non-blocking)
      if (currentConversationId) {
        processNutritionData(
          fullAiResponse,
          content,
          FIXED_USER_ID,
          currentConversationId,
          (attachments?.length || 0) > 0
        ).catch(error => {
          console.error('[STREAMING_ERROR] Background nutrition processing failed:', error);
        });
      }

      // Update conversation timestamp so it appears at top of history
      try {
        const updateResult = await db.update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, currentConversationId!))
          .returning();
        
        console.log('[CONVERSATION_UPDATE_DEBUG] STREAMING: Conversation timestamp updated:', {
          conversationId: currentConversationId,
          updateResult: updateResult,
          newTimestamp: new Date().toISOString()
        });
        
        // Verify the update actually happened
        const verifyUpdate = await db.select()
          .from(conversations)
          .where(eq(conversations.id, currentConversationId!))
          .limit(1);
        
        console.log('[CONVERSATION_UPDATE_VERIFY] STREAMING: Updated conversation in DB:', {
          conversationId: currentConversationId,
          dbRecord: verifyUpdate[0],
          updatedAt: verifyUpdate[0]?.updatedAt
        });
      } catch (updateError) {
        console.error('[CONVERSATION_UPDATE_ERROR] STREAMING: Failed to update conversation timestamp:', {
          conversationId: currentConversationId,
          error: updateError
        });
      }

      sendDone(res, currentConversationId!);
      res.end();
    } catch (error) {
      console.error('[STREAMING_ERROR] Error in streaming endpoint:', error);
      sendError(res, error instanceof z.ZodError ? "Invalid request data" : "Failed to process message");
      res.end();
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection, streaming } = messageSchema.parse(req.body);
      let currentConversationId = conversationId;
      let conversationHistory: any[] = [];

      if (streaming) {
        setupStreamingHeaders(res);
        sendTypingStart(res);
      }

      const processOperations = async () => {
        if (currentConversationId) {
          const existingConv = await db.select().from(conversations).where(eq(conversations.id, currentConversationId!)).limit(1);
          if (existingConv.length === 0) {
            currentConversationId = null;
          } else {
            conversationHistory = await db.select().from(conversationMessages)
              .where(eq(conversationMessages.conversationId, currentConversationId!))
              .orderBy(conversationMessages.createdAt).limit(20);
          }
        }

        if (!currentConversationId) {
          let title = content?.slice(0, 50) + (content && content.length > 50 ? '...' : '');
          if (!title && attachments?.length) {
            title = attachments.map(a => a.displayName || a.fileName).join(', ').slice(0, 50);
          }
          if (!title) title = "New Conversation";

          const [newConversation] = await db.insert(conversations).values({
            userId: FIXED_USER_ID, title
          }).returning();
          currentConversationId = newConversation.id;
          conversationHistory = [];
        }

        const [savedUserMessage] = await db.insert(conversationMessages).values({
          conversationId: currentConversationId!, role: 'user', content,
          metadata: attachments?.length ? { attachments } : undefined
        }).returning();

        const attachmentProcessing = attachments?.length ? 
          processMessageAttachments(attachments, currentConversationId!, savedUserMessage.id) : 
          Promise.resolve();

        const legacyUserMessage = await storage.createMessage({
          userId: FIXED_USER_ID,
          content: content + (attachments?.length ? ` [${attachments.length} attachment(s)]` : ''),
          isUserMessage: true
        });

        if (streaming) {
          sendProcessingUpdate(res, currentConversationId!, savedUserMessage);
        }

        const [aiResult] = await Promise.all([
          aiService.getChatResponse(content, FIXED_USER_ID, currentConversationId!, legacyUserMessage.id,
            coachingMode, conversationHistory, { provider: aiProvider, model: aiModel },
            attachments || [], automaticModelSelection || false),
          attachmentProcessing
        ]);

        const [savedAiMessage] = await db.insert(conversationMessages).values({
          conversationId: currentConversationId!, role: 'assistant', content: aiResult.response
        }).returning();

        // Process nutrition data in background (non-blocking)
        processNutritionData(
          aiResult.response,
          content,
          FIXED_USER_ID,
          currentConversationId!,
          (attachments?.length || 0) > 0
        ).catch(error => {
          console.error('[NON_STREAMING_ERROR] Background nutrition processing failed:', error);
        });

        // Update conversation timestamp so it appears at top of history
        try {
          const updateResult = await db.update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, currentConversationId!))
            .returning();
          
          console.log('[CONVERSATION_UPDATE_DEBUG] Conversation timestamp updated:', {
            conversationId: currentConversationId,
            updateResult: updateResult,
            newTimestamp: new Date().toISOString()
          });
          
          // Verify the update actually happened
          const verifyUpdate = await db.select()
            .from(conversations)
            .where(eq(conversations.id, currentConversationId!))
            .limit(1);
          
          console.log('[CONVERSATION_UPDATE_VERIFY] Updated conversation in DB:', {
            conversationId: currentConversationId,
            dbRecord: verifyUpdate[0],
            updatedAt: verifyUpdate[0]?.updatedAt
          });
        } catch (updateError) {
          console.error('[CONVERSATION_UPDATE_ERROR] Failed to update conversation timestamp:', {
            conversationId: currentConversationId,
            error: updateError
          });
          // Don't throw - this is not critical enough to fail the entire request
        }

        const legacyAiMessage = await storage.createMessage({
          userId: FIXED_USER_ID, content: aiResult.response, isUserMessage: false
        });

        return { userMessage: legacyUserMessage, aiMessage: legacyAiMessage, conversationId: currentConversationId, memoryInfo: aiResult.memoryInfo };
      };

      const result = await processOperations();

      if (streaming) {
        sendCompletion(res, result);
        sendTypingEnd(res);
        res.end();
      } else {
        res.status(201).json(result);
      }
    } catch (error) {
      const isStreaming = req.body?.streaming || false;
      const errorMessage = error instanceof z.ZodError ? "Invalid request data" : "Failed to process message";
      
      if (isStreaming) {
        sendError(res, errorMessage);
        res.end();
      } else {
        res.status(error instanceof z.ZodError ? 400 : 500).json({ 
          message: errorMessage,
          ...(error instanceof z.ZodError && { errors: error.errors })
        });
      }
    }
  });


  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const messages = await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, req.params.id)).orderBy(conversationMessages.createdAt);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation messages" });
    }
  });

  app.post("/api/transcribe/openai", audioUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
      const transcription = await (await transcriptionService()).transcribeWithOpenAI(
        req.file.buffer,
        req.file.originalname || "audio.wav"
      );
      res.json(transcription);
    } catch (error) {
      res.status(500).json({ error: 'Transcription failed' });
    }
  });

  app.post("/api/transcribe/google", audioUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
      const transcription = await (await transcriptionService()).transcribeWithGoogle(req.file.buffer);
      res.json(transcription);
    } catch (error) {
      res.status(500).json({ error: 'Transcription failed' });
    }
  });

  return httpServer;
}