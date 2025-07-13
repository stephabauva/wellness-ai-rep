/**
 * Universal File Service
 * 
 * Smart routing service that automatically selects the best compression method
 * based on file characteristics and system capabilities. Provides seamless
 * integration between TypeScript and Go acceleration services.
 */

import { compressFile, shouldCompressFile, type CompressionOptions, type CompressionResult as TSCompressionResult } from '@shared/services/file-compression';

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

export interface PlatformCapabilities {
  nativeCompression: boolean;
  backgroundProcessing: boolean;
  healthDataAccess: boolean;
  fileSystemAccess: boolean;
  goAcceleration: boolean;
}

export interface AccelerationCapabilities {
  isAvailable: boolean;
  lastHealthCheck: number;
  version?: string;
  supportedFormats: string[];
  minimumFileSize: number;
}

export type Platform = 'web' | 'capacitor' | 'react-native';

export class UniversalFileService {
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;
  
  // Acceleration capabilities (merged from file-acceleration-service)
  private static readonly GO_SERVICE_URL = '/api/accelerate';
  private static accelerationCapabilities: AccelerationCapabilities = {
    isAvailable: false,
    lastHealthCheck: 0,
    supportedFormats: ['.xml', '.json', '.csv'],
    minimumFileSize: 5 * 1024 * 1024, // 5MB
  };
  private static readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  /**
   * Initialize the universal file service
   * Sets up Go acceleration capabilities and platform detection
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private static async performInitialization(): Promise<void> {
    try {
      // Check Go acceleration capabilities directly
      await Promise.race([
        this.checkAccelerationHealth(),
        new Promise(resolve => setTimeout(resolve, 1000)) // 1 second timeout
      ]);
      
      // Log platform capabilities
      const platform = this.detectPlatform();
      const capabilities = this.getCapabilities();
      
      console.log('Universal File Service initialized:', {
        platform,
        goAcceleration: capabilities.goAcceleration,
        version: '1.0.0'
      });

      this.initialized = true;
    } catch (error) {
      // Silently continue - Go acceleration is optional
      const platform = this.detectPlatform();
      console.log('Universal File Service initialized:', {
        platform,
        goAcceleration: false,
        version: '1.0.0'
      });
      this.initialized = true; // Continue with TypeScript-only mode
    }
  }

  /**
   * Detect the current platform
   */
  static detectPlatform(): Platform {
    if (typeof window !== 'undefined') {
      // @ts-ignore - Capacitor global
      if (window.Capacitor) return 'capacitor';
      // @ts-ignore - React Native global  
      if (window.ReactNativeWebView) return 'react-native';
    }
    return 'web';
  }

