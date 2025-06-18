import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// TODO: RN-Adapt - FileCompressionService needs RN adaptation or replacement.
// Web Worker based compression won't work directly. Consider expo-image-manipulator for images,
// or other libraries for general file compression if needed.
import { FileCompressionService, CompressionResult } from '../services/file-compression';
import { UploadProgress, ProgressTracker } from '../utils/upload-progress'; // Adjusted path
import { API_CONFIG } from '../config/api'; // TODO: RN-Adapt - Ensure this path is correct

export interface OptimizedUploadOptions {
  enableCompression?: boolean;
  compressionThreshold?: number; // File size in bytes
  onProgress?: (progress: UploadProgress) => void;
  onCompressionStart?: () => void;
  onCompressionComplete?: (result: CompressionResult) => void;
}

export interface OptimizedUploadResult {
  success: boolean;
  file?: { // This structure should match your backend's response for a file object
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
  // TODO: RN-Adapt - `file: File` parameter will change to RN file picker object.
  uploadFile: (file: any, categoryId?: string, options?: OptimizedUploadOptions) => Promise<OptimizedUploadResult>;
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
    // TODO: RN-Adapt - `file: File` parameter will be RN file picker object.
    // e.g., { uri: string, name: string, type: string, size?: number }
    file: any,
    categoryId?: string,
    options: OptimizedUploadOptions = {}
  ): Promise<OptimizedUploadResult> => {
    const {
      enableCompression = true, // Consider if compression is feasible/needed in RN for your use cases
      compressionThreshold = 10 * 1024 * 1024, // 10MB default
      onProgress,
      onCompressionStart,
      onCompressionComplete
    } = options;

    setIsUploading(true);
    setIsCompressing(false);
    setError(null);
    setProgress(null);

    let fileToUpload = file; // This will be the picker object
    let compressionResult: CompressionResult | undefined;

    try {
      // Phase 1: Compression
      // TODO: RN-Adapt - Review compression logic. FileCompressionService needs RN implementation.
      if (enableCompression &&
          file.size > compressionThreshold &&
          FileCompressionService.shouldCompressFile(file)) { // `file.size` needs to exist on picker object

        setIsCompressing(true);
        onCompressionStart?.();

        const compressionProgress: UploadProgress = { loaded: 0, total: file.size, percentage: 0, speed: 0, eta: 0, stage: 'compressing' };
        setProgress(compressionProgress);
        onProgress?.(compressionProgress);

        try {
          // This call will change based on RN FileCompressionService
          compressionResult = await FileCompressionService.compressFile(file);
          fileToUpload = compressionResult.compressedFile; // This would be a new {uri, name, type} object

          onCompressionComplete?.(compressionResult);
          setIsCompressing(false);

          const postCompressionProgress: UploadProgress = { loaded: file.size, total: file.size, percentage: 100, speed: 0, eta: 0, stage: 'uploading' };
          setProgress(postCompressionProgress);
          onProgress?.(postCompressionProgress);

        } catch (compError) {
          console.warn('Compression failed (RN context), falling back to original file:', compError);
          setIsCompressing(false);
        }
      }

      // Phase 2: Upload
      // TODO: RN-Adapt - Replace XMLHttpRequest with React Native fetch or a robust upload library.
      // FormData creation will also need adaptation for RN file objects.
      const formData = new FormData();
      // Example for RN:
      // formData.append('file', {
      //   uri: fileToUpload.uri,
      //   name: fileToUpload.name,
      //   type: fileToUpload.type, // e.g., 'image/jpeg'
      // });
      formData.append('file', fileToUpload, fileToUpload.name); // Verify this structure for RN fetch

      if (categoryId) {
        formData.append('categoryId', categoryId);
      }
      if (compressionResult) {
        formData.append('compressed', 'true');
        formData.append('originalFileName', file.name); // Original file name from picker
        formData.append('originalSize', file.size.toString()); // Original file size
      }

      // Using fetch for upload in RN:
      // Note: Progress tracking with RN fetch for uploads is not straightforward.
      // You might need a library like react-native-blob-util for advanced upload features.
      // This is a simplified version without granular progress for the fetch part.
      const response = await fetch(`${API_CONFIG.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          // 'Content-Type': 'multipart/form-data', // Usually set automatically by fetch for FormData
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Upload failed with status ${response.status}` }));
        throw new Error(errorData.message);
      }

      const resultJson = await response.json();
      const uploadResult: OptimizedUploadResult = {
        success: true,
        file: resultJson.file,
        compressionResult
      };

      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] }); // Redundant?

      const finalProgress: UploadProgress = { loaded: fileToUpload.size || 0, total: fileToUpload.size || 0, percentage: 100, speed: 0, eta: 0, stage: 'complete' };
      setProgress(finalProgress);
      onProgress?.(finalProgress);

      setIsUploading(false);
      return uploadResult;

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
