import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { FileItem } from '@/types/fileManager';
import { formatFileSize } from '@/utils/fileManagerUtils'; // For toast message

export function useFileApi() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: files = [],
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
    error: filesError,
  } = useQuery<FileItem[]>({
    queryKey: ['files', '/api/files'], // Consistent queryKey
    queryFn: async () => {
      const response = await fetch('/api/files');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch files' }));
        throw new Error(errorData.message || 'Failed to fetch files');
      }
      return response.json();
    },
  });

  const deleteFilesMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete files' }));
        throw new Error(errorData.message || 'Failed to delete files');
      }
      return response.json(); // Assuming the backend returns details like deletedCount, freedSpace
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });

      const { deletedCount = 0, actuallyDeleted = 0, notFound = 0, freedSpace = 0 } = data || {};
      let description = `Successfully processed ${deletedCount} file(s).`;

      if (actuallyDeleted > 0) {
        description += ` Deleted ${actuallyDeleted} and freed ${formatFileSize(freedSpace)}.`;
      }
      if (notFound > 0) {
        description += ` ${notFound} file(s) were already removed or not found.`;
      }

      toast({
        title: "Files Processed",
        description: description.trim(),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Could not delete selected files. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    files,
    isLoadingFiles,
    filesError,
    refetchFiles,
    deleteFiles: deleteFilesMutation.mutate,
    deleteFilesAsync: deleteFilesMutation.mutateAsync, // Expose async version if needed
    isDeletingFiles: deleteFilesMutation.isPending,
  };
}
