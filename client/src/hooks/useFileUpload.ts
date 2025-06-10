import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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

  const uploadFile = async (file: File, categoryId?: string): Promise<UploadResponse | null> => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    if (categoryId) {
      formData.append('categoryId', categoryId);
    }

    try {
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
