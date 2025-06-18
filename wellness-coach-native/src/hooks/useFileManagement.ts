import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast'; // Adjusted path
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { postFormDataToApi } from '../services/apiClient'; // Import specific function for FormData

// TODO: RN-Adapt - Define AttachedFile for React Native.
// It might involve URIs from file pickers instead of web File objects.
// The 'url' might be a local URI initially.
export type AttachedFile = {
  id: string; // Could be local URI or server ID after upload
  fileName: string;
  displayName?: string;
  fileType: string;
  fileSize: number;
  uri?: string; // React Native often uses 'uri' for local file paths
  url?: string; // Server URL after upload
  retentionInfo?: {
    category: 'high' | 'medium' | 'low';
    retentionDays: number;
    reason: string;
  };
  // Add any other RN specific properties, e.g. base64 content if needed
};

export const useFileManagement = () => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    // TODO: RN-Adapt - The 'file' parameter type will change.
    // It won't be a web `File` object. It will be an object from a file/image picker.
    // e.g., { uri: string, name: string, type: string, size?: number }
    mutationFn: (file: any) => { // Changed 'File' to 'any' for RN picker object
      const formData = new FormData();
      // TODO: RN-Adapt - Ensure `file` object from picker is correctly appended.
      // Common RN pattern: formData.append('file', { uri: file.uri, name: file.name, type: file.type });
      // For this generic hook, we assume `file` can be appended directly or is pre-formatted by caller.
      // If `file` is a simple {uri, name, type} object, direct append might not work.
      // The `postFormDataToApi` might need to handle this transformation or expect a pre-built FormData.
      // For now, assuming `file` itself is what needs to be sent in a way that `postFormDataToApi` can handle.
      // A more robust way: expect `file` to be an object {uri, name, type} and build FormData here.
      // Let's assume for now that `file` is a File-like object that can be appended.
      // If it's an object like { uri, name, type }, the `postFormDataToApi` or this part needs adjustment.
      // Simplest assumption for now: file is directly appendable.
      formData.append("file", file, file.name); // Added file.name as third arg for RN
      return postFormDataToApi('upload', formData);
    },
    onSuccess: (data, file: any) => { // TODO: RN-Adapt - 'file' param type needs to match the input to mutationFn
      const attachedFile: AttachedFile = {
        id: data.file.id, // Server ID
        fileName: data.file.fileName, // Server filename
        displayName: data.file.displayName || data.file.originalName || file.name, // Use local name if server doesn't provide original
        fileType: file.type, // Local file type
        fileSize: file.size, // Local file size
        uri: file.uri, // Keep local URI if available
        url: data.file.url, // Server URL
        retentionInfo: data.file.retentionInfo,
      };
      setAttachedFiles((prev) => [...prev, attachedFile]);

      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] }); // Redundant? Check query keys

      const retentionMessage = data.file.retentionInfo?.retentionDays === -1
        ? "This file will be kept permanently as it appears to be medical data."
        : `This file will be kept for ${data.file.retentionInfo?.retentionDays} days.`;

      toast({
        title: "File uploaded",
        description: `${file.name || data.file.originalName} has been uploaded. ${retentionMessage}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeAttachedFile = (fileIdOrUri: string) => { // ID could be local URI or server ID
    setAttachedFiles((prev) => prev.filter((file) => (file.id !== fileIdOrUri && file.uri !== fileIdOrUri)));
  };

  const clearAttachedFiles = () => {
    setAttachedFiles([]);
  };

  // TODO: RN-Adapt - `files` parameter will not be FileList.
  // It will be an array of assets from a document/image picker.
  // e.g. results from expo-document-picker or expo-image-picker
  const handleFileChange = (files: any[] | null) => { // `FileList` is web-specific
    if (files) {
      Array.from(files).forEach(file => { // `file` here is an asset object
        // uploadFileMutation.mutate(file); // Need to ensure `file` is correctly structured for `mutationFn`
        console.warn("[useFileManagement] handleFileChange needs to adapt 'file' object for uploadFileMutation", file);
        // Example adaptation:
        // const rnFile = {
        //   uri: file.uri,
        //   name: file.name || file.fileName,
        //   type: file.mimeType || file.type,
        //   size: file.size
        // };
        // uploadFileMutation.mutate(rnFile as any); // Cast as any temporarily
      });
    }
  };

  return {
    attachedFiles,
    setAttachedFiles,
    uploadFileMutation, // Expose mutation itself
    removeAttachedFile,
    clearAttachedFiles,
    handleFileChange, // Needs RN adaptation for its parameter
  };
};

export default useFileManagement;
