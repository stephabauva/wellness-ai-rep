// MAX_LINES: 300
// Health Routes Module - Health data management, import/export, native integration
import { Express } from "./shared-dependencies.js";
import { 
  storage, 
  multer, 
  nanoid, 
  join, 
  existsSync, 
  fs, 
  path,
  HealthDataParser,
  HealthDataDeduplicationService,
  insertHealthDataSchema,
  healthConsentService,
  statSync
} from "./shared-dependencies.js";
import { startGoAccelerationService } from "./shared-utils.js";

export async function registerHealthRoutes(app: Express): Promise<void> {
  // Configure multer for health data file uploads
  const healthDataUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `health-${nanoid()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    limits: {
      fileSize: 1000 * 1024 * 1024, // 1GB limit for health data files
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'text/xml', 'application/xml', 'application/json', 'text/json',
        'text/csv', 'application/csv', 'text/plain', 'application/octet-stream',
        'text/tab-separated-values', 'application/vnd.ms-excel',
        'application/gzip', 'application/x-gzip', 'application/zip'
      ];
      
      const allowedExtensions = ['.xml', '.json', '.csv', '.txt', '.tsv', '.gz', '.zip'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      
      const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
      const isValidExtension = allowedExtensions.includes(fileExtension);
      const hasNoExtension = fileExtension === '';
      
      if (isValidMimeType || isValidExtension || (hasNoExtension && isValidMimeType)) {
        console.log(`Health data file accepted: ${file.originalname} (${file.mimetype})`);
        cb(null, true);
      } else {
        console.log(`Health data file rejected: ${file.originalname} (${file.mimetype}), extension: ${fileExtension}`);
        cb(new Error(`Invalid file type. Please upload XML, JSON, CSV, or TXT files. Received: ${file.mimetype} with extension ${fileExtension}`));
      }
    }
  });

  // Get health data
  app.get("/api/health-data", async (req, res) => {
    try {
      const range = req.query.range || "7days";
      const category = req.query.category as string;
      const healthData = await storage.getHealthData(1, String(range));

      const filteredData = category 
        ? healthData.filter(item => item.category === category)
        : healthData;

      res.json(filteredData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health data" });
    }
  });

  // Get health data by category
  app.get("/api/health-data/categories", async (req, res) => {
    try {
      const range = req.query.range || "7days";
      const healthData = await storage.getHealthData(1, String(range));

      const categorizedData = healthData.reduce((acc, item) => {
        if (!item.category) return acc;
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, typeof healthData>);

      res.json(categorizedData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categorized health data" });
    }
  });

  // Clear all health data
  app.delete("/api/health-data/reset", async (req, res) => {
    try {
      await storage.clearAllHealthData(1);
      res.json({ message: "All health data has been cleared successfully" });
    } catch (error) {
      console.error('Error clearing health data:', error);
      res.status(500).json({ message: "Failed to clear health data" });
    }
  });

  // Delete health data by type
  app.delete("/api/health-data/delete-by-type", async (req, res) => {
    try {
      const { dataType } = req.body;
      
      if (!dataType) {
        return res.status(400).json({ message: "dataType is required" });
      }

      const result = await storage.deleteHealthDataByType(1, dataType);
      
      res.json({ 
        message: `Successfully deleted all ${dataType} data`,
        deletedCount: result.deletedCount || 0
      });
    } catch (error) {
      console.error('Error deleting health data by type:', error);
      res.status(500).json({ message: "Failed to delete health data" });
    }
  });

  // Parse health data file
  app.post("/api/health-data/parse", healthDataUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filePath = req.file.path;
      const fileSize = statSync(filePath).size;
      const fileSizeMB = Math.round(fileSize / (1024 * 1024));

      // Auto-start Go service for large files
      if (fileSize > 5 * 1024 * 1024) {
        console.log(`Large health file detected (${fileSizeMB}MB), attempting Go service startup...`);
        await startGoAccelerationService();
      }

      const parser = new HealthDataParser();
      const { healthData, metadata, error } = await parser.parseHealthDataFile(
        filePath, 
        req.file.originalname
      );

      if (error) {
        return res.status(400).json({ message: error });
      }

      res.json({
        success: true,
        totalRecords: healthData.length,
        sampleData: healthData.slice(0, 10),
        metadata,
        fileInfo: {
          originalName: req.file.originalname,
          size: fileSize,
          sizeMB: fileSizeMB
        }
      });
    } catch (error) {
      console.error('Health data parsing error:', error);
      res.status(500).json({ message: "Failed to parse health data file" });
    }
  });

  // Import health data
  app.post("/api/health-data/import", healthDataUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filePath = req.file.path;
      const fileSize = statSync(filePath).size;

      // Auto-start Go service for large files
      if (fileSize > 5 * 1024 * 1024) {
        await startGoAccelerationService();
      }

      const parser = new HealthDataParser();
      const { healthData, metadata, error } = await parser.parseHealthDataFile(
        filePath, 
        req.file.originalname
      );

      if (error) {
        return res.status(400).json({ message: error });
      }

      // Process and store health data
      const deduplicationService = new HealthDataDeduplicationService();
      let processedData = healthData;

      if (healthData.length > 0) {
        processedData = await deduplicationService.deduplicateHealthData(healthData, 1);
      }

      const validatedData = processedData.map(point => ({
        ...point,
        userId: 1,
        timestamp: point.timestamp || new Date()
      }));

      await storage.insertHealthDataBatch(validatedData);

      res.json({
        success: true,
        totalRecords: healthData.length,
        uniqueRecords: processedData.length,
        duplicatesRemoved: healthData.length - processedData.length,
        metadata
      });
    } catch (error) {
      console.error('Health data import error:', error);
      res.status(500).json({ message: "Failed to import health data" });
    }
  });

  // Health consent endpoints
  app.get("/api/health-consent", async (req, res) => {
    try {
      const consentSettings = await healthConsentService.getUserConsentSettings(1);
      const healthConsent = healthConsentService.transformConsentToSettings(consentSettings);
      res.json(healthConsent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health consent settings" });
    }
  });

  app.patch("/api/health-consent", async (req, res) => {
    try {
      const updates = req.body;
      await healthConsentService.updateUserConsentSettings(1, updates);
      res.json({ message: "Health consent settings updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update health consent settings" });
    }
  });

  // Native health integration endpoints
  app.get("/api/native-health/capabilities", async (req, res) => {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const isCapacitor = req.headers['x-capacitor-platform'] !== undefined;
      const platform = req.headers['x-capacitor-platform'] || 'web';
      
      const capabilities = {
        platform: isCapacitor ? platform : 'web',
        isCapacitor,
        healthDataAccess: isCapacitor && ['ios', 'android'].includes(platform as string),
        backgroundSync: isCapacitor && ['ios', 'android'].includes(platform as string),
        bluetoothLE: isCapacitor && ['ios', 'android'].includes(platform as string),
        fileUpload: true,
        pushNotifications: isCapacitor && ['ios', 'android'].includes(platform as string),
        supportedProviders: isCapacitor 
          ? (platform === 'ios' ? ['HealthKit'] : platform === 'android' ? ['Google Fit', 'Health Connect'] : ['File Upload'])
          : ['File Upload']
      };
      
      res.json(capabilities);
    } catch (error) {
      console.error('Native health capabilities error:', error);
      res.status(500).json({ error: "Failed to get platform capabilities" });
    }
  });

  console.log('Health routes registered successfully');
}