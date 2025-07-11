/**
 * File Acceleration Service
 * 
 * Provides Go-based acceleration for large file compression while maintaining
 * complete backward compatibility with existing TypeScript implementation.
 * 
 * Features:
 * - Zero-risk progressive enhancement
 * - Automatic fallback to TypeScript for unsupported files
 * - Health checking and availability detection
 * - Compatible interface with existing FileCompressionService
 */

export interface CompressionResult {
  compressedFile: File;
  compressionRatio: number;
  originalSize: number;
  compressedSize: number;
  processingTime?: number;
  algorithm?: string;
  compressionLevel?: number;
  throughput?: number; // MB/s
}

export interface AccelerationCapabilities {
  isAvailable: boolean;
  lastHealthCheck: number;
  version?: string;
  supportedFormats: string[];
  minimumFileSize: number;
}

export class FileAccelerationService {
  private static readonly GO_SERVICE_URL = '/api/accelerate';
  private static capabilities: AccelerationCapabilities = {
    isAvailable: false,
    lastHealthCheck: 0,
    supportedFormats: ['.xml', '.json', '.csv'],
    minimumFileSize: 5 * 1024 * 1024, // 5MB - Enhanced threshold for better acceleration
  };
  
  private static readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize the acceleration service with health checking
   */
  static async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performHealthCheck();
    return this.initPromise;
  }

  /**
   * Perform health check against Go acceleration service
   */
  private static async performHealthCheck(): Promise<void> {
    try {
      const response = await fetch(`${this.GO_SERVICE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(1000), // 1 second timeout - reduce server load
      });

      if (response.ok) {
        const healthData = await response.json();
        this.capabilities = {
          ...this.capabilities,
          isAvailable: true,
          lastHealthCheck: Date.now(),
          version: healthData.version,
        };
        console.log('Go acceleration service available:', healthData);
      } else {
        this.capabilities.isAvailable = false;
        // Don't log warnings for expected 503 responses
        if (response.status !== 503) {
          console.warn('Go acceleration service health check failed:', response.status);
        }
      }
    } catch (error) {
      this.capabilities.isAvailable = false;
      this.capabilities.lastHealthCheck = Date.now();
      // Only log in debug mode - this is expected when Go service isn't running
      if (process.env.NODE_ENV === 'development') {
        console.debug('Go acceleration service not available, using TypeScript fallback');
      }
    }
  }

  /**
   * Check if health check needs to be refreshed
   */
  private static shouldRefreshHealthCheck(): boolean {
    const now = Date.now();
    return (now - this.capabilities.lastHealthCheck) > this.HEALTH_CHECK_INTERVAL;
  }

  /**
   * Get current acceleration capabilities
   */
  static getCapabilities(): AccelerationCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Determine if a file should be accelerated using Go service
   */
  static shouldAccelerate(file: File): boolean {
    // Refresh health check if needed
    if (this.shouldRefreshHealthCheck()) {
      this.performHealthCheck();
    }

    if (!this.capabilities.isAvailable) {
      return false;
    }

    // Check file size threshold
    if (file.size < this.capabilities.minimumFileSize) {
      return false;
    }

    // Check file format
    const filename = file.name.toLowerCase();
    const supportedFormat = this.capabilities.supportedFormats.some(format => 
      filename.endsWith(format)
    );

    return supportedFormat;
  }

  /**
   * Accelerate file compression using Go service (integrated with upload endpoint)
   */
  static async accelerateCompression(file: File): Promise<CompressionResult> {
    if (!this.shouldAccelerate(file)) {
      throw new Error('File not suitable for Go acceleration');
    }

    const startTime = Date.now();
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use the regular upload endpoint which handles Go acceleration internally
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(120000), // 2 minute timeout for large files
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Go acceleration failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      // Extract compression stats from upload result
      const compressionStats = result.compressionStats;
      if (!compressionStats) {
        throw new Error('Go acceleration was not used for this file');
      }

      // Return file directly since it's already saved by the upload endpoint
      const processingTime = Date.now() - startTime;

      return {
        compressedFile: file, // File is already processed and saved
        compressionRatio: compressionStats.ratio,
        originalSize: compressionStats.originalSize,
        compressedSize: compressionStats.compressedSize,
        processingTime: compressionStats.time || processingTime,
        algorithm: 'gzip-optimized',
        compressionLevel: 9,
        throughput: compressionStats.originalSize / (compressionStats.time || processingTime),
      };

    } catch (error) {
      console.error('Go acceleration failed:', error);
      throw error;
    }
  }

  /**
   * Batch process multiple files using Go service
   */
  static async accelerateBatch(files: File[]): Promise<CompressionResult[]> {
    if (!this.capabilities.isAvailable) {
      throw new Error('Go acceleration service not available');
    }

    const suitableFiles = files.filter(file => this.shouldAccelerate(file));
    
    if (suitableFiles.length === 0) {
      throw new Error('No files suitable for batch acceleration');
    }

    const formData = new FormData();
    suitableFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`${this.GO_SERVICE_URL}/batch-process`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(300000), // 5 minute timeout for batch
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Batch acceleration failed: ${errorData.error || response.statusText}`);
      }

      const batchResult = await response.json();
      
      return batchResult.results.map((result: any, index: number) => {
        if (result.error) {
          throw new Error(`File ${result.filename}: ${result.error}`);
        }

        const originalFile = suitableFiles[result.index];
        const compressedBlob = new Blob([new Uint8Array(result.compressedData)], {
          type: originalFile.type || 'application/octet-stream',
        });
        
        const compressedFile = new File([compressedBlob], originalFile.name, {
          type: originalFile.type,
          lastModified: originalFile.lastModified,
        });

        return {
          compressedFile,
          compressionRatio: result.compressionRatio,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          algorithm: result.algorithm || 'gzip-go',
        };
      });

    } catch (error) {
      console.error('Batch acceleration failed:', error);
      throw error;
    }
  }

  /**
   * Test acceleration service with a small sample
   */
  static async testAcceleration(): Promise<boolean> {
    try {
      // Create a test file that meets minimum requirements
      const testContent = 'x'.repeat(11 * 1024 * 1024); // 11MB test file
      const testFile = new File([testContent], 'test.xml', { type: 'application/xml' });
      
      await this.accelerateCompression(testFile);
      return true;
    } catch (error) {
      console.warn('Acceleration test failed:', error);
      return false;
    }
  }
}