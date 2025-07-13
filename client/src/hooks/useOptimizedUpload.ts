import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { compressFile, shouldCompressFile, CompressionResult } from '@/services/file-compression';
import { UploadProgress, ProgressTracker } from '@/shared';

export interface OptimizedUploadOptions {
  enableCompression?: boolean;
  compressionThreshold?: number; // File size in bytes
  onProgress?: (progress: UploadProgress) => void;
  onCompressionStart?: () => void;
  onCompressionComplete?: (result: CompressionResult) => void;
}

export interface OptimizedUploadResult {
  success: boolean;
  file?: {
    id: string;
    fileName: string;
    displayName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    url: string;
    category?: string;
  };
  compressionResult?: CompressionResult;
  error?: string;
}

export interface UseOptimizedUploadReturn {
  uploadFile: (file: File, categoryId?: string, options?: OptimizedUploadOptions) => Promise<OptimizedUploadResult>;
  isUploading: boolean;
  isCompressing: boolean;
  error: string | null;
  progress: UploadProgress | null;
}

export function useOptimizedUpload(): UseOptimizedUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const queryClient = useQueryClient();

  const uploadFile = useCallback(async (
    file: File,
    categoryId?: string,
    options: OptimizedUploadOptions = {}
  ): Promise<OptimizedUploadResult> => {
    const {
      enableCompression = true,
      compressionThreshold = 10 * 1024 * 1024, // 10MB default threshold
      onProgress,
      onCompressionStart,
      onCompressionComplete
    } = options;

    setIsUploading(true);
    setIsCompressing(false);
    setError(null);
    setProgress(null);

    let fileToUpload = file;
    let compressionResult: CompressionResult | undefined;

    try {
      // Phase 1: Compression (if enabled and file is large enough)
      if (enableCompression && 
          file.size > compressionThreshold && 
          shouldCompressFile(file)) {
        
        setIsCompressing(true);
        onCompressionStart?.();
        
        // Update progress for compression phase
        const compressionProgress: UploadProgress = {
          loaded: 0,
          total: file.size,
          percentage: 0,
          speed: 0,
          eta: 0,
          stage: 'compressing'
        };
        setProgress(compressionProgress);
        onProgress?.(compressionProgress);

        try {
          compressionResult = await compressFile(file);
          fileToUpload = compressionResult.compressedFile;
          
          onCompressionComplete?.(compressionResult);
          setIsCompressing(false);
          
          // Update progress after compression
          const postCompressionProgress: UploadProgress = {
            loaded: file.size,
            total: file.size,
            percentage: 100,
            speed: 0,
            eta: 0,
            stage: 'uploading'
          };
          setProgress(postCompressionProgress);
          onProgress?.(postCompressionProgress);
          
        } catch (compressionError) {
          console.warn('Compression failed, falling back to original file:', compressionError);
          setIsCompressing(false);
          // Continue with original file if compression fails
        }
      }

      // Phase 2: Upload with progress tracking
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      if (categoryId) {
        formData.append('categoryId', categoryId);
      }

      // Add compression metadata if file was compressed
      if (compressionResult) {
        formData.append('compressed', 'true');
        formData.append('originalFileName', file.name);
        formData.append('originalSize', file.size.toString());
      }

      // Create progress tracker
      const progressTracker = new ProgressTracker((uploadProgress) => {
        setProgress(uploadProgress);
        onProgress?.(uploadProgress);
      });

      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          progressTracker.updateProgress(event.loaded, event.total, 'uploading');
        }
      });

      // Upload promise
      const uploadPromise = new Promise<OptimizedUploadResult>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                file: result.file,
                compressionResult
              });
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || `Upload failed with status ${xhr.status}`));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload timeout'));
        };

        xhr.open('POST', '/api/upload');
        xhr.timeout = 5 * 60 * 1000; // 5 minute timeout
        xhr.send(formData);
      });

      const result = await uploadPromise;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });

      // Final progress update
      const finalProgress: UploadProgress = {
        loaded: fileToUpload.size,
        total: fileToUpload.size,
        percentage: 100,
        speed: 0,
        eta: 0,
        stage: 'complete'
      };
      setProgress(finalProgress);
      onProgress?.(finalProgress);

      setIsUploading(false);
      return result;

    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Upload failed';
      setError(errorMessage);
      setIsUploading(false);
      setIsCompressing(false);
      
      return {
        success: false,
        error: errorMessage,
        compressionResult
      };
    }
  }, [queryClient]);

  return {
    uploadFile,
    isUploading,
    isCompressing,
    error,
    progress
  };
}