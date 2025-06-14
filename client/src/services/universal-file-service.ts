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
    
    // Proactively check if we should use Go acceleration for large files
    if (FileAccelerationService.shouldAccelerate(file)) {
      console.log(`Large file detected (${file.size} bytes): ${file.name}`);
      console.log(`Attempting Go acceleration for ${file.name}`);
      
      // Check Go service availability first
      const goCapabilities = FileAccelerationService.getCapabilities();
      
      // If Go service is not available, try to start it proactively
      if (!goCapabilities.isAvailable) {
        try {
          console.log(`Go acceleration service not available, attempting auto-start for ${file.name}`);
          await this.startGoAccelerationService();
          
          // Wait for service to start and refresh capabilities
          await new Promise(resolve => setTimeout(resolve, 3000));
          await FileAccelerationService.initialize(); // Refresh service status
        } catch (startError) {
          console.warn(`Failed to start Go service automatically, using TypeScript fallback:`, startError);
          // Skip Go acceleration and go directly to TypeScript
        }
      }
      
      // Attempt Go acceleration only if service is now available
      const refreshedCapabilities = FileAccelerationService.getCapabilities();
      if (refreshedCapabilities.isAvailable) {
        try {
          const result = await FileAccelerationService.accelerateCompression(file);
          
          console.log(`Go acceleration successful: ${file.name}`, {
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            ratio: result.compressionRatio,
            time: result.processingTime
          });
          
          return result;
        } catch (error) {
          console.warn(`Go acceleration failed for ${file.name}, falling back to TypeScript:`, error);
          // Continue to TypeScript implementation below
        }
      } else {
        console.log(`Go service still unavailable after startup attempt, using TypeScript for ${file.name}`);
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
    } catch (error) {
      console.error('Both Go and TypeScript compression failed:', error);
      throw new Error(`File compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  private static async startGoAccelerationService(): Promise<void> {
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