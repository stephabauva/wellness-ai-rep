import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFromApi, deleteFromApi } from '../services/apiClient';
import { useToast } from './use-toast'; // Assuming use-toast is already adapted

// Define the structure for a Memory item based on PWA or backend
// This should align with what the backend expects or be transformed before sending.
export interface MemoryItem {
  id: string;
  content: string;
  category?: string; // e.g., 'Preference', 'Health Concern', 'Goal'
  importance?: 'Low' | 'Medium' | 'High' | 'Critical' | string; // Allow string for flexibility
  timestamp?: string; // ISO8601 string of when it was recorded or last updated
  metadata?: Record<string, any>; // For any other structured data
  // Add other fields like 'userId', 'source', etc. if applicable
}

export function useMemoryApi() {
  const queryClient = useQueryClient();
  const { show: showToast } = useToast(); // Assuming useToast hook returns a show method

  // Fetching memories
  const {
    data: memories = [], // Default to empty array
    isLoading: isLoadingMemories,
    error: memoriesError,
    refetch: refetchMemories,
  } = useQuery<MemoryItem[]>({
    queryKey: ['memories'], // Unique query key for TanStack Query
    queryFn: () => getFromApi<MemoryItem[]>('memories'), // API endpoint path
    // staleTime: 1000 * 60 * 5, // Optional: 5 minutes
  });

  // Deleting a memory
  const { mutateAsync: deleteMemoryAPI, isPending: isDeletingMemory } = useMutation<
    void, // Assuming DELETE returns no content or just a success status
    Error, // Type of error expected
    string // Type of variables passed to mutationFn (memoryId)
  >({
    mutationFn: (memoryId: string) => deleteFromApi(`memories/${memoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] }); // Refetch memories after deletion
      // Toast is handled in the component to allow for specific messages
    },
    onError: (error: Error) => {
      // Toast is handled in the component
      console.error("Error deleting memory via hook:", error);
    },
  });

  // TODO: Add mutations for creating and updating memories later
  // const { mutateAsync: createMemoryAPI, isPending: isCreatingMemory } = useMutation(...)
  // const { mutateAsync: updateMemoryAPI, isPending: isUpdatingMemory } = useMutation(...)

  return {
    memories: memories || [], // Ensure it's always an array
    isLoadingMemories,
    memoriesError: memoriesError as Error | null, // Cast for consistency
    refetchMemories,
    deleteMemoryAPI,
    isDeletingMemory,
    // createMemoryAPI, (when implemented)
    // isCreatingMemory, (when implemented)
    // updateMemoryAPI, (when implemented)
    // isUpdatingMemory, (when implemented)
  };
}
