import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// TODO: RN-Adapt - UniversalFileService needs to be adapted or replaced for React Native.
// Its current implementation might use web-specific APIs (like Web Workers for compression).
import { UniversalFileService } from '../services/universal-file-service';
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { postFormDataToApi } from '../services/apiClient'; // Import specific function for FormData

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
    category?: string;
  };
}

interface UseFileUploadReturn {
  // TODO: RN-Adapt - `file: File` parameter will change to whatever RN file pickers provide.
  uploadFile: (file: any, categoryId?: string) => Promise<UploadResponse | null>;
  isUploading: boolean;
  error: string | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // TODO: RN-Adapt - UniversalFileService.initialize() may need changes for RN.
    UniversalFileService.initialize().catch(err => {
      console.warn('Universal File Service initialization failed (RN context):', err);
    });
  }, []);

  // TODO: RN-Adapt - The `file: File` parameter type needs to change.
  // It will be an object from a React Native file/image picker.
  const uploadFile = async (file: any, categoryId?: string): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // TODO: RN-Adapt - Go acceleration service logic might not be directly portable.
      // This section needs review for RN capabilities.
      const fileSizeInMB = file.size / (1024 * 1024);
      const fileName = file.name.toLowerCase();
      const isLargeDataFile = fileSizeInMB > 5 && (
        fileName.endsWith('.xml') ||
        fileName.endsWith('.json') ||
        fileName.endsWith('.csv')
      );

      if (isLargeDataFile) {
        console.log(`Large data file detected (${fileSizeInMB.toFixed(1)}MB): ${file.name}`);
        console.log('Attempting to start Go acceleration service (RN context)...');

        try {
          await UniversalFileService.startGoAccelerationService();
          console.log('Go acceleration service started successfully (RN context)');
        } catch (goError) {
          const errorMessage = goError instanceof Error ? goError.message : 'Unknown error';
          console.log('Go service auto-start failed (RN context), continuing:', errorMessage);
        }
      }

      console.log(`Starting upload for ${file.name} (${file.size} bytes)`);

      let fileToUpload = file; // This will be the picker object, not a web File

      // TODO: RN-Adapt - Compression logic using UniversalFileService needs RN adaptation.
      // The service might use different underlying mechanisms for compression in RN.
      try {
        const compressionResult = await UniversalFileService.compressFile(file); // `file` is picker object
        fileToUpload = compressionResult.compressedFile; // This would be a new picker-like object or URI

        console.log(`Compression completed for ${file.name}:`, {
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
          ratio: compressionResult.compressionRatio,
          algorithm: compressionResult.algorithm
        });
      } catch (compressionError) {
        console.warn(`Compression failed for ${file.name}, uploading original (RN context):`, compressionError);
      }

      // TODO: RN-Adapt - FormData creation from RN file picker object.
      const formData = new FormData();
      // Example: formData.append('file', { uri: fileToUpload.uri, name: fileToUpload.name, type: fileToUpload.type });
      // The exact structure depends on the picker and how RN fetch handles it.
      formData.append('file', fileToUpload, fileToUpload.name); // This is a common pattern but needs verification

      if (categoryId) {
        formData.append('categoryId', categoryId);
      }

      // TODO: RN-Adapt - Consider using apiClient.ts postToApi if it handles FormData for RN
      const response = await fetch(`${API_CONFIG.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
        // headers: { 'Content-Type': 'multipart/form-data' }, // May be needed in RN
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed with status: ' + response.status }));
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }

      const result: UploadResponse = await response.json();

      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] }); // Redundant? Check keys.

      setIsUploading(false);
      return result;
    } catch (e: any) {
      console.error('Upload error (RN context):', e);
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
