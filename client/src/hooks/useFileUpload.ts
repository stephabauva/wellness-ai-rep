import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UniversalFileService } from '../services/universal-file-service';

interface UploadResponse {
  success: boolean;
  file: {
    id: string;
    fileName: string;
    displayName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    url: string;
    category?: string; // Optional category
    // Add any other fields returned by your API
  };
  // Include other fields if your API returns more data
}

interface UseFileUploadReturn {
  uploadFile: (file: File, categoryId?: string) => Promise<UploadResponse | null>;
  isUploading: boolean;
  error: string | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Remove automatic initialization - services will initialize lazily when needed

  const uploadFile = async (file: File, categoryId?: string): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // Check if this is a large file that should trigger go acceleration service
      const fileSizeInMB = file.size / (1024 * 1024);
      const fileName = file.name.toLowerCase();
      const isLargeDataFile = fileSizeInMB > 5 && (
        fileName.endsWith('.xml') || 
        fileName.endsWith('.json') || 
        fileName.endsWith('.csv')
      );

      if (isLargeDataFile) {
        console.log(`Large data file detected (${fileSizeInMB.toFixed(1)}MB): ${file.name}`);
        console.log('Attempting to start Go acceleration service for file management...');
        
        try {
          // Attempt to start go acceleration service automatically
          await UniversalFileService.startGoAccelerationService();
          console.log('Go acceleration service started successfully for file management');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log('Go service auto-start failed, continuing with TypeScript processing:', errorMessage);
        }
      }

      // Compress using universal service (with Go acceleration where beneficial)
      console.log(`Starting upload for ${file.name} (${file.size} bytes)`);
      
      let fileToUpload = file;
      
      // Apply compression for suitable files only
      try {
        // Check if file should be compressed (skip images and other non-compressible files)
        if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          console.log(`Skipping compression for media file: ${file.name} (${file.type})`);
          fileToUpload = file;
        } else {
          const compressionResult = await UniversalFileService.compressFile(file);
          fileToUpload = compressionResult.compressedFile;
          
          console.log(`Compression completed for ${file.name}:`, {
            originalSize: compressionResult.originalSize,
            compressedSize: compressionResult.compressedSize,
            ratio: compressionResult.compressionRatio,
            algorithm: compressionResult.algorithm
          });
        }
      } catch (compressionError) {
        console.warn(`Compression failed for ${file.name}, uploading original:`, compressionError);
        // Continue with original file if compression fails
      }

      // Upload the (potentially compressed) file
      const formData = new FormData();
      formData.append('file', fileToUpload);

      if (categoryId) {
        formData.append('categoryId', categoryId);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type header manually for FormData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed with status: ' + response.status }));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const result: UploadResponse = await response.json();
      
      console.log('📁 File manager upload result:', {
        originalFileName: file.name,
        uploadedFileName: result.file.fileName,
        uploadedUrl: result.file.url,
        compressionApplied: fileToUpload !== file
      });
      
      // Invalidate file queries to ensure file management shows updated files
      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      
      setIsUploading(false);
      return result;
    } catch (e: any) {
      console.error('Upload error:', e);
      setError(e.message || 'An unknown error occurred during upload.');
      setIsUploading(false);
      return null;
    }
  };

  return {
    uploadFile,
    isUploading,
    error,
  };
}
