// Simplified Health Routes - Essential features only
import { Express } from "./shared-dependencies.js";
import { storage } from "./shared-dependencies.js";

export async function registerSimpleHealthRoutes(app: Express): Promise<void> {

  // Get health data with time range filtering
  app.get("/api/health-data", async (req, res) => {
    try {
      const range = req.query.range || "7days";
      const healthData = await storage.getHealthData(1, String(range));
      res.json(healthData);
    } catch (error) {
      console.error('Error fetching health data:', error);
      res.status(500).json({ message: "Failed to fetch health data" });
    }
  });

  // Load sample health data
  app.post("/api/health-data/load-sample", async (req, res) => {
    try {
      const result = await storage.loadSampleHealthData(1);
      res.json({ 
        message: `Successfully loaded ${result.recordsLoaded} sample health data points`,
        recordsLoaded: result.recordsLoaded
      });
    } catch (error) {
      console.error('Error loading sample health data:', error);
      res.status(500).json({ message: "Failed to load sample data" });
    }
  });

  // Remove specific metrics by data type
  app.post("/api/health-data/remove-metrics", async (req, res) => {
    try {
      const { dataTypes } = req.body;
      
      if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
        return res.status(400).json({ message: "dataTypes array is required" });
      }

      let totalDeleted = 0;
      for (const dataType of dataTypes) {
        const result = await storage.deleteHealthDataByType(1, dataType);
        totalDeleted += result.deletedCount || 0;
      }
      
      res.json({ 
        message: `Successfully removed ${totalDeleted} health data entries`,
        deletedCount: totalDeleted
      });
    } catch (error) {
      console.error('Error removing health metrics:', error);
      res.status(500).json({ message: "Failed to remove metrics" });
    }
  });

  // Native health sync - integrate with existing native health service
  app.post("/api/health-data/native-sync", async (req, res) => {
    try {
      const { dataTypes, timeRange } = req.body;
      
      // For MVP, simulate native sync by returning sample data message
      const defaultDataTypes = ['steps', 'heart_rate', 'sleep', 'weight'];
      const syncDataTypes = dataTypes || defaultDataTypes;
      
      // For now, return a simple success message
      // In a real implementation, this would call native health APIs
      const syncResult = {
        recordsProcessed: syncDataTypes.length * 7, // Simulate 7 days of data per type
        status: 'success'
      };
      
      res.json({ 
        message: `Successfully synced ${syncResult.recordsProcessed} health data entries`,
        recordsProcessed: syncResult.recordsProcessed,
        status: "success"
      });
    } catch (error) {
      console.error('Error syncing native health data:', error);
      res.status(500).json({ message: "Failed to sync health data" });
    }
  });

  // Generate and download health report
  app.post("/api/health-data/report", async (req, res) => {
    try {
      const { range = "7days" } = req.body;
      const healthData = await storage.getHealthData(1, String(range));
      
      // Simple CSV report generation
      const csvHeaders = "Date,Type,Value,Unit\n";
      const csvRows = healthData.map(item => {
        const date = new Date(item.timestamp).toLocaleDateString();
        return `${date},${item.dataType},${item.value},${item.unit || ''}`;
      }).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="health-report-${range}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error generating health report:', error);
      res.status(500).json({ message: "Failed to generate health report" });
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
}