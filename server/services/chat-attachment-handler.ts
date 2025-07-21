// Chat Attachment Upload Handler
// @used-by server/routes/chat-routes.ts

import { 
  multer, join, existsSync, fs, nanoid, db, files, attachmentRetentionService, eq
} from "../routes/shared-dependencies.js";

const FIXED_USER_ID = 1;

// Chat-specific file upload configuration
export const chatUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'application/pdf', 'text/',
      'application/json', 'application/xml', 'text/xml', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument'
    ];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    cb(null, isAllowed);
  }
});

/**
 * Handles chat-specific file upload processing
 * @param file The uploaded file from multer
 * @returns The saved file record with attachment metadata
 */
export async function processChatAttachment(file: Express.Multer.File) {
  // Chat-specific file processing
  const originalName = file.originalname;
  const fileName = `${nanoid()}-${originalName}`;
  const filePath = join(process.cwd(), 'uploads', fileName);

  // Move file to final location
  fs.renameSync(file.path, filePath);
  
  // Chat-specific retention logic
  const categorization = await (await attachmentRetentionService()).categorizeAttachment(
    originalName, file.mimetype, "Chat attachment upload"
  );
  
  const retentionDays = categorization.category === 'high' ? -1 : // Keep permanently for high-value content
                       categorization.category === 'medium' ? 90 : 30;
  const scheduledDeletion = retentionDays > 0 ? 
    new Date(Date.now() + (retentionDays * 24 * 60 * 60 * 1000)) : null;

  // Save to files table with chat-specific metadata
  const [savedFile] = await db.insert(files).values({
    userId: FIXED_USER_ID,
    categoryId: categorization.suggestedCategoryId || null,
    fileName: fileName,
    displayName: originalName,
    filePath: filePath,
    fileType: file.mimetype,
    fileSize: file.size,
    uploadSource: 'chat',
    retentionPolicy: categorization.category,
    retentionDays,
    scheduledDeletion,
    metadata: { 
      uploadContext: 'chat',
      categorization,
      chatSpecific: true
    }
  }).returning();

  return {
    file: {
      id: savedFile.id,
      fileName: fileName,
      originalName: originalName,
      displayName: originalName,
      url: `/uploads/${fileName}`,
      retentionInfo: {
        category: categorization.category,
        retentionDays,
        reason: categorization.reason
      }
    }
  };
}

/**
 * Processes attachments for message storage
 * @param attachments Array of attachment objects from the message
 * @param conversationId The conversation ID
 * @param messageId The message ID
 */
export async function processMessageAttachments(
  attachments: any[],
  conversationId: string,
  messageId: string
) {
  if (!attachments?.length) return Promise.resolve();

  return Promise.all(attachments.map(async (attachment) => {
    try {
      const categorization = await (await attachmentRetentionService()).categorizeAttachment(
        attachment.displayName || attachment.fileName, 
        attachment.fileType,
        `Chat upload in conversation: ${conversationId}`
      );
      
      const retentionDays = categorization.category === 'medium' ? 90 : 
                          categorization.category === 'low' ? 30 : null;
      const scheduledDeletion = retentionDays ? 
        new Date(Date.now() + (retentionDays * 24 * 60 * 60 * 1000)) : null;

      const existingFile = await db.select().from(files)
        .where(eq(files.fileName, attachment.fileName)).limit(1);
      
      if (existingFile.length === 0) {
        await db.insert(files).values({
          userId: FIXED_USER_ID, 
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
            conversationId: conversationId, 
            messageId: messageId, 
            categorization 
          }
        });
      }
    } catch (error) {
      console.error(`Failed to save attachment ${attachment.fileName}:`, error);
    }
  }));
}