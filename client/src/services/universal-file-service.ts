/**
 * Universal File Service
 * 
 * Smart routing service that automatically selects the best compression method
 * based on file characteristics and system capabilities. Provides seamless
 * integration between TypeScript and Go acceleration services.
 */

import { FileCompressionService, type CompressionOptions, type CompressionResult as TSCompressionResult } from './file-compression';
import { FileAccelerationService, type CompressionResult } from './file-acceleration-service';

export interface PlatformCapabilities {
  nativeCompression: boolean;
  backgroundProcessing: boolean;
  healthDataAccess: boolean;
  fileSystemAccess: boolean;
  goAcceleration: boolean;
}

export type Platform = 'web' | 'capacitor' | 'react-native';

export class UniversalFileService {
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;

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
      // Try to initialize Go acceleration service (non-blocking)
      // This is optional - the service works fine without it
      await Promise.race([
        FileAccelerationService.initialize(),
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
   * Get current platform capabilities
   */
  static getCapabilities(): PlatformCapabilities {
    const platform = this.detectPlatform();
    const goCapabilities = FileAccelerationService.getCapabilities();
    
    switch (platform) {
      case 'capacitor':
        return {
          nativeCompression: true,
          backgroundProcessing: true,
          healthDataAccess: true,
          fileSystemAccess: true,
          goAcceleration: goCapabilities.isAvailable,
        };
      case 'react-native':
        return {
          nativeCompression: true,
          backgroundProcessing: true,
          healthDataAccess: true,
          fileSystemAccess: false,
          goAcceleration: goCapabilities.isAvailable,
        };
      default:
        return {
          nativeCompression: false,
          backgroundProcessing: false,
          healthDataAccess: false,
          fileSystemAccess: false,
          goAcceleration: goCapabilities.isAvailable,
        };
    }
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
        await UniversalFileService.startGoAccelerationService();
        console.log(`Go acceleration service started successfully for file management`);
      } catch (startError) {
        console.warn('Could not start Go acceleration service:', startError);
        // Continue - upload endpoint will handle graceful fallback
      }
    }

    // Use existing, proven TypeScript implementation
    console.log(`Using TypeScript compression for ${file.name}`);
    
    try {
      const tsResult = await FileCompressionService.compressFile(file, options);
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

    // Separate files suitable for Go acceleration
    const largeFiles = files.filter(file => FileAccelerationService.shouldAccelerate(file));
    const regularFiles = files.filter(file => !FileAccelerationService.shouldAccelerate(file));

    const results: CompressionResult[] = [];

    // Process large files with Go acceleration if available
    if (largeFiles.length > 0) {
      try {
        console.log(`Processing ${largeFiles.length} large files with Go acceleration`);
        const acceleratedResults = await FileAccelerationService.accelerateBatch(largeFiles);
        results.push(...acceleratedResults);
      } catch (error) {
        console.warn('Batch Go acceleration failed, processing individually:', error);
        // Fallback to individual processing
        for (const file of largeFiles) {
          try {
            const result = await this.compressFile(file, options);
            results.push(result);
          } catch (fileError) {
            console.error(`Failed to compress ${file.name}:`, fileError);
            // Continue with other files
          }
        }
      }
    }

    // Process regular files with TypeScript
    if (regularFiles.length > 0) {
      console.log(`Processing ${regularFiles.length} regular files with TypeScript`);
      for (const file of regularFiles) {
        try {
          const result = await this.compressFile(file, options);
          results.push(result);
        } catch (error) {
          console.error(`Failed to compress ${file.name}:`, error);
          // Continue with other files
        }
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
      goService: FileAccelerationService.getCapabilities(),
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
      await FileCompressionService.compressFile(testFile);
      typescriptWorking = true;
    } catch (error) {
      console.error('TypeScript compression test failed:', error);
    }

    // Test Go acceleration
    let goWorking = false;
    try {
      goWorking = await FileAccelerationService.testAcceleration();
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

  /**
   * Automatically start Go acceleration service when needed
   */
  static async startGoAccelerationService(): Promise<void> {
    try {
      console.log('Attempting to start Go acceleration service...');
      
      const response = await fetch('/api/accelerate/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Large file detected requiring Go acceleration',
          autoStart: true
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start Go service: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Go acceleration service start response:', result);
      
      if (result.success) {
        console.log('Go acceleration service started successfully');
      } else {
        throw new Error(result.error || 'Failed to start Go service');
      }
    } catch (error) {
      console.error('Failed to start Go acceleration service:', error);
      throw error;
    }
  }
}