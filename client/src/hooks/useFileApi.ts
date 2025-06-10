import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
// Assuming FileCategory will be defined in @/types/fileManager alongside FileItem
import { FileItem, FileCategory } from '@/types/fileManager';
import { formatFileSize } from '@/utils/fileManagerUtils'; // For toast message

// Type for category data for create operations (aligns with server DTO from insertFileCategorySchema)
// Requires 'name', other fields from the schema are optional.
type CreatableFileCategory = Required<Pick<FileCategory, 'name'>> & Partial<Pick<FileCategory, 'description' | 'icon' | 'color'>>;

// Type for category data for update operations (all fields optional)
type UpdatableFileCategory = Partial<Pick<FileCategory, 'name' | 'description' | 'icon' | 'color'>>;

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
    onSuccess: (data: any) => { // Added type any for data due to its dynamic structure from backend
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

  });

  // Category Queries & Mutations
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useQuery<FileCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch categories' }));
        throw new Error(errorData.message || 'Failed to fetch categories');
      }
      return response.json();
    },
  });

  const createCategoryMutation = useMutation<FileCategory, Error, CreatableFileCategory>({
    mutationFn: async (categoryData) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create category' }));
        throw new Error(errorData.message || `Failed to create category (${response.status})`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: "Category Created", description: "New category added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation<FileCategory, Error, { categoryId: string, categoryData: UpdatableFileCategory }>({
    mutationFn: async ({ categoryId, categoryData }) => {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update category' }));
        throw new Error(errorData.message || `Failed to update category (${response.status})`);
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: "Category Updated", description: "Category updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation<null, Error, string>({
    mutationFn: async (categoryId: string) => {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (response.status === 204) { // Handle 204 No Content for successful DELETE
        return null;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete category' }));
        throw new Error(errorData.message || `Failed to delete category (${response.status})`);
      }
      return null; // Should ideally not be reached if status is 204 or error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({ title: "Category Deleted", description: "Category deleted successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  return {
    files,
    isLoadingFiles,
    filesError,
    refetchFiles,
    deleteFiles: deleteFilesMutation.mutate,
    deleteFilesAsync: deleteFilesMutation.mutateAsync,
    isDeletingFiles: deleteFilesMutation.isPending,

    // Categories
    categories,
    isLoadingCategories,
    categoriesError,
    refetchCategories,

    // Category Mutations
    createCategory: createCategoryMutation.mutate,
    createCategoryAsync: createCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutate,
    updateCategoryAsync: updateCategoryMutation.mutateAsync,
    isUpdatingCategory: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutate,
    deleteCategoryAsync: deleteCategoryMutation.mutateAsync,
    isDeletingCategory: deleteCategoryMutation.isPending,
  };
}
