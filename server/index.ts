// @used-by infrastructure/server
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes/index";
import { registerSimpleRoutes } from "./routes-simple";
import { setupVite, serveStatic, log } from "./vite";
import { storage, DatabaseStorage } from "@shared/database/storage";
import { databaseMigrationService } from "./services/database-migration-service";
import { logger } from "../shared/services/logger-service";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Initialize database with indexes and optimizations
async function initializeDatabase() {
  try {
    logger.system('Initializing PostgreSQL database...');
    await databaseMigrationService.initializeDatabase();

    const health = await databaseMigrationService.checkDatabaseHealth();
    if (health.performance === 'warning' || health.connectionStatus !== 'connected') {
      logger.warn(`Database health: ${health.connectionStatus}, ${health.tableCount} public schema tables, ${health.indexCount} performance indexes, performance: ${health.performance}`);
    } else {
      logger.system(`Database ready: ${health.tableCount} public schema tables, ${health.indexCount} performance indexes`);
    }
  } catch (error) {
    logger.error('Database initialization failed', error as Error);
    // Continue startup but log the error
  }
}

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      logger.request(req.method, req.path, res.statusCode, duration);
    }
  });

  next();
});

(async () => {
  try {
    // Handle local database initialization if needed
    const databaseUrl = process.env.DATABASE_URL;
    const isLocalDatabase = databaseUrl?.includes('localhost');
    const hasLocalEnvFile = existsSync('.env.local');
    
    if (isLocalDatabase && hasLocalEnvFile) {
      // Initialize local database before registering routes
      logger.system('Initializing local database connection...');
      const { initializeDatabase } = await import('../shared/database/db.js');
      await initializeDatabase();
      logger.system('Local database connection initialized');
    } else {
      // Initialize PostgreSQL database with indexes and optimizations for Replit/production
      if (storage instanceof DatabaseStorage) {
        logger.system('Starting database initialization process...');
        const dbInitStartTime = Date.now();
        await initializeDatabase();
        const dbInitEndTime = Date.now();
        logger.system(`Database initialization process completed in ${dbInitEndTime - dbInitStartTime}ms`);
      }
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
    }, () => {
      logger.system(`Server running on port ${port}`);
    });
  } catch (error: any) {
    logger.error('Error starting server', error);
    process.exit(1);
  }
})();