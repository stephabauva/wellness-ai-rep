// MAX_LINES: 60 - Routes Module Index
import type { Express } from "express";
import type { Server } from "http";
import { registerChatRoutes } from "./chat-routes";
import { registerHealthRoutes } from "./health-routes";
import { registerMemoryRoutes } from "./memory-routes";
import { registerFileRoutes } from "./file-routes";
import { registerSettingsRoutes } from "./settings-routes";
import { registerMonitoringRoutes } from "./monitoring-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const server = await registerChatRoutes(app);
  await registerHealthRoutes(app);
  await registerMemoryRoutes(app);
  await registerFileRoutes(app);
  await registerSettingsRoutes(app);
  await registerMonitoringRoutes(app);
  return server;
}

export const ROUTE_MODULES = {
  chat: { maxLines: 280, registered: false },
  health: { maxLines: 300, registered: false },
  memory: { maxLines: 280, registered: false },
  files: { maxLines: 270, registered: false },
  settings: { maxLines: 250, registered: false },
  monitoring: { maxLines: 260, registered: false }
} as const;

export const EMERGENCY_FALLBACK = process.env.USE_MONOLITHIC_ROUTES === 'true';

export const ROUTE_MODULES_ENABLED = {
  chat: process.env.ENABLE_CHAT_ROUTES !== 'false',
  health: process.env.ENABLE_HEALTH_ROUTES !== 'false',
  memory: process.env.ENABLE_MEMORY_ROUTES !== 'false',
  files: process.env.ENABLE_FILE_ROUTES !== 'false',
  settings: process.env.ENABLE_SETTINGS_ROUTES !== 'false',
  monitoring: process.env.ENABLE_MONITORING_ROUTES !== 'false'
};