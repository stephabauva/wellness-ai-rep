// MAX_LINES: 280
// Chat Routes Module - Conversations, Messages, and Transcription
import { createServer, type Server } from "http";
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
import { 
  ensureConversation, getUserConversations, getConversationHistory, 
  getConversationMessages, updateConversationTimestamp
} from "../services/chat-conversation-manager.js";
import { 
  saveUserMessage, saveAiMessage, createLegacyMessage
} from "../services/chat-message-handler.js";
import { messageSchema } from "../services/chat-validation.js";


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
      const userConversations = await getUserConversations();
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
      currentConversationId = await ensureConversation(currentConversationId, content, attachments);

      // Save user message to database
      const savedUserMessage = await saveUserMessage(currentConversationId, content, attachments);

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
      const savedAiMessage = await saveAiMessage(currentConversationId, fullAiResponse);

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
      await updateConversationTimestamp(currentConversationId!);

      sendDone(res, currentConversationId!);
      res.end();
    } catch (error) {
      console.error('[STREAMING_ERROR] Error in streaming endpoint:', error);
      sendError(res, error instanceof Error && error.name === 'ZodError' ? "Invalid request data" : "Failed to process message");
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
        // Ensure conversation exists and get history
        currentConversationId = await ensureConversation(currentConversationId, content, attachments);
        conversationHistory = await getConversationHistory(currentConversationId, 20);

        const savedUserMessage = await saveUserMessage(currentConversationId!, content, attachments);

        const attachmentProcessing = attachments?.length ? 
          processMessageAttachments(attachments, currentConversationId!, savedUserMessage.id) : 
          Promise.resolve();

        const legacyUserMessage = await createLegacyMessage(
          content + (attachments?.length ? ` [${attachments.length} attachment(s)]` : ''),
          true
        );

        if (streaming) {
          sendProcessingUpdate(res, currentConversationId!, savedUserMessage);
        }

        const [aiResult] = await Promise.all([
          aiService.getChatResponse(content, FIXED_USER_ID, currentConversationId!, legacyUserMessage.id,
            coachingMode, conversationHistory, { provider: aiProvider, model: aiModel },
            attachments || [], automaticModelSelection || false),
          attachmentProcessing
        ]);

        const savedAiMessage = await saveAiMessage(currentConversationId!, aiResult.response);

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
        await updateConversationTimestamp(currentConversationId!);

        const legacyAiMessage = await createLegacyMessage(aiResult.response, false);

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
      const errorMessage = error instanceof Error && error.name === 'ZodError' ? "Invalid request data" : "Failed to process message";
      
      if (isStreaming) {
        sendError(res, errorMessage);
        res.end();
      } else {
        res.status(error instanceof Error && error.name === 'ZodError' ? 400 : 500).json({ 
          message: errorMessage,
          ...(error instanceof Error && error.name === 'ZodError' && { errors: (error as any).errors })
        });
      }
    }
  });


  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const messages = await getConversationMessages(req.params.id);
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