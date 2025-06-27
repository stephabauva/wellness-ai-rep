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
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format'));
    }
  }
});

export async function registerChatRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const FIXED_USER_ID = 1;

  app.use('/uploads', (req, res, next) => {
    const fs = require('fs');
    const filePath = join(process.cwd(), 'uploads', req.path);
    fs.existsSync(filePath) ? res.sendFile(filePath) : res.status(404).send('File not found');
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
      const user = await storage.getUser(FIXED_USER_ID);
      const userAiProvider = aiProvider || user?.aiProvider || 'google';
      const userAiModel = aiModel || user?.aiModel || 'gemini-2.0-flash-exp';
      const userAutoSelection = automaticModelSelection ?? user?.automaticModelSelection ?? true;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
        'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const result = await aiService.getChatResponseStream(
        content, FIXED_USER_ID, conversationId || '', 0, coachingMode || 'weight-loss', [],
        { provider: userAiProvider, model: userAiModel }, attachments || [], userAutoSelection,
        (chunk: string) => res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`),
        (complete: string) => res.write(`data: ${JSON.stringify({ type: 'complete', fullResponse: complete })}\n\n`),
        (error: Error) => res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`)
      );

      res.write(`data: ${JSON.stringify({ type: 'done', conversationId: result.conversationId })}\n\n`);
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error instanceof z.ZodError ? "Invalid request data" : "Failed to process message"
      })}\n\n`);
      res.end();
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { content, conversationId, coachingMode, aiProvider, aiModel, attachments, automaticModelSelection, streaming } = messageSchema.parse(req.body);
      let currentConversationId = conversationId;
      let conversationHistory: any[] = [];

      if (streaming) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
          'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });
        res.write(`data: ${JSON.stringify({ type: 'typing_start' })}\n\n`);
      }

      const processOperations = async () => {
        if (currentConversationId) {
          const existingConv = await db.select().from(conversations).where(eq(conversations.id, currentConversationId)).limit(1);
          if (existingConv.length === 0) {
            currentConversationId = null;
          } else {
            conversationHistory = await db.select().from(conversationMessages)
              .where(eq(conversationMessages.conversationId, currentConversationId))
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
          conversationId: currentConversationId, role: 'user', content,
          metadata: attachments?.length ? { attachments } : undefined
        }).returning();

        const attachmentProcessing = attachments?.length ? 
          Promise.all(attachments.map(async (attachment) => {
            try {
              const categorization = await attachmentRetentionService.categorizeAttachment(
                attachment.displayName || attachment.fileName, attachment.fileType,
                `Chat upload in conversation: ${currentConversationId}`);
              const retentionDays = categorization.category === 'medium' ? 90 : 
                                  categorization.category === 'low' ? 30 : null;
              const scheduledDeletion = retentionDays ? new Date(Date.now() + (retentionDays * 24 * 60 * 60 * 1000)) : null;

              const existingFile = await db.select().from(files).where(eq(files.fileName, attachment.fileName)).limit(1);
              if (existingFile.length === 0) {
                await db.insert(files).values({
                  userId: FIXED_USER_ID, categoryId: categorization.suggestedCategoryId || null,
                  fileName: attachment.fileName, displayName: attachment.displayName || attachment.fileName,
                  filePath: join(process.cwd(), 'uploads', attachment.fileName),
                  fileType: attachment.fileType, fileSize: attachment.fileSize,
                  uploadSource: 'chat', retentionPolicy: categorization.category,
                  retentionDays, scheduledDeletion,
                  metadata: { uploadContext: 'chat', conversationId: currentConversationId, 
                           messageId: savedUserMessage.id, categorization }
                });
              }
            } catch (error) {
              console.error(`Failed to save attachment ${attachment.fileName}:`, error);
            }
          })) : Promise.resolve();

        const legacyUserMessage = await storage.createMessage({
          userId: FIXED_USER_ID,
          content: content + (attachments?.length ? ` [${attachments.length} attachment(s)]` : ''),
          isUserMessage: true
        });

        if (streaming) {
          res.write(`data: ${JSON.stringify({ type: 'processing', conversationId: currentConversationId, userMessage: savedUserMessage })}\n\n`);
        }

        const [aiResult] = await Promise.all([
          aiService.getChatResponse(content, FIXED_USER_ID, currentConversationId, legacyUserMessage.id,
            coachingMode, conversationHistory, { provider: aiProvider, model: aiModel },
            attachments || [], automaticModelSelection || false),
          attachmentProcessing
        ]);

        const [savedAiMessage] = await db.insert(conversationMessages).values({
          conversationId: currentConversationId, role: 'assistant', content: aiResult.response
        }).returning();

        const legacyAiMessage = await storage.createMessage({
          userId: FIXED_USER_ID, content: aiResult.response, isUserMessage: false
        });

        return { userMessage: legacyUserMessage, aiMessage: legacyAiMessage, conversationId: currentConversationId, memoryInfo: aiResult.memoryInfo };
      };

      const result = await processOperations();

      if (streaming) {
        res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'typing_end' })}\n\n`);
        res.end();
      } else {
        res.status(201).json(result);
      }
    } catch (error) {
      const isStreaming = req.body?.streaming || false;
      if (isStreaming) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error instanceof z.ZodError ? "Invalid request data" : "Failed to process message"
        })}\n\n`);
        res.end();
      } else {
        res.status(error instanceof z.ZodError ? 400 : 500).json({ 
          message: error instanceof z.ZodError ? "Invalid request data" : "Failed to process message",
          ...(error instanceof z.ZodError && { errors: error.errors })
        });
      }
    }
  });

  app.get("/api/conversations", async (req, res) => {
    try {
      const convs = await db.select().from(conversations).where(eq(conversations.userId, FIXED_USER_ID)).orderBy(desc(conversations.updatedAt));
      res.json(convs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
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
      const transcription = await transcriptionService.transcribeWithOpenAI(req.file.path);
      res.json({ transcription });
    } catch (error) {
      res.status(500).json({ error: 'Transcription failed' });
    }
  });

  app.post("/api/transcribe/google", audioUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
      const transcription = await transcriptionService.transcribeWithGoogle(req.file.path);
      res.json({ transcription });
    } catch (error) {
      res.status(500).json({ error: 'Transcription failed' });
    }
  });

  return httpServer;
}