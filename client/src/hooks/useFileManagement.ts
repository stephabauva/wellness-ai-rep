
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

/**
 * @used-by chat/ChatInputArea - For file attachments in chat messages
 * @used-by chat/MessageDisplayArea - For displaying attached files
 * @used-by shared/App - Via ChatSection component
 * @cross-domain true
 * @critical-path true
 * @recommendation Consider creating chat-specific file handling abstraction
 */
export type AttachedFile = {
  id: string;
  fileName: string;
  displayName?: string;
  fileType: string;
  fileSize: number;
  url?: string;
  retentionInfo?: {
    category: 'high' | 'medium' | 'low';
    retentionDays: number;
    reason: string;
  };
};

/**
 * @used-by chat/ChatSection - Main chat interface file management
 * @used-by chat/ChatInputArea - File upload functionality
 * @cross-domain true
 * @critical-path true
 * @impact Changing this hook affects chat file attachments
 */
export const useFileManagement = () => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload file");
      return await response.json();
    },
    onSuccess: (data, file) => {
      console.log('💬 Chat upload result:', {
        originalFileName: file.name,
        uploadedFileName: data.file.fileName,
        uploadedUrl: data.file.url,
        compressionApplied: false // Chat doesn't compress
      });
      
      const attachedFile: AttachedFile = {
        id: data.file.id,
        fileName: data.file.fileName,
        displayName: data.file.displayName || data.file.originalName,
        fileType: file.type,
        fileSize: file.size,
        url: data.file.url,
        retentionInfo: data.file.retentionInfo,
      };
      setAttachedFiles((prev) => [...prev, attachedFile]);
      
      // Invalidate file queries to ensure file management shows updated files
      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      
      const retentionMessage = data.file.retentionInfo?.retentionDays === -1 
        ? "This file will be kept permanently as it appears to be medical data."
        : `This file will be kept for ${data.file.retentionInfo?.retentionDays} days.`;
      
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully. ${retentionMessage}`,
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

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const clearAttachedFiles = () => {
    setAttachedFiles([]);
  };

  const handleFileChange = (files: FileList | null) => {
    if (files) {
      Array.from(files).forEach(file => {
        uploadFileMutation.mutate(file);
      });
    }
  };

  return {
    attachedFiles,
    setAttachedFiles,
    uploadFileMutation,
    removeAttachedFile,
    clearAttachedFiles,
    handleFileChange,
  };
};

// Default export
export default useFileManagement;
