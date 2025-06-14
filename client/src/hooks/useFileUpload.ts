import { useState, useEffect } from 'react';
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

  // Initialize Universal File Service on first use
  useEffect(() => {
    UniversalFileService.initialize().catch(err => {
      console.warn('Universal File Service initialization failed:', err);
    });
  }, []);

  const uploadFile = async (file: File, categoryId?: string): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // Compress using universal service (with Go acceleration where beneficial)
      console.log(`Starting upload for ${file.name} (${file.size} bytes)`);
      
      let fileToUpload = file;
      
      // Apply compression for suitable files
      try {
        const compressionResult = await UniversalFileService.compressFile(file);
        fileToUpload = compressionResult.compressedFile;
        
        console.log(`Compression completed for ${file.name}:`, {
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          ratio: compressionResult.compressionRatio,
          algorithm: compressionResult.algorithm
        });
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