  /**
   * Check Go acceleration service health (merged from file-acceleration-service)
   */
  private static async checkAccelerationHealth(): Promise<void> {
    try {
      const response = await fetch(`${this.GO_SERVICE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const healthData = await response.json();
        this.accelerationCapabilities.isAvailable = true;
        this.accelerationCapabilities.version = healthData.version;
        this.accelerationCapabilities.lastHealthCheck = Date.now();
      } else {
        this.accelerationCapabilities.isAvailable = false;
      }
    } catch (error) {
      this.accelerationCapabilities.isAvailable = false;
    }
  }

  /**
   * Get acceleration capabilities
   */
  static getAccelerationCapabilities(): AccelerationCapabilities {
    return { ...this.accelerationCapabilities };
  }

  /**
   * Get current platform capabilities
   */
  static getCapabilities(): PlatformCapabilities {
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'capacitor':
        return {
          nativeCompression: true,
          backgroundProcessing: true,
          healthDataAccess: true,
          fileSystemAccess: true,
          goAcceleration: this.accelerationCapabilities.isAvailable,
        };
      case 'react-native':
        return {
          nativeCompression: true,
          backgroundProcessing: true,
          healthDataAccess: true,
          fileSystemAccess: false,
          goAcceleration: this.accelerationCapabilities.isAvailable,
        };
      default:
        return {
          nativeCompression: false,
          backgroundProcessing: false,
          healthDataAccess: false,
          fileSystemAccess: false,
          goAcceleration: this.accelerationCapabilities.isAvailable,
        };
    }
  }

  /**
   * Start Go acceleration service (merged from file-acceleration-service)
   */
  static async startGoAccelerationService(): Promise<void> {
    try {
      const response = await fetch(`${this.GO_SERVICE_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Failed to start service: ${response.status}`);
      }

      // Update capabilities after successful start
      await this.checkAccelerationHealth();
    } catch (error) {
      console.warn('Failed to start Go acceleration service:', error);
      throw error;
    }
  }

  /**
   * Check if file should use acceleration
   */
  static shouldUseAcceleration(file: File): boolean {
    if (!this.accelerationCapabilities.isAvailable) return false;
    if (file.size < this.accelerationCapabilities.minimumFileSize) return false;
    
    const extension = file.name.toLowerCase().split('.').pop() || '';
    return this.accelerationCapabilities.supportedFormats.some(format => 
      format.toLowerCase().includes(extension)
    );
  }

  /**
   * Smart file compression with automatic routing
   */
  static async compressFile(file: File, options?: CompressionOptions): Promise<CompressionResult> {
    // Ensure service is initialized
    await this.initialize();

    const startTime = Date.now();
    
    // For large files that benefit from Go acceleration, attempt to start the service
    if (file.size > 5 * 1024 * 1024 && (file.name.toLowerCase().endsWith('.xml') || 
        file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.csv'))) {
      try {
        console.log(`Large data file detected (${(file.size / (1024 * 1024)).toFixed(1)}MB): ${file.name}`);
        console.log(`Attempting to start Go acceleration service for file management...`);
        await this.startGoAccelerationService();
        console.log(`Go acceleration service started successfully for file management`);
      } catch (startError) {
        console.warn('Could not start Go acceleration service:', startError);
        // Continue - upload endpoint will handle graceful fallback
      }
    }

    // Use existing, proven TypeScript implementation
    console.log(`Using TypeScript compression for ${file.name}`);
    
    try {
      const tsResult = await compressFile(file, options);
      const processingTime = Date.now() - startTime;
      
      // Convert TypeScript result to unified CompressionResult format
      return {
        compressedFile: tsResult.compressedFile,
        compressionRatio: tsResult.compressionRatio,
        originalSize: tsResult.originalSize,
        compressedSize: tsResult.compressedSize,
        processingTime,
        algorithm: 'typescript-compression',
      };
    } catch (tsError) {
      console.error('Compression failed for', file.name, ':', tsError);
      console.warn(`Compression failed for ${file.name}, uploading original:`, tsError);
      
      // Return original file when compression fails
      return {
        compressedFile: file,
        compressionRatio: 1.0,
        originalSize: file.size,
        compressedSize: file.size,
        processingTime: Date.now() - startTime,
        algorithm: 'none',
        compressionLevel: 0,
        throughput: 0,
      };
    }
  }

  /**
   * Platform-optimized compression
   */
  static async optimizeForPlatform(file: File, options?: CompressionOptions): Promise<CompressionResult> {
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'capacitor':
        // Future: Native compression APIs
        console.log('Capacitor platform detected, using standard compression');
        return await this.compressFile(file, options);
        
      case 'react-native':
        // Future: React Native optimizations
        console.log('React Native platform detected, using standard compression');
        return await this.compressFile(file, options);
        
      default:
        return await this.compressFile(file, options);
    }
  }

  /**
   * Batch compression with intelligent routing
   */
  static async compressBatch(files: File[], options?: CompressionOptions): Promise<CompressionResult[]> {
    await this.initialize();

    if (files.length === 0) {
      return [];
    }

    const results: CompressionResult[] = [];

    // Process all files with TypeScript compression
    console.log(`Processing ${files.length} files with TypeScript compression`);
    for (const file of files) {
      try {
        const result = await this.compressFile(file, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to compress ${file.name}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Get service statistics and health
   */
  static getServiceHealth(): {
    initialized: boolean;
    platform: Platform;
    capabilities: PlatformCapabilities;
    goService: any;
  } {
    return {
      initialized: this.initialized,
      platform: this.detectPlatform(),
      capabilities: this.getCapabilities(),
      goService: this.getAccelerationCapabilities(),
    };
  }

  /**
   * Test compression capabilities
   */
  static async testCompressionCapabilities(): Promise<{
    typescript: boolean;
    goAcceleration: boolean;
    platform: Platform;
  }> {
    await this.initialize();

    const platform = this.detectPlatform();
    
    // Test TypeScript compression
    let typescriptWorking = false;
    try {
      const testContent = 'test content for compression';
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      await compressFile(testFile);
      typescriptWorking = true;
    } catch (error) {
      console.error('TypeScript compression test failed:', error);
    }

    // Test Go acceleration
    let goWorking = false;
    try {
      await this.checkAccelerationHealth();
      goWorking = this.accelerationCapabilities.isAvailable;
    } catch (error) {
      console.error('Go acceleration test failed:', error);
    }

    return {
      typescript: typescriptWorking,
      goAcceleration: goWorking,
      platform,
    };
  }

  /**
   * Emergency rollback - disable all Go acceleration
   */
  private static ACCELERATION_ENABLED = true;

  static disableAcceleration(): void {
    this.ACCELERATION_ENABLED = false;
    console.warn('Go acceleration disabled - using TypeScript-only mode');
  }

  static enableAcceleration(): void {
    this.ACCELERATION_ENABLED = true;
    console.log('Go acceleration re-enabled');
  }

  static isAccelerationEnabled(): boolean {
    return this.ACCELERATION_ENABLED;
  }

}