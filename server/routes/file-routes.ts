// MAX_LINES: 270
// File Routes Module - File upload, management, categorization, Go service
import { Express } from "./shared-dependencies.js";
import { 
  storage,
  db,
  files,
  fileCategories,
  categoryService,
  attachmentRetentionService,
  eq,
  join,
  existsSync,
  statSync,
  unlinkSync,
  fs,
  nanoid,
  multer
} from "./shared-dependencies.js";
import { startGoAccelerationService } from "./shared-utils.js";

const FIXED_USER_ID = 1;

// Configure multer for general file uploads
const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    // Allow all file types for general upload
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain', 'application/json', 'text/csv',
      'application/zip', 'application/x-zip-compressed',
      'text/xml', 'application/xml', 'application/octet-stream',
      'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('text/') || file.mimetype.startsWith('application/')) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

export async function registerFileRoutes(app: Express): Promise<void> {
  // File upload endpoint - CRITICAL for chat attachments and file manager
  app.post("/api/upload", fileUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }
      
      const file = req.file;
      const fileSizeInMB = file.size / (1024 * 1024);
      const lowerFileName = file.originalname.toLowerCase();
      const isLargeDataFile = fileSizeInMB > 5 && (
        lowerFileName.endsWith('.xml') || 
        lowerFileName.endsWith('.json') || 
        lowerFileName.endsWith('.csv') ||
        file.mimetype.includes('xml') ||
        file.mimetype.includes('json') ||
        file.mimetype.includes('csv')
      );

      // Auto-start Go service for large files
      if (isLargeDataFile) {
        console.log(`Large data file detected (${fileSizeInMB.toFixed(1)}MB): ${file.originalname}`);
        try {
          await startGoAccelerationService();
          console.log('Go acceleration service started successfully');
        } catch (error) {
          console.log('Go service auto-start failed, continuing with TypeScript processing');
        }
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const fileId = nanoid();
      const fileExtension = file.originalname.split('.').pop() || '';
      const fileName = `${fileId}.${fileExtension}`;
      const filePath = join(uploadsDir, fileName);

      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Validate category if provided
      let validatedCategoryId: string | undefined = undefined;
      const categoryIdFromRequest = req.body.category as string | undefined;
      
      if (categoryIdFromRequest) {
        try {
          const category = await categoryService.getCategoryById(categoryIdFromRequest, FIXED_USER_ID);
          if (!category) {
            return res.status(400).json({
              error: "Invalid category ID provided",
              details: `Category with ID '${categoryIdFromRequest}' not found`
            });
          }
          validatedCategoryId = category.id;
        } catch (error) {
          console.error('Category validation error:', error);
          return res.status(500).json({ error: "Error validating category" });
        }
      }

      // Get retention information
      const retentionInfo = await attachmentRetentionService.getRetentionInfo(
        file.originalname,
        file.mimetype
      );

      // Store file in database
      const fileData = {
        id: fileId,
        fileName: fileName,
        displayName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: filePath,
        userId: FIXED_USER_ID,
        categoryId: validatedCategoryId,
        retentionPolicy: retentionInfo.category,
        retentionDays: retentionInfo.retentionDays,
        uploadSource: 'manual' as const,
        metadata: {
          originalName: file.originalname,
          retentionInfo
        }
      };

      // Insert into database
      const [insertedFile] = await db.insert(files).values(fileData).returning();

      res.json({
        id: insertedFile.id,
        fileName: insertedFile.fileName,
        displayName: insertedFile.displayName,
        fileType: insertedFile.fileType,
        fileSize: insertedFile.fileSize,
        url: `/uploads/${fileName}`,
        categoryId: validatedCategoryId,
        retentionInfo
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Get user files
  app.get('/api/files', async (req, res) => {
    try {
      const userId = FIXED_USER_ID;

      // Query files from dedicated files table with category information
      const userFiles = await db
        .select({
          id: files.id,
          fileName: files.fileName,
          displayName: files.displayName,
          fileType: files.fileType,
          fileSize: files.fileSize,
          createdAt: files.createdAt,
          filePath: files.filePath,
          retentionPolicy: files.retentionPolicy,
          retentionDays: files.retentionDays,
          scheduledDeletion: files.scheduledDeletion,
          categoryId: files.categoryId,
          uploadSource: files.uploadSource,
          metadata: files.metadata,
          isDeleted: files.isDeleted,
          categoryName: fileCategories.name,
          categoryIcon: fileCategories.icon,
          categoryColor: fileCategories.color
        })
        .from(files)
        .leftJoin(fileCategories, eq(files.categoryId, fileCategories.id))
        .where(eq(files.userId, userId));

      const fileList = userFiles
        .filter(file => !file.isDeleted)
        .map(file => {
          if (!existsSync(file.filePath)) {
            console.log(`Skipping non-existent file in listing: ${file.fileName}`);
            return null;
          }

          return {
            id: file.fileName,
            fileName: file.fileName,
            displayName: file.displayName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            uploadDate: file.createdAt?.toISOString() || new Date().toISOString(),
            url: `/uploads/${file.fileName}`,
            retentionInfo: {
              category: file.retentionPolicy,
              retentionDays: file.retentionDays || (file.retentionPolicy === 'high' ? -1 : file.retentionDays),
              reason: (file.metadata as any)?.retentionInfo?.reason || 'Auto-categorized'
            },
            categoryId: file.categoryId,
            categoryName: file.categoryName,
            categoryIcon: file.categoryIcon,
            categoryColor: file.categoryColor,
            uploadSource: file.uploadSource,
            scheduledDeletion: file.scheduledDeletion?.toISOString() || null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (!a || !b) return 0;
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        });

      res.json(fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  // Delete files
  app.post('/api/files/delete', async (req, res) => {
    try {
      const { fileIds } = req.body;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'No file IDs provided' });
      }

      let deletedCount = 0;
      let freedSpace = 0;
      let notFoundCount = 0;

      for (const fileId of fileIds) {
        try {
          const filePath = join(process.cwd(), 'uploads', fileId);
          console.log(`Attempting to delete file: ${filePath}`);

          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            unlinkSync(filePath);
            deletedCount++;
            freedSpace += stats.size;
            console.log(`Successfully deleted file: ${fileId}, size: ${stats.size} bytes`);
          } else {
            notFoundCount++;
            console.log(`File not found (already deleted or missing): ${filePath}`);
          }

          // Mark as deleted in database
          await db
            .update(files)
            .set({ isDeleted: true })
            .where(eq(files.fileName, fileId));

        } catch (error) {
          console.error(`Failed to delete file ${fileId}:`, error);
        }
      }

      console.log(`Deletion summary: ${deletedCount} files deleted, ${notFoundCount} files not found, ${freedSpace} bytes freed`);

      const totalProcessed = deletedCount + notFoundCount;
      res.json({ 
        deletedCount: totalProcessed, 
        actuallyDeleted: deletedCount,
        notFound: notFoundCount,
        freedSpace 
      });
    } catch (error) {
      console.error('Error deleting files:', error);
      res.status(500).json({ error: 'Failed to delete files' });
    }
  });

  // Update file categories
  app.patch('/api/files/categorize', async (req, res) => {
    try {
      const { fileIds, categoryId } = req.body;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: 'No file IDs provided' });
      }

      // Validate category if provided
      if (categoryId) {
        const category = await categoryService.getCategoryById(categoryId, FIXED_USER_ID);
        if (!category) {
          return res.status(400).json({ error: 'Invalid category ID' });
        }
      }

      // Update files in database
      let updatedCount = 0;
      for (const fileId of fileIds) {
        try {
          const result = await db
            .update(files)
            .set({ 
              categoryId: categoryId || null,
              updatedAt: new Date()
            })
            .where(eq(files.fileName, fileId))
            .returning();

          if (result.length > 0) {
            updatedCount++;
            console.log(`Updated category for file ${fileId} to ${categoryId || 'uncategorized'}`);
          }
        } catch (error) {
          console.error(`Failed to update category for file ${fileId}:`, error);
        }
      }

      res.json({ 
        success: true,
        updatedCount,
        categoryId: categoryId || null
      });
    } catch (error) {
      console.error('Error updating file categories:', error);
      res.status(500).json({ error: 'Failed to update file categories' });
    }
  });

  // Go acceleration service health check
  app.get('/api/accelerate/health', async (req, res) => {
    try {
      const healthCheck = await fetch('http://localhost:5001/accelerate/health');
      if (healthCheck.ok) {
        const result = await healthCheck.json();
        res.json(result);
      } else {
        res.status(503).json({ status: 'Go service not available' });
      }
    } catch (error) {
      res.status(503).json({ status: 'Go service not available', error: 'Connection failed' });
    }
  });

  // Start Go acceleration service
  app.post('/api/accelerate/start', async (req, res) => {
    try {
      await startGoAccelerationService();
      res.json({ message: 'Go acceleration service startup initiated' });
    } catch (error) {
      console.error('Error starting Go service:', error);
      res.status(500).json({ message: 'Failed to start Go acceleration service' });
    }
  });

  // Get file categories - CRITICAL for file manager category selection
  app.get('/api/files/categories', async (req, res) => {
    try {
      const categories = await db
        .select({
          id: fileCategories.id,
          name: fileCategories.name,
          description: fileCategories.description,
          icon: fileCategories.icon,
          color: fileCategories.color
        })
        .from(fileCategories)
        .where(eq(fileCategories.userId, FIXED_USER_ID));

      res.json(categories);
    } catch (error) {
      console.error('Error fetching file categories:', error);
      res.status(500).json({ error: 'Failed to fetch file categories' });
    }
  });

  console.log('File routes registered successfully');
}