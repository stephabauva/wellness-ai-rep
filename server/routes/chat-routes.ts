// MAX_LINES: 280
// Chat Routes Module - Conversations, Messages, and Transcription
import { createServer, type Server } from "http";
import { z } from "zod";
import { 
  Express, storage, aiService, transcriptionService, db, eq, desc,
  conversations, conversationMessages, files, attachmentRetentionService,
  multer, join
} from "./shared-dependencies";

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
  dest: 'uploads/audio/', limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Invalid audio format'), allowed.includes(file.mimetype));
  }
});

/**
 * Register chat-related routes with Express app
 * Returns HTTP server for WebSocket functionality
 */
export async function registerChatRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const FIXED_USER_ID = 1;

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = join(process.cwd(), 'uploads', req.path);
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // Get chat messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages(FIXED_USER_ID);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Streaming endpoint for real-time AI responses
  app.post("/api/messages/stream", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection } = messageSchema.parse(req.body);
      const userId = FIXED_USER_ID;

      // Get user's actual AI settings
      const user = await storage.getUser(userId);
      const userAiProvider = aiProvider || user?.aiProvider || 'google';
      const userAiModel = aiModel || user?.aiModel || 'gemini-2.0-flash-exp';
      const userAutoSelection = automaticModelSelection ?? user?.automaticModelSelection ?? true;

      let currentConversationId = conversationId;
      let conversationHistory: any[] = [];

      // Set up Server-Sent Events headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Use aiService streaming for smooth streaming
      const result = await aiService.getChatResponseStream(
        content,
        userId,
        currentConversationId || '',
        0, // messageId placeholder
        coachingMode || 'weight-loss',
        conversationHistory,
        { provider: userAiProvider, model: userAiModel },
        attachments || [],
        userAutoSelection,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        },
        (complete: string) => {
          res.write(`data: ${JSON.stringify({ type: 'complete', fullResponse: complete })}\n\n`);
        },
        (error: Error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        }
      );

      // Send conversation data and end stream
      res.write(`data: ${JSON.stringify({ 
        type: 'done',
        conversationId: result.conversationId
      })}\n\n`);

      res.end();

    } catch (error) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error instanceof z.ZodError ? "Invalid request data" : "Failed to process message"
      })}\n\n`);
      res.end();
    }
  });

  // Enhanced message endpoint with streaming and parallel processing
  app.post("/api/messages", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection, streaming } = messageSchema.parse(req.body);
      const userId = FIXED_USER_ID;

      let currentConversationId = conversationId;
      let conversationHistory: any[] = [];

      // Set up streaming headers if requested
      if (streaming) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });
        res.write(`data: ${JSON.stringify({ type: 'typing_start' })}\n\n`);
      }

      // Process operations with parallel optimization
      const processOperations = async () => {
        const operations = [];

        // Conversation validation/creation
        if (currentConversationId) {
          operations.push(async () => {
            const existingConv = await db
              .select()
              .from(conversations)
              .where(eq(conversations.id, currentConversationId!))
              .limit(1);

            if (existingConv.length === 0) {
              currentConversationId = null;
            } else {
              const historyFromDb = await db
                .select()
                .from(conversationMessages)
                .where(eq(conversationMessages.conversationId, currentConversationId!))
                .orderBy(conversationMessages.createdAt)
                .limit(20);
              conversationHistory = historyFromDb;
            }
          });
        }

        await Promise.all(operations.map(op => op()));

        // Create new conversation if needed
        if (!currentConversationId) {
          let title = content?.slice(0, 50) + (content && content.length > 50 ? '...' : '');
          if (!title && attachments && attachments.length > 0) {
            title = attachments.map(a => a.displayName || a.fileName).join(', ').slice(0, 50);
          }
          if (!title) title = "New Conversation";

          const [newConversation] = await db.insert(conversations).values({
            userId,
            title
          }).returning();
          currentConversationId = newConversation.id;
          conversationHistory = [];
        }

        // Save user message
        const [savedUserMessage] = await db.insert(conversationMessages).values({
          conversationId: currentConversationId,
          role: 'user',
          content,
          metadata: attachments && attachments.length > 0 ? { attachments } : undefined
        }).returning();

        // Process attachments in parallel
        const attachmentProcessing = attachments && attachments.length > 0 ? 
          Promise.all(attachments.map(async (attachment) => {
            try {
              const categorization = await attachmentRetentionService.categorizeAttachment(
                attachment.displayName || attachment.fileName,
                attachment.fileType,
                `Chat upload in conversation: ${currentConversationId}`
              );

              let retentionDays = null;
              let scheduledDeletion = null;
              
              if (categorization.category === 'medium') {
                retentionDays = 90;
                scheduledDeletion = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000));
              } else if (categorization.category === 'low') {
                retentionDays = 30;
                scheduledDeletion = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
              }

              const existingFile = await db
                .select()
                .from(files)
                .where(eq(files.fileName, attachment.fileName))
                .limit(1);

              if (existingFile.length === 0) {
                await db.insert(files).values({
                  userId,
                  categoryId: categorization.suggestedCategoryId || null,
                  fileName: attachment.fileName,
                  displayName: attachment.displayName || attachment.fileName,
                  filePath: join(process.cwd(), 'uploads', attachment.fileName),
                  fileType: attachment.fileType,
                  fileSize: attachment.fileSize,
                  uploadSource: 'chat',
                  retentionPolicy: categorization.category,
                  retentionDays,
                  scheduledDeletion,
                  metadata: {
                    uploadContext: 'chat',
                    conversationId: currentConversationId,
                    messageId: savedUserMessage.id,
                    categorization
                  }
                });
              }
            } catch (error) {
              console.error(`Failed to save attachment ${attachment.fileName}:`, error);
            }
          })) : Promise.resolve();

        // Legacy message creation and AI processing
        const legacyUserMessage = await storage.createMessage({
          userId,
          content: content + (attachments && attachments.length > 0 ? ` [${attachments.length} attachment(s)]` : ''),
          isUserMessage: true
        });

        if (streaming) {
          res.write(`data: ${JSON.stringify({ 
            type: 'processing', 
            conversationId: currentConversationId,
            userMessage: savedUserMessage 
          })}\n\n`);
        }

        const aiConfig = { provider: aiProvider, model: aiModel };
        
        const [aiResult] = await Promise.all([
          aiService.getChatResponse(
            content,
            userId,
            currentConversationId,
            legacyUserMessage.id,
            coachingMode,
            conversationHistory,
            aiConfig,
            attachments || [],
            automaticModelSelection || false
          ),
          attachmentProcessing
        ]);

        // Save AI response
        const [savedAiMessage] = await db.insert(conversationMessages).values({
          conversationId: currentConversationId,
          role: 'assistant',
          content: aiResult.response
        }).returning();

        const legacyAiMessage = await storage.createMessage({
          userId,
          content: aiResult.response,
          isUserMessage: false
        });

        return {
          userMessage: legacyUserMessage,
          aiMessage: legacyAiMessage,
          conversationId: currentConversationId,
          memoryInfo: aiResult.memoryInfo,
          savedUserMessage,
          savedAiMessage
        };
      };

      const result = await processOperations();

      if (streaming) {
        res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'typing_end' })}\n\n`);
        res.end();
      } else {
        res.status(201).json({
          userMessage: result.userMessage,
          aiMessage: result.aiMessage,
          conversationId: result.conversationId,
          memoryInfo: result.memoryInfo
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const isStreaming = req.body?.streaming || false;
      if (isStreaming) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error instanceof z.ZodError ? "Invalid request data" : "Failed to process message"
        })}\n\n`);
        res.end();
      } else {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid request data", errors: error.errors });
        } else {
          res.status(500).json({ message: "Failed to process message" });
        }
      }
    }
  });

  // Get conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = FIXED_USER_ID;
      const convs = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));

      res.json(convs);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages for specific conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = req.params.id;
      const messages = await db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.conversationId, conversationId))
        .orderBy(conversationMessages.createdAt);

      res.json(messages);
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      res.status(500).json({ message: "Failed to fetch conversation messages" });
    }
  });

  // OpenAI transcription endpoint
  app.post("/api/transcribe/openai", audioUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const transcription = await transcriptionService.transcribeWithOpenAI(req.file.path);
      res.json({ transcription });
    } catch (error) {
      console.error('OpenAI transcription error:', error);
      res.status(500).json({ error: 'Transcription failed' });
    }
  });

  // Google transcription endpoint
  app.post("/api/transcribe/google", audioUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const transcription = await transcriptionService.transcribeWithGoogle(req.file.path);
      res.json({ transcription });
    } catch (error) {
      console.error('Google transcription error:', error);
      res.status(500).json({ error: 'Transcription failed' });
    }
  });

  return httpServer;
}