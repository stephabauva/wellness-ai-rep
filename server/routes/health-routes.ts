// MAX_LINES: 300
// Health Routes Module - Health data management, import/export, native integration
import { Express } from "./shared-dependencies.js";
import { 
  storage, 
  healthConsentService
} from "./shared-dependencies.js";

export async function registerHealthRoutes(app: Express): Promise<void> {

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
      await healthConsentService.updateConsentSettings(1, updates);
      res.json({ message: "Health consent settings updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update health consent settings" });
    }
  });

  // Health metrics visibility endpoints
  app.get("/api/health-consent/visibility", async (req, res) => {
    try {
      const consentSettings = await healthConsentService.getUserConsentSettings(1);
      const healthConsent = healthConsentService.transformConsentToSettings(consentSettings);
      
      // Extract visibility settings from health consent
      const visibilitySettings = {
        visible_categories: healthConsent.data_visibility?.visible_categories || [],
        hidden_categories: healthConsent.data_visibility?.hidden_categories || [],
        dashboard_preferences: {
          visible_metrics: healthConsent.data_visibility?.dashboard_preferences?.visible_metrics || [],
          hidden_metrics: healthConsent.data_visibility?.dashboard_preferences?.hidden_metrics || [],
          metric_order: healthConsent.data_visibility?.dashboard_preferences?.metric_order || []
        }
      };
      
      res.json(visibilitySettings);
    } catch (error) {
      console.error('Error fetching visibility settings:', error);
      res.status(500).json({ message: "Failed to fetch visibility settings" });
    }
  });

  app.patch("/api/health-consent/visibility", async (req, res) => {
    try {
      const visibilityUpdates = req.body;
      
      // Get current consent settings
      const currentSettings = await healthConsentService.getUserConsentSettings(1);
      const currentConsent = healthConsentService.transformConsentToSettings(currentSettings);
      
      // Update visibility settings within the consent structure
      const updatedConsent = {
        ...currentConsent,
        data_visibility: {
          ...currentConsent.data_visibility,
          visible_categories: visibilityUpdates.visible_categories || currentConsent.data_visibility?.visible_categories || [],
          hidden_categories: visibilityUpdates.hidden_categories || currentConsent.data_visibility?.hidden_categories || [],
          dashboard_preferences: {
            ...currentConsent.data_visibility?.dashboard_preferences,
            ...visibilityUpdates.dashboard_preferences
          }
        }
      };
      
      await healthConsentService.updateConsentSettings(1, updatedConsent);
      
      // Return the updated visibility settings
      const responseSettings = {
        visible_categories: updatedConsent.data_visibility.visible_categories,
        hidden_categories: updatedConsent.data_visibility.hidden_categories,
        dashboard_preferences: updatedConsent.data_visibility.dashboard_preferences
      };
      
      res.json(responseSettings);
    } catch (error) {
      console.error('Error updating visibility settings:', error);
      res.status(500).json({ message: "Failed to update visibility settings" });
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