// MAX_LINES: 250
// Settings Routes Module - User settings, AI config, device management
import { Express } from "./shared-dependencies.js";
import { 
  storage,
  healthConsentService,
  attachmentRetentionService,
  generatePDFReport,
  enhancedSettingsUpdateSchema,
  z
} from "./shared-dependencies.js";

export async function registerSettingsRoutes(app: Express): Promise<void> {
  // Get user settings
  app.get("/api/settings", async (req, res) => {
    try {
      const user = await storage.getUser(1); // Default user ID
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get health consent settings
      const consentSettings = await (await healthConsentService()).getUserConsentSettings(1);
      const healthConsent = (await healthConsentService()).transformConsentToSettings(consentSettings);

      // Return comprehensive user settings including AI configuration and health consent
      const userSettings = {
        ...user.preferences,
        aiProvider: user.aiProvider,
        aiModel: user.aiModel,
        automaticModelSelection: user.automaticModelSelection,
        transcriptionProvider: user.transcriptionProvider,
        preferredLanguage: user.preferredLanguage,
        memoryDetectionProvider: user.memoryDetectionProvider,
        memoryDetectionModel: user.memoryDetectionModel,
        name: user.name,
        email: user.email,
        health_consent: healthConsent
      };
      
      res.json(userSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Update user settings
  app.patch("/api/settings", async (req, res) => {
    try {
      const settings = enhancedSettingsUpdateSchema.parse(req.body);

      // Update attachment retention settings if provided
      if (settings.highValueRetentionDays !== undefined || 
          settings.mediumValueRetentionDays !== undefined || 
          settings.lowValueRetentionDays !== undefined) {
        const retentionUpdates: Partial<any> = {};
        if (settings.highValueRetentionDays !== undefined) retentionUpdates.highValueRetentionDays = settings.highValueRetentionDays;
        if (settings.mediumValueRetentionDays !== undefined) retentionUpdates.mediumValueRetentionDays = settings.mediumValueRetentionDays;
        if (settings.lowValueRetentionDays !== undefined) retentionUpdates.lowValueRetentionDays = settings.lowValueRetentionDays;

        (await attachmentRetentionService()).updateRetentionDurations(retentionUpdates);
      }

      // Update health consent settings if provided
      if (settings.health_consent) {
        await (await healthConsentService()).updateConsentSettings(1, settings.health_consent);
      }

      const updatedUser = await storage.updateUserSettings(1, settings);

      // Get updated health consent settings
      const consentSettings = await (await healthConsentService()).getUserConsentSettings(1);
      const healthConsent = (await healthConsentService()).transformConsentToSettings(consentSettings);

      // Return comprehensive updated settings
      const updatedSettings = {
        ...(updatedUser.preferences || {}),
        aiProvider: updatedUser.aiProvider,
        aiModel: updatedUser.aiModel,
        automaticModelSelection: updatedUser.automaticModelSelection,
        transcriptionProvider: updatedUser.transcriptionProvider,
        preferredLanguage: updatedUser.preferredLanguage,
        memoryDetectionProvider: updatedUser.memoryDetectionProvider,
        memoryDetectionModel: updatedUser.memoryDetectionModel,
        name: updatedUser.name,
        email: updatedUser.email,
        health_consent: healthConsent
      };
      
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });

  // Generate health PDF report
  app.get("/api/reports/health-pdf", async (req, res) => {
    try {
      const user = await storage.getUser(1);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const range = req.query.range || "30days";
      const healthData = await storage.getHealthData(1, String(range));
      
      const reportData = {
        user: {
          name: user.name || 'Health Data User',
          email: user.email || 'user@example.com',
          goalType: user.preferences?.focusAreas?.[0] || 'general'
        },
        date: new Date().toISOString(),
        summary: {
          title: `Health Report - ${range}`,
          content: `Health summary for ${user.name || 'user'} covering ${range} period with ${healthData.length} data points.`
        },
        stats: {
          steps: healthData.filter(d => d.dataType === 'steps').length > 0 
            ? parseInt(healthData.filter(d => d.dataType === 'steps')[0].value) 
            : 0,
          sleep: healthData.filter(d => d.dataType === 'sleep').length > 0 
            ? `${healthData.filter(d => d.dataType === 'sleep')[0].value}h` 
            : 'No data',
          heartRate: healthData.filter(d => d.dataType === 'heartRate').length > 0 
            ? parseInt(healthData.filter(d => d.dataType === 'heartRate')[0].value) 
            : 70,
          weight: healthData.filter(d => d.dataType === 'weight').length > 0 
            ? parseInt(healthData.filter(d => d.dataType === 'weight')[0].value) 
            : 0
        },
        trends: {
          activity: [],
          sleep: []
        },
        recommendations: ['Stay active', 'Maintain consistent sleep schedule', 'Monitor key health metrics']
      };

      const pdfBuffer = await generatePDFReport(reportData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="health-report-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating health PDF report:', error);
      res.status(500).json({ message: "Failed to generate health report" });
    }
  });

  // Health consent visibility endpoint
  app.get('/api/health-consent/visibility', async (req, res) => {
    try {
      const consentSettings = {
        showConsent: true,
        requireConsent: false,
        consentVersion: '1.0',
        lastUpdated: '2025-01-01T00:00:00.000Z'
      };
      res.json(consentSettings);
    } catch (error: any) {
      console.error('Error fetching health consent visibility:', error);
      res.status(500).json({ message: 'Failed to fetch consent settings', error: error.message });
    }
  });

  // Health data categories endpoint
  app.get('/api/health-data/categories', async (req, res) => {
    try {
      const categories = [
        { id: 'steps', name: 'Steps', type: 'quantity', unit: 'count' },
        { id: 'heart_rate', name: 'Heart Rate', type: 'quantity', unit: 'bpm' },
        { id: 'sleep', name: 'Sleep', type: 'category', unit: 'hours' },
        { id: 'weight', name: 'Weight', type: 'quantity', unit: 'kg' },
        { id: 'blood_pressure', name: 'Blood Pressure', type: 'quantity', unit: 'mmHg' },
        { id: 'exercise', name: 'Exercise', type: 'category', unit: 'minutes' }
      ];
      res.json(categories);
    } catch (error: any) {
      console.error('Error fetching health data categories:', error);
      res.status(500).json({ message: 'Failed to fetch health categories', error: error.message });
    }
  });

  // Devices endpoint for health integration
  app.get('/api/devices', async (req, res) => {
    try {
      const devices = [
        { id: 'iphone', name: 'iPhone', type: 'mobile', connected: false, lastSync: null },
        { id: 'apple_watch', name: 'Apple Watch', type: 'wearable', connected: false, lastSync: null },
        { id: 'fitbit', name: 'Fitbit', type: 'wearable', connected: false, lastSync: null }
      ];
      res.json(devices);
    } catch (error: any) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ message: 'Failed to fetch devices', error: error.message });
    }
  });

  // AI Models endpoint
  app.get('/api/ai-models', async (req, res) => {
    try {
      const models = [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', capabilities: ['chat', 'vision'] },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', capabilities: ['chat'] },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'google', capabilities: ['chat', 'vision'] },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', capabilities: ['chat', 'vision'] }
      ];
      res.json(models);
    } catch (error: any) {
      console.error('Error fetching AI models:', error);
      res.status(500).json({ message: 'Failed to fetch AI models', error: error.message });
    }
  });

  console.log('Settings routes registered successfully');
}