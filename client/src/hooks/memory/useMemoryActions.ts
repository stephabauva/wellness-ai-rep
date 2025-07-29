/**
 * Memory actions hook - handles all memory CRUD operations
 * @used-by memory/MemorySection
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { ManualMemoryFormData } from "../../components/memory/constants";
import { saveSmartDefault, getSmartDefaults, getRecentValues } from "../../components/memory/utils";
import { useDuplicateMemoryNotification } from "../../components/memory/DuplicateMemoryNotification";

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
  const { showDuplicateNotification } = useDuplicateMemoryNotification();

  // Note: Duplicate checking is now handled directly in the Go service during memory creation
  // No separate pre-check needed - the Go service handles deduplication automatically

  // Manual memory creation mutation with Go service integration and deduplication support
  const createManualMemoryMutation = useMutation({
    mutationFn: async (data: ManualMemoryFormData) => {
      // Start performance timing
      const startTime = performance.now();
      
      // Convert importance level to numeric score
      const importanceMap = { low: 0.3, medium: 0.6, high: 0.9 };
      const importanceScore = importanceMap[data.importance];

      // Save to smart defaults for future use
      saveSmartDefault({
        content: data.content,
        category: data.category,
        importance: data.importance,
      });

      try {
        // Call Go memory service directly for deduplication support
        const response = await fetch("http://localhost:8081/api/memories/manual", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: data.content.trim(),
            category: data.category,
            importance: importanceScore,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Log deduplication info for debugging
        if (result.deduplicationOccurred) {
          console.log('🔍 Deduplication detected:', {
            action: result.action,
            confidence: Math.round(result.confidence * 100) + '%',
            similarCount: result.similarMemories?.length
          });
        }
        
        // Log performance metrics for monitoring
        const duration = performance.now() - startTime;
        console.log(`[Memory Creation Performance] Duration: ${duration.toFixed(2)}ms (Target: <200ms)`);
        
        // Track if we're meeting performance targets
        if (duration > 200) {
          console.warn(`[Memory Creation Performance] Slower than target: ${duration.toFixed(2)}ms > 200ms`);
        }
        
        return { ...result, originalData: data };
      } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`[Memory Creation Performance] Failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
      }
    },
    onSuccess: async (result) => {
      const refreshStartTime = performance.now();
      
      try {
        // Check if deduplication occurred and show notification modal
        if (result.deduplicationOccurred && result.similarMemories && result.similarMemories.length > 0) {
          console.log('🔍 Showing deduplication modal for similar memories');
          
          // Show duplicate memory notification with modal
          showDuplicateNotification({
            newMemoryContent: result.originalData.content,
            newMemoryCategory: result.originalData.category,
            similarMemories: result.similarMemories,
            processingTime: "< 200ms",
            onSaveAnyway: () => {
              toast({
                title: "Similar memory noted",
                description: `Memory was ${result.action === 'update' ? 'updated' : result.action === 'merge' ? 'merged' : 'processed'} - ${result.reasoning}`,
              });
            },
            onCancel: () => {
              console.log('🔍 User cancelled memory creation due to duplicates');
              // Toast dismissal is now handled automatically by the notification component
              // No additional toast needed here
            },
            onViewSimilar: (memoryId: string) => {
              console.log('View similar memory:', memoryId);
              // Could implement navigation to view the specific memory
            }
          }, toast);
        } else {
          // No deduplication - normal success flow
          toast({
            title: "Memory saved",
            description: "Your memory has been processed and saved successfully.",
          });
        }

        // Force immediate refetch of overview for instant UI updates
        await refetchOverview();
        
        // Invalidate Godmode metrics to update quality indicators
        await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
        
        // If memories are loaded, refetch them to show new memory
        if (memoriesLoaded) {
          await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
          await infiniteMemoriesQuery.refetch();
        }
        
        const refreshDuration = performance.now() - refreshStartTime;
        console.log(`[Memory UI Refresh Performance] Duration: ${refreshDuration.toFixed(2)}ms`);
        
        onMemoryCreated?.();
        
      } catch (error) {
        console.error('[Memory UI Refresh] Error during refresh:', error);
        // Still show success toast since memory was created successfully
        toast({
          title: "Memory saved",
          description: "Your memory has been saved successfully.",
        });
      }
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
    mutationFn: async (memoryId: string) => {
      const response = await fetch(`http://localhost:8081/api/memories/${memoryId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete memory: ${response.status}`);
      }
      
      return response.json();
    },
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
    mutationFn: async ({ memoryId, content }: { memoryId: string; content: string }) => {
      const response = await fetch(`http://localhost:8081/api/memories/${memoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update memory: ${response.status}`);
      }
      
      return response.json();
    },
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
      const deletePromises = memoryIds.map(id => 
        fetch(`http://localhost:8081/api/memories/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Failed to delete memory ${id}: ${response.status}`);
          }
          return response.json();
        })
      );
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