/**
 * Memory actions hook - handles all memory CRUD operations
 * @used-by memory/MemorySection
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { ManualMemoryFormData } from "../../components/memory/constants";
import { saveSmartDefault, getSmartDefaults, getRecentValues } from "../../components/memory/utils";

interface UseMemoryActionsProps {
  memoriesLoaded: boolean;
  refetchOverview: () => Promise<any>;
  infiniteMemoriesQuery: { refetch: () => Promise<any> };
  onMemoryCreated?: () => void;
  onMemoryUpdated?: () => void;
  onMemoryDeleted?: () => void;
}

export function useMemoryActions({
  memoriesLoaded,
  refetchOverview,
  infiniteMemoriesQuery,
  onMemoryCreated,
  onMemoryUpdated,
  onMemoryDeleted
}: UseMemoryActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Manual memory creation mutation with smart defaults tracking
  const createManualMemoryMutation = useMutation({
    mutationFn: async (data: ManualMemoryFormData) => {
      // Convert importance level to numeric score
      const importanceMap = { low: 0.3, medium: 0.6, high: 0.9 };
      const importanceScore = importanceMap[data.importance];

      // Save to smart defaults for future use
      saveSmartDefault({
        content: data.content,
        category: data.category,
        importance: data.importance,
      });

      // Use the existing memory processing system like chat does
      return apiRequest("/api/memories/manual", "POST", {
        content: data.content,
        category: data.category,
        importance: importanceScore,
      });
    },
    onSuccess: async () => {
      // Force immediate refetch of overview for instant UI updates
      await refetchOverview();
      
      // Invalidate Godmode metrics to update quality indicators
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      
      // If memories are loaded, refetch them to show new memory
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
        await infiniteMemoriesQuery.refetch();
      }
      
      onMemoryCreated?.();
      
      toast({
        title: "Memory saved",
        description: "Your memory has been processed and saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save memory. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: (memoryId: string) => apiRequest(`/api/memories/${memoryId}`, "DELETE"),
    onSuccess: async () => {
      // Force immediate refetch of overview for instant UI updates
      await refetchOverview();
      
      // Invalidate Godmode metrics to update quality indicators
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      
      // If memories are loaded, refetch them to update the list
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
        await infiniteMemoriesQuery.refetch();
      }
      
      onMemoryDeleted?.();
      
      toast({
        title: "Memory deleted",
        description: "The memory has been successfully removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      });
    }
  });

  const editMemoryMutation = useMutation({
    mutationFn: ({ memoryId, content }: { memoryId: string; content: string }) => 
      apiRequest(`/api/memories/${memoryId}`, "PUT", { content }),
    onSuccess: async () => {
      // Force immediate refetch of overview for instant UI updates
      await refetchOverview();
      
      // Invalidate Godmode metrics to update quality indicators
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      
      // If memories are loaded, refetch them to update the list
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
        await infiniteMemoriesQuery.refetch();
      }
      
      onMemoryUpdated?.();
      
      toast({
        title: "Memory updated",
        description: "The memory has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update memory. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (memoryIds: string[]) => {
      const deletePromises = memoryIds.map(id => apiRequest(`/api/memories/${id}`, "DELETE"));
      await Promise.all(deletePromises);
    },
    onSuccess: async (_, memoryIds) => {
      await refetchOverview();
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
        await infiniteMemoriesQuery.refetch();
      }
      
      onMemoryDeleted?.();
      
      toast({
        title: "Memories deleted",
        description: `${memoryIds.length} memories have been successfully removed.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete memories. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const handleDeleteMemory = (memoryId: string) => {
    if (confirm("Are you sure you want to delete this memory?")) {
      deleteMemoryMutation.mutate(memoryId);
    }
  };

  const handleEditMemory = (memoryId: string, content: string) => {
    if (content.trim() === "") {
      toast({
        title: "Error",
        description: "Memory content cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    editMemoryMutation.mutate({
      memoryId,
      content: content.trim()
    });
  };

  const handleBulkDelete = (memoryIds: string[]) => {
    const selectedCount = memoryIds.length;
    if (selectedCount === 0) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedCount} selected memories?`);
    if (confirmed) {
      bulkDeleteMutation.mutate(memoryIds);
    }
  };

  return {
    // Mutations
    createManualMemoryMutation,
    deleteMemoryMutation,
    editMemoryMutation,
    bulkDeleteMutation,
    
    // Helper functions
    handleDeleteMemory,
    handleEditMemory,
    handleBulkDelete,
  };
}