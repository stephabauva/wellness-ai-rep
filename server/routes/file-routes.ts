// MAX_LINES: 270
// File Routes Module - File upload, management, categorization, Go service
import { Express } from "./shared-dependencies.js";
import { 
  storage,
  db,
  files,
  fileCategories,
  categoryService,
  insertFileSchema,
  eq,
  join,
  existsSync,
  statSync,
  unlinkSync,
  fs,
  nanoid,
  multer,
  z
} from "./shared-dependencies.js";
import { startGoAccelerationService } from "./shared-utils.js";
import { seedDefaultCategories } from "../services/category-service.js";

const FIXED_USER_ID = 1;

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    console.log('File filter called with:', { originalname: file.originalname, mimetype: file.mimetype });
    const allowedTypes = [
      'image/', 'video/', 'audio/', 'application/pdf', 'text/',
      'application/json', 'application/xml', 'text/xml', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument',
      'application/gzip', 'application/x-gzip' // Support compressed files
    ];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type));
    console.log('File allowed:', isAllowed);
    cb(null, isAllowed);
  }
});

const categorySchema = z.object({
  categoryId: z.string().optional().or(z.literal("")).transform(val => val === "" ? undefined : val)
});

export async function registerFileRoutes(app: Express): Promise<void> {
  // File upload endpoint - CRITICAL: This was missing from routes modularization
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      console.log('Upload request received:', { 
        body: req.body, 
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        } : 'undefined'
      });
      
      if (!req.file) {
        console.error('No file in request. Multer might have rejected it.');
        return res.status(400).json({ error: 'No file uploaded or file was rejected' });
      }

      const { categoryId } = categorySchema.parse(req.body);
      const file = req.file;
      const originalName = file.originalname;
      const fileName = `${nanoid()}-${originalName}`;
      const filePath = join(process.cwd(), 'uploads', fileName);

      // Move file to final location
      fs.renameSync(file.path, filePath);

      // Auto-start Go service for large files
      if (file.size > 5 * 1024 * 1024) {
        try {
          await startGoAccelerationService();
        } catch (error) {
          console.log('Go service auto-start failed, continuing with standard processing');
        }
      }

      // Determine retention policy
      const isHealthData = /\.(xml|json|csv)$/i.test(originalName) || 
                          /health|medical|export/i.test(originalName);
      const retentionPolicy = isHealthData ? 'high' : 'medium';
      const retentionDays = isHealthData ? -1 : 90;

      // Create file data with proper validation
      const fileData = insertFileSchema.parse({
        userId: FIXED_USER_ID,
        fileName: fileName,
        displayName: originalName,
        filePath: filePath,
        fileType: file.mimetype,
        fileSize: file.size,
        retentionPolicy: retentionPolicy,
        retentionDays: retentionDays,
        categoryId: categoryId || null,
        uploadSource: 'chat',
        metadata: {
          retentionInfo: {
            category: retentionPolicy,
            retentionDays: retentionDays,
            reason: isHealthData ? 'Medical data' : 'General file'
          }
        }
      });

      // Save to database
      const fileRecord = await db.insert(files).values(fileData).returning();

      res.json({
        file: {
          id: fileName,
          fileName: fileName,
          displayName: originalName,
          originalName: originalName,
          fileType: file.mimetype,
          fileSize: file.size,
          url: `/uploads/${fileName}`,
          retentionInfo: {
            category: retentionPolicy,
            retentionDays: retentionDays,
            reason: isHealthData ? 'Medical data' : 'General file'
          }
        }
      });
    } catch (error) {
      console.error('File upload error:', error);
      if (error instanceof Error && error.message.includes('validation')) {
        console.error('Validation error details:', { body: req.body, error: error.message });
        res.status(400).json({ error: 'Invalid request data: ' + error.message });
      } else {
        res.status(500).json({ error: 'Failed to upload file' });
      }
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
        .filter((file: any) => !file.isDeleted)
        .map((file: any) => {
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
        .sort((a: any, b: any) => {
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
        const category = await categoryService().getCategoryById(categoryId, FIXED_USER_ID);
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

  // Categories CRUD endpoints
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await categoryService().getCategories(FIXED_USER_ID);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post('/api/categories', async (req, res) => {
    try {
      const categoryData = req.body;
      const newCategory = await categoryService().createCategory(FIXED_USER_ID, categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      const message = error instanceof Error ? error.message : 'Failed to create category';
      res.status(400).json({ error: message });
    }
  });

  app.put('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = req.params.id;
      const categoryData = req.body;
      const updatedCategory = await categoryService().updateCategory(FIXED_USER_ID, categoryId, categoryData);
      
      if (!updatedCategory) {
        return res.status(404).json({ error: 'Category not found or not authorized' });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      const message = error instanceof Error ? error.message : 'Failed to update category';
      res.status(400).json({ error: message });
    }
  });

  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const categoryId = req.params.id;
      const result = await categoryService().deleteCategory(FIXED_USER_ID, categoryId);
      
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting category:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete category';
      res.status(400).json({ error: message });
    }
  });

  // Go acceleration service health check
  app.get('/api/accelerate/health', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const healthCheck = await fetch('http://localhost:5001/accelerate/health', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (healthCheck.ok) {
        const result = await healthCheck.json();
        res.json(result);
      } else {
        // Don't log as error - this is expected when Go service is not running
        res.status(503).json({ status: 'Go service not available' });
      }
    } catch (error) {
      // Don't log as error - this is expected when Go service is not running
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

  // Seed default categories endpoint (for admin/development)
  app.post('/api/categories/seed', async (req, res) => {
    try {
      await seedDefaultCategories();
      res.json({ message: 'Default categories seeded successfully' });
    } catch (error) {
      console.error('Error seeding default categories:', error);
      res.status(500).json({ error: 'Failed to seed default categories' });
    }
  });

  // Seed default categories on startup
  try {
    await seedDefaultCategories();
    console.log('Default categories seeded on startup');
  } catch (error) {
    console.error('Failed to seed default categories on startup:', error);
  }

  console.log('File routes registered successfully');
}