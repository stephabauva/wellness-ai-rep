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
      const consentSettings = await healthConsentService.getUserConsentSettings(1);
      const healthConsent = healthConsentService.transformConsentToSettings(consentSettings);

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

        attachmentRetentionService.updateRetentionDurations(retentionUpdates);
      }

      // Update health consent settings if provided
      if (settings.health_consent) {
        await healthConsentService.updateConsentSettings(1, settings.health_consent);
      }

      const updatedUser = await storage.updateUserSettings(1, settings);

      // Get updated health consent settings
      const consentSettings = await healthConsentService.getUserConsentSettings(1);
      const healthConsent = healthConsentService.transformConsentToSettings(consentSettings);

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
          email: user.email || 'user@example.com'
        },
        healthData,
        generatedAt: new Date(),
        reportPeriod: range
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

  console.log('Settings routes registered successfully');
}