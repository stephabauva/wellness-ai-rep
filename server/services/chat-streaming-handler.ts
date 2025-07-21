// Chat Streaming Response Handler
// @used-by server/routes/chat-routes.ts

import { Response } from "express";

/**
 * Sets up SSE (Server-Sent Events) response headers for streaming
 * @param res Express response object
 */
export function setupStreamingHeaders(res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', 
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
}

/**
 * Sends a streaming data chunk to the client
 * @param res Express response object
 * @param type The type of data chunk
 * @param data The data to send
 */
export function sendStreamChunk(res: Response, type: string, data: any) {
  res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  if ((res as any).flush) (res as any).flush();
}

/**
 * Sends typing start indicator
 * @param res Express response object
 */
export function sendTypingStart(res: Response) {
  sendStreamChunk(res, 'typing_start', {});
}

/**
 * Sends typing end indicator
 * @param res Express response object
 */
export function sendTypingEnd(res: Response) {
  sendStreamChunk(res, 'typing_end', {});
}

/**
 * Sends processing status update
 * @param res Express response object
 * @param conversationId The conversation ID
 * @param userMessage The saved user message
 */
export function sendProcessingUpdate(res: Response, conversationId: string, userMessage: any) {
  sendStreamChunk(res, 'processing', { conversationId, userMessage });
}

/**
 * Sends completion data
 * @param res Express response object
 * @param result The completion result
 */
export function sendCompletion(res: Response, result: any) {
  sendStreamChunk(res, 'complete', result);
}

/**
 * Sends done signal with conversation ID
 * @param res Express response object
 * @param conversationId The conversation ID
 */
export function sendDone(res: Response, conversationId: string) {
  sendStreamChunk(res, 'done', { conversationId });
}

/**
 * Sends error message
 * @param res Express response object
 * @param message The error message
 */
export function sendError(res: Response, message: string) {
  sendStreamChunk(res, 'error', { message });
}

/**
 * Sends AI response chunk
 * @param res Express response object
 * @param chunk The content chunk
 */
export function sendChunk(res: Response, chunk: string) {
  sendStreamChunk(res, 'chunk', { content: chunk });
}

/**
 * Sends complete AI response
 * @param res Express response object
 * @param fullResponse The complete response
 */
export function sendCompleteResponse(res: Response, fullResponse: string) {
  sendStreamChunk(res, 'complete', { fullResponse });
}