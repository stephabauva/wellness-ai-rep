import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerSimpleRoutes } from "./routes-simple";
import { setupVite, serveStatic, log } from "./vite";
import { storage, DatabaseStorage } from "./storage";
import { databaseMigrationService } from "./services/database-migration-service";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize database with indexes and optimizations
async function initializeDatabase() {
  try {
    console.log('Initializing PostgreSQL database...');
    await databaseMigrationService.initializeDatabase();
    
    const health = await databaseMigrationService.checkDatabaseHealth();
    console.log(`Database health check: ${health.connectionStatus}, ${health.tableCount} tables, ${health.indexCount} indexes, performance: ${health.performance}`);
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Continue startup but log the error
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize PostgreSQL database with indexes and sample data
    if (storage instanceof DatabaseStorage) {
      log("Initializing PostgreSQL database...");
      await initializeDatabase();
      log("Database initialization completed");
    }
    
    const server = await registerRoutes(app);
    registerSimpleRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error: any) {
    log(`Error starting server: ${error?.message || 'Unknown error'}`);
    console.error(error);
    process.exit(1);
  }
})();
