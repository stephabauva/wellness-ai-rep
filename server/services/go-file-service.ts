import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import path from 'path';
import fs from 'fs';

interface FileProcessingResult {
  original: FileMetadata;
  thumbnails: Thumbnail[];
  processingTime: number;
  success: boolean;
  error?: string;
}

interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  md5Hash: string;
  width?: number;
  height?: number;
  colorProfile?: string;
  exifData?: Record<string, string>;
  duration?: number;
  perceptualHash?: string;
  processedAt: Date;
}

interface Thumbnail {
  size: string;
  width: number;
  height: number;
  filePath: string;
  fileSize: number;
}

interface BatchProcessingResult {
  results: FileProcessingResult[];
  totalFiles: number;
  processingTime: number;
}

class GoFileProcessingService {
  private goProcess: ChildProcess | null = null;
  private serviceUrl: string;
  private isStarting = false;
  private startPromise: Promise<void> | null = null;

  constructor() {
    this.serviceUrl = `http://localhost:${process.env.GO_SERVICE_PORT || 8080}`;
  }

  /**
   * Start the Go file processing service
   */
  async startService(): Promise<void> {
    if (this.goProcess || this.isStarting) {
      if (this.startPromise) {
        await this.startPromise;
      }
      return;
    }

    this.isStarting = true;
    this.startPromise = this._startServiceInternal();
    await this.startPromise;
    this.isStarting = false;
  }

  private async _startServiceInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const goServicePath = path.join(process.cwd(), 'go-file-service');
      
      console.log('[GoFileService] Starting Go microservice...');
      
      // Build the Go service first
      const buildProcess = spawn('go', ['build', '-o', 'file-processor', '.'], {
        cwd: goServicePath,
        stdio: 'pipe'
      });

      buildProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('[GoFileService] Failed to build Go service');
          reject(new Error('Failed to build Go service'));
          return;
        }

        // Start the built service
        this.goProcess = spawn('./file-processor', [], {
          cwd: goServicePath,
          stdio: 'pipe',
          env: {
            ...process.env,
            PORT: process.env.GO_SERVICE_PORT || '8080',
            GIN_MODE: 'release'
          }
        });

        this.goProcess.stdout?.on('data', (data) => {
          console.log(`[GoFileService] ${data.toString().trim()}`);
        });

        this.goProcess.stderr?.on('data', (data) => {
          console.error(`[GoFileService] Error: ${data.toString().trim()}`);
        });

        this.goProcess.on('close', (code) => {
          console.log(`[GoFileService] Process exited with code ${code}`);
          this.goProcess = null;
        });

        // Wait for service to be ready
        this.waitForServiceReady()
          .then(() => {
            console.log('[GoFileService] Service is ready');
            resolve();
          })
          .catch(reject);
      });
    });
  }

  private async waitForServiceReady(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.serviceUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000)
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Go file service failed to start within timeout');
  }

  /**
   * Process a single file with ultra-fast Go service
   */
  async processFile(
    fileName: string, 
    fileBuffer: Buffer, 
    generateThumbnails = true
  ): Promise<FileProcessingResult> {
    await this.startService();

    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);

    const url = `${this.serviceUrl}/process?generateThumbnails=${generateThumbnails}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as FileProcessingResult;
      
      console.log(`[GoFileService] Processed ${fileName} in ${result.processingTime}ms`);
      return result;
    } catch (error) {
      console.error(`[GoFileService] Failed to process file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple files concurrently using Go service
   */
  async processBatch(files: Array<{ name: string; buffer: Buffer }>): Promise<BatchProcessingResult> {
    await this.startService();

    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file.buffer, file.name);
    });

    try {
      const response = await fetch(`${this.serviceUrl}/process-batch`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120000) // 2 minute timeout for batch processing
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as BatchProcessingResult;
      
      console.log(`[GoFileService] Batch processed ${result.totalFiles} files in ${result.processingTime}ms`);
      return result;
    } catch (error) {
      console.error('[GoFileService] Failed to process batch:', error);
      throw error;
    }
  }

  /**
   * Optimize image with specific format and quality using Go service
   */
  async optimizeImage(
    fileBuffer: Buffer, 
    format: 'webp' | 'jpeg' | 'png' = 'webp', 
    quality = 85
  ): Promise<Buffer> {
    await this.startService();

    const formData = new FormData();
    formData.append('file', fileBuffer, 'image');

    const url = `${this.serviceUrl}/optimize?format=${format}&quality=${quality}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const optimizedBuffer = await response.buffer();
      
      console.log(`[GoFileService] Optimized image to ${format} with ${quality}% quality`);
      return optimizedBuffer;
    } catch (error) {
      console.error('[GoFileService] Failed to optimize image:', error);
      throw error;
    }
  }

  /**
   * Extract metadata only (fast operation)
   */
  async extractMetadata(fileName: string, fileBuffer: Buffer): Promise<FileMetadata> {
    await this.startService();

    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);

    try {
      const response = await fetch(`${this.serviceUrl}/metadata`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json() as FileMetadata;
      
      console.log(`[GoFileService] Extracted metadata for ${fileName}`);
      return metadata;
    } catch (error) {
      console.error(`[GoFileService] Failed to extract metadata for ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Check if the Go service is healthy
   */
  async healthCheck(): Promise<{ status: string; workers: number; maxWorkers: number }> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as { status: string; workers: number; maxWorkers: number };
    } catch (error) {
      console.error('[GoFileService] Health check failed:', error);
      throw error;
    }
  }

  /**
   * Stop the Go service
   */
  stopService(): void {
    if (this.goProcess) {
      console.log('[GoFileService] Stopping Go service...');
      this.goProcess.kill('SIGTERM');
      this.goProcess = null;
    }
  }

  /**
   * Get service performance statistics
   */
  async getStats(): Promise<any> {
    try {
      const health = await this.healthCheck();
      return {
        isRunning: !!this.goProcess,
        serviceUrl: this.serviceUrl,
        ...health
      };
    } catch (e: unknown) {
      return {
        isRunning: false,
        serviceUrl: this.serviceUrl,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }
}

// Singleton instance
export const goFileService = new GoFileProcessingService();

// Graceful shutdown
process.on('SIGTERM', () => {
  goFileService.stopService();
});

process.on('SIGINT', () => {
  goFileService.stopService();
  process.exit(0);
});