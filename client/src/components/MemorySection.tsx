import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@shared/components/ui/use-toast";
import { useVoiceHandlers } from "../hooks/memory/useVoiceHandlers";
import { useMemoryEdit } from "../hooks/memory/useMemoryEdit";
import { useInfiniteMemories } from "../hooks/useInfiniteMemories";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { ManualMemoryFormData } from "./memory/constants";
import { useMemoryActions } from "../hooks/memory/useMemoryActions";
import { useMemoryFilters } from "../hooks/memory/useMemoryFilters";
import { MemoryInsights } from "./memory/MemoryInsights";
import { MemoryList } from "./memory/MemoryList";
import { MemoryOverviewHeader } from "./memory/MemoryOverviewHeader";
import { MemorySummaryCard } from "./memory/MemorySummaryCard";
import { SelectionModeControls } from "./memory/SelectionModeControls";
import { MemoryExplanationCard } from "./memory/MemoryExplanationCard";
import { MemoryLabelFilter } from "./memory/MemoryLabelFilter";
import { MemoryEmptyState } from "./memory/MemoryEmptyState";
import { MemoryLoadingSkeleton } from "./memory/MemoryLoadingSkeleton";
import { MemoryAddFAB } from "./memory/MemoryAddFAB";
import { SimpleDuplicateModal, type SimilarMemory } from "./memory/SimpleDuplicateModal";




export default function MemorySection() {
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState<boolean>(false);
  const [memoriesLoaded, setMemoriesLoaded] = useState<boolean>(false);
  const [useInfiniteScrolling, setUseInfiniteScrolling] = useState<boolean>(true);
  
  // Ref for scrolling to form
  const formSectionRef = React.useRef<HTMLDivElement>(null);
  
  // Simple duplicate modal state
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    newMemoryContent: string;
    newMemoryCategory: string;
    similarMemories: SimilarMemory[];
    pendingData?: ManualMemoryFormData;
  }>({
    isOpen: false,
    newMemoryContent: "",
    newMemoryCategory: "",
    similarMemories: [],
  });
  const { toast } = useToast();

  // Memory filtering and selection management
  const memoryFilters = useMemoryFilters();
  const {
    selectedCategory,
    selectedLabels,
    isSelectionMode,
    selectedMemoryIds,
    showAllCategories,
    availableLabels,
    handleCategoryChange,
    handleLabelToggle,
    handleSelectAllLabels,
    handleToggleSelectionMode,
    handleToggleMemorySelection,
    handleSelectAll,
    handleDeselectAll,
    toggleShowAllCategories,
    resetFilters,
    updateMemories,
    memories: filteredMemories,
    setRefetchCallback
  } = memoryFilters;

  // Voice input integration
  const { isVoiceInputActive, voiceInput } = useVoiceHandlers();

  // Edit state management
  const {
    editingMemoryId,
    editingMemoryContent,
    isEditing,
    handleStartEdit,
    handleCancelEdit,
    handleEditingContentChange,
    setEditingMemoryId,
    setEditingMemoryContent,
  } = useMemoryEdit();

  // Simple duplicate detection - uses modal instead of complex toast system
  const handleMemoryFormSubmit = async (data: ManualMemoryFormData) => {
    try {
      const duplicateCheck = await checkDuplicatesMutation.mutateAsync(data);
      
      if (duplicateCheck.hasDuplicates && duplicateCheck.similarMemories.length > 0) {
        // Show simple modal
        setDuplicateModal({
          isOpen: true,
          newMemoryContent: data.content,
          newMemoryCategory: data.category,
          similarMemories: duplicateCheck.similarMemories,
          pendingData: data
        });
      } else {
        // No duplicates - proceed normally
        createManualMemoryMutation.mutate(data);
        setIsManualEntryOpen(false);
      }
    } catch (error) {
      console.warn('[Duplicate Check] Failed, proceeding with creation:', error);
      createManualMemoryMutation.mutate(data);
      setIsManualEntryOpen(false);
    }
  };

  // Simple modal handlers
  const handleDuplicateSaveAnyway = () => {
    if (duplicateModal.pendingData) {
      createManualMemoryMutation.mutate(duplicateModal.pendingData);
    }
    setDuplicateModal(prev => ({ ...prev, isOpen: false }));
    setIsManualEntryOpen(false);
  };

  const handleDuplicateCancel = () => {
    setDuplicateModal(prev => ({ ...prev, isOpen: false }));
    toast({
      title: "Memory Creation Cancelled",
      description: "You can edit your memory and try again.",
    });
  };

  const handleDuplicateReplace = async () => {
    if (duplicateModal.pendingData && duplicateModal.similarMemories.length > 0) {
      // Delete the old memory first
      const oldMemoryId = duplicateModal.similarMemories[0].id;
      try {
        await deleteMemoryMutation.mutateAsync(oldMemoryId);
        // Then create the new one
        createManualMemoryMutation.mutate(duplicateModal.pendingData);
        toast({
          title: "Memory Replaced",
          description: "Old memory deleted and new memory saved.",
        });
      } catch (error) {
        console.error('Failed to delete old memory:', error);
        // Still create the new memory even if delete fails
        createManualMemoryMutation.mutate(duplicateModal.pendingData);
        toast({
          title: "Memory Saved",
          description: "New memory saved (couldn't delete old memory).",
        });
      }
    }
    setDuplicateModal(prev => ({ ...prev, isOpen: false }));
    setIsManualEntryOpen(false);
  };

  // Handle opening form and scrolling to it
  const handleOpenForm = () => {
    setIsManualEntryOpen(true);
    // Scroll to form after a short delay to ensure it's rendered
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
      });
    }, 100);
  };

  // Optimized overview query - lightweight, runs once on mount
  const { data: memoryOverview = { total: 0, categories: {}, qualityMetrics: {} }, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["memory-overview"],
    queryFn: async () => {
      const startTime = performance.now();
      const response = await fetch(`/api/memories/overview`);
      if (!response.ok) throw new Error("Failed to fetch memory overview");
      
      const data = await response.json();
      const duration = performance.now() - startTime;
      
      console.log(`[Memory Overview Performance] Duration: ${duration.toFixed(2)}ms (Target: <100ms)`);
      
      if (duration > 100) {
        console.warn(`[Memory Overview Performance] Slower than target: ${duration.toFixed(2)}ms > 100ms`);
      }
      
      return data;
    },
    staleTime: 10 * 60 * 1000, // Increased to 10 minutes cache
    gcTime: 15 * 60 * 1000, // Keep in memory for 15 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false, // No polling
    refetchOnMount: false, // Don't refetch on mount if we have data
  });

  // Infinite scroll hook for optimized memory loading - start immediately
  const infiniteMemoriesQuery = useInfiniteMemories({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    limit: 20,
    enabled: true // Start loading immediately for better performance
  });
  
  // Optimized intersection observer for faster infinite scroll
  const { targetRef, isFetching } = useInfiniteScroll({
    hasMore: infiniteMemoriesQuery.hasMore,
    isLoading: infiniteMemoriesQuery.isFetchingNextPage,
    onLoadMore: () => {
      if (infiniteMemoriesQuery.hasMore && !infiniteMemoriesQuery.isFetchingNextPage) {
        infiniteMemoriesQuery.fetchNextPage();
      }
    },
    threshold: 0.3, // Start loading when 30% from bottom (more aggressive)
    rootMargin: '200px' // Increased margin for earlier loading
  });
  
  // Legacy fallback query - kept for error recovery but not used by default
  const { data: allMemories = [], isLoading: allMemoriesLoading, refetch: refetchMemories } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const response = await fetch(`/api/memories`);
      if (!response.ok) throw new Error("Failed to fetch memories");
      const data = await response.json();
      // Handle both paginated and non-paginated responses
      return Array.isArray(data) ? data : (data.memories || []);
    },
    enabled: false, // Never automatically fetch - hidden fallback only
    staleTime: 10 * 60 * 1000, // 10 minutes cache once loaded
    refetchOnWindowFocus: false,
    refetchInterval: false, // No polling ever
  });

  // Set memories loaded state immediately for UI consistency
  useEffect(() => {
    setMemoriesLoaded(true);
  }, []);

  // Memory actions hook
  const {
    createManualMemoryMutation,
    deleteMemoryMutation,
    editMemoryMutation,
    bulkDeleteMutation,
    checkDuplicatesMutation,
    handleDeleteMemory,
    handleEditMemory,
    handleBulkDelete
  } = useMemoryActions({
    memoriesLoaded,
    refetchOverview,
    infiniteMemoriesQuery,
    onMemoryCreated: () => {
      setIsManualEntryOpen(false);
    },
    onMemoryUpdated: () => {
      handleCancelEdit();
    },
    onMemoryDeleted: () => {
      handleDeselectAll();
    }
  });

  // Get memories from infinite scroll
  const rawMemories = infiniteMemoriesQuery.memories;
  
  // Update memories in the filter hook when raw memories change
  useEffect(() => {
    if (rawMemories.length > 0) {
      updateMemories(rawMemories);
    }
  }, [rawMemories, updateMemories]);

  // Set refetch callback for category changes
  useEffect(() => {
    setRefetchCallback(() => infiniteMemoriesQuery.refetch);
  }, [setRefetchCallback, infiniteMemoriesQuery.refetch]);

  // Use filtered memories from the hook, fallback to raw memories
  const memories = filteredMemories.length > 0 ? filteredMemories : rawMemories;
  const isLoading = overviewLoading || (memoriesLoaded && infiniteMemoriesQuery.isLoading);

  // Edit save handler
  const handleSaveEdit = (memoryId: string) => {
    handleEditMemory(memoryId, editingMemoryContent);
  };

  const handleBulkDeleteAction = () => {
    handleBulkDelete(Array.from(selectedMemoryIds));
  };



  if (isLoading) {
    return <MemoryLoadingSkeleton />;
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
          <MemoryOverviewHeader />

          <div ref={formSectionRef}>
            <MemorySummaryCard
              memoryOverview={memoryOverview}
              memoriesLoaded={memoriesLoaded}
              memories={memories}
              selectedCategory={selectedCategory}
              showAllCategories={showAllCategories}
              isManualEntryOpen={isManualEntryOpen}
              isSelectionMode={isSelectionMode}
              createManualMemoryMutation={createManualMemoryMutation}
              voiceInput={voiceInput}
              onCategoryChange={handleCategoryChange}
              onToggleShowAllCategories={toggleShowAllCategories}
              onToggleSelectionMode={handleToggleSelectionMode}
              onManualEntryClose={() => setIsManualEntryOpen(false)}
              onMemoryFormSubmit={handleMemoryFormSubmit}
            />
          </div>

          <div className="space-y-4">
              <MemoryInsights 
                memoryOverview={memoryOverview}
                showInsights={showInsights}
                setShowInsights={setShowInsights}
              />

              <MemoryExplanationCard
                selectedCategory={selectedCategory}
                isExplanationOpen={isExplanationOpen}
                onToggleExplanation={setIsExplanationOpen}
              />
              
              <MemoryLabelFilter
                selectedCategory={selectedCategory}
                availableLabels={availableLabels}
                selectedLabels={selectedLabels}
                onLabelToggle={handleLabelToggle}
                onSelectAllLabels={handleSelectAllLabels}
              />

              {memories.length === 0 ? (
                <MemoryEmptyState />
              ) : (
                <>
                  <SelectionModeControls
                    isSelectionMode={isSelectionMode}
                    memories={memories}
                    selectedMemoryIds={selectedMemoryIds}
                    bulkDeleteMutation={bulkDeleteMutation}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onBulkDelete={handleBulkDeleteAction}
                  />

                  <MemoryList
                    memories={memories}
                    isSelectionMode={isSelectionMode}
                    selectedMemoryIds={selectedMemoryIds}
                    editingMemoryId={editingMemoryId}
                    editingMemoryContent={editingMemoryContent}
                    isEditing={isEditing}
                    deleteMemoryMutation={deleteMemoryMutation}
                    editMemoryMutation={editMemoryMutation}
                    infiniteMemoriesQuery={infiniteMemoriesQuery}
                    targetRef={targetRef}
                    onToggleMemorySelection={handleToggleMemorySelection}
                    onDeleteMemory={handleDeleteMemory}
                    onStartEdit={handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onEditingContentChange={handleEditingContentChange}
                  />
                </>)}
          </div>
        </div>
      </div>

      {/* Floating Action Button for Add Memory - positioned in mobile thumb zone */}
      <MemoryAddFAB onClick={handleOpenForm} />

      {/* Simple Duplicate Modal - guaranteed to appear on top */}
      <SimpleDuplicateModal
        isOpen={duplicateModal.isOpen}
        newMemoryContent={duplicateModal.newMemoryContent}
        newMemoryCategory={duplicateModal.newMemoryCategory}
        similarMemories={duplicateModal.similarMemories}
        onSaveAnyway={handleDuplicateSaveAnyway}
        onReplace={handleDuplicateReplace}
        onCancel={handleDuplicateCancel}
      />
      </div>
    </TooltipProvider>
  );
}