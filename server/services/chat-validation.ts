// Chat Request Validation Schemas
// @used-by server/routes/chat-routes.ts

import { z } from "zod";

export const attachmentSchema = z.object({
  id: z.string(), 
  fileName: z.string(), 
  displayName: z.string().optional(),
  fileType: z.string(), 
  fileSize: z.number(), 
  url: z.string().optional(),
  retentionInfo: z.any().optional(), 
  categoryId: z.string().optional(),
});

export const messageSchema = z.object({
  content: z.string(), 
  conversationId: z.string().nullable().optional(),
  coachingMode: z.string().optional().default("weight-loss"),
  aiProvider: z.enum(["openai", "google"]).optional().default("openai"),
  aiModel: z.string().optional().default("gpt-4o"),
  attachments: z.array(attachmentSchema).optional(),
  automaticModelSelection: z.boolean().optional().default(false),
  streaming: z.boolean().optional().default(false)
});