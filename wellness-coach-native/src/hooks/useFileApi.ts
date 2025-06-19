import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast'; // Adjusted path
// Assuming FileCategory will be defined in ../types/fileManager alongside FileItem
import { FileItem, FileCategory } from '../types/fileManager'; // Adjusted path
import { formatFileSize } from '../utils/fileManagerUtils'; // Adjusted path // For toast message
// import { API_CONFIG } from '../config/api'; // No longer needed directly
import { getFromApi, postToApi, patchToApi, deleteFromApi, putToApi } from '../services/apiClient'; // Import apiClient functions

/**
 * @file useFileApi.ts
 * @description Custom hook for interacting with file and category management APIs.
 * Provides functions for fetching, deleting, categorizing files, and managing categories.
 */

// Type for category data for create operations (aligns with server DTO from insertFileCategorySchema)
// Requires 'name', other fields from the schema are optional.
/** @private Type for creating a new file category. */
type CreatableFileCategory = Required<Pick<FileCategory, 'name'>> & Partial<Pick<FileCategory, 'description' | 'icon' | 'color'>>;

// Type for category data for update operations (all fields optional)
/** @private Type for updating an existing file category. */
type UpdatableFileCategory = Partial<Pick<FileCategory, 'name' | 'description' | 'icon' | 'color'>>;

/**
 * Custom hook `useFileApi` for managing files and categories.
 *
 * @returns {object} An object containing:
 *  - `files: FileItem[]` - Array of fetched files.
 *  - `isLoadingFiles: boolean` - Loading state for fetching files.
 *  - `filesError: Error | null` - Error object if fetching files fails.
 *  - `refetchFiles: () => void` - Function to manually refetch files.
 *  - `deleteFiles: (fileIds: string[]) => void` - Function to delete files by their IDs.
 *  - `deleteFilesAsync: (fileIds: string[]) => Promise<any>` - Async version of deleteFiles.
 *  - `isDeletingFiles: boolean` - Loading state for file deletion.
 *  - `categorizeFiles: (params: { fileIds: string[]; categoryId?: string }) => void` - Function to assign files to a category.
 *  - `categorizeFilesAsync: (params: { fileIds: string[]; categoryId?: string }) => Promise<any>` - Async version of categorizeFiles.
 *  - `isCategorizingFiles: boolean` - Loading state for file categorization.
 *  - `categories: FileCategory[]` - Array of fetched categories.
 *  - `isLoadingCategories: boolean` - Loading state for fetching categories.
 *  - `categoriesError: Error | null` - Error object if fetching categories fails.
 *  - `refetchCategories: () => void` - Function to manually refetch categories.
 *  - `createCategory: (categoryData: CreatableFileCategory) => void` - Function to create a new category.
 *  - `createCategoryAsync: (categoryData: CreatableFileCategory) => Promise<FileCategory>` - Async version of createCategory.
 *  - `isCreatingCategory: boolean` - Loading state for category creation.
 *  - `updateCategory: (params: { categoryId: string, categoryData: UpdatableFileCategory }) => void` - Function to update an existing category.
 *  - `updateCategoryAsync: (params: { categoryId: string, categoryData: UpdatableFileCategory }) => Promise<FileCategory>` - Async version of updateCategory.
 *  - `isUpdatingCategory: boolean` - Loading state for category update.
 *  - `deleteCategory: (categoryId: string) => void` - Function to delete a category by its ID.
 *  - `deleteCategoryAsync: (categoryId: string) => Promise<null>` - Async version of deleteCategory.
 *  - `isDeletingCategory: boolean` - Loading state for category deletion.
 */
export function useFileApi() {
  const { toast } = useToast(); // Note: This uses the 'toast' function from useToast's return, not 'show'
  const queryClient = useQueryClient();

  const {
    data: files = [],
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
    error: filesError,
  } = useQuery<FileItem[]>({
    queryKey: ['files', '/api/files'],
    queryFn: () => getFromApi<FileItem[]>('files'),
  });

  const deleteFilesMutation = useMutation({
    mutationFn: (fileIds: string[]) => postToApi('files/delete', { fileIds }),
    onSuccess: (data: any) => {
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

  const categorizeFilesMutation = useMutation({
    mutationFn: ({ fileIds, categoryId }: { fileIds: string[]; categoryId?: string }) =>
      patchToApi('files/categorize', { fileIds, categoryId }),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', '/api/files'] });

      const { updatedCount = 0 } = data || {};
      const currentCategories = queryClient.getQueryData<FileCategory[]>(['categories']) || [];
      const categoryName = variables.categoryId
        ? currentCategories.find(cat => cat.id === variables.categoryId)?.name || 'Selected Category'
        : 'Uncategorized';

      toast({
        title: "Files Categorized",
        description: `Successfully updated ${updatedCount} file(s) to ${categoryName}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Categorization Failed",
        description: error.message || "Could not categorize selected files. Please try again.",
        variant: "destructive",
      });
    },
  });

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useQuery<FileCategory[]>({
    queryKey: ['categories'],
    queryFn: () => getFromApi<FileCategory[]>('categories'),
  });

  const createCategoryMutation = useMutation<FileCategory, Error, CreatableFileCategory>({
    mutationFn: (categoryData) => postToApi<FileCategory>('categories', categoryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: "Category Created", description: "New category added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation<FileCategory, Error, { categoryId: string, categoryData: UpdatableFileCategory }>({
    mutationFn: ({ categoryId, categoryData }) =>
      putToApi<FileCategory>(`categories/${categoryId}`, categoryData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: "Category Updated", description: "Category updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation<null, Error, string>({
    mutationFn: (categoryId: string) => deleteFromApi<null>(`categories/${categoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['files'] }); // Also invalidate files as their category info might change
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

    categorizeFiles: categorizeFilesMutation.mutate,
    categorizeFilesAsync: categorizeFilesMutation.mutateAsync,
    isCategorizingFiles: categorizeFilesMutation.isPending,

    categories,
    isLoadingCategories,
    categoriesError,
    refetchCategories,

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
