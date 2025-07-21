import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@shared/components/ui/form";
import { Brain, Plus } from "lucide-react";
import { FAB } from "./ui/FAB";
import { apiRequest, queryClient } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { useVoiceHandlers } from "../hooks/memory/useVoiceHandlers";
import { useMemoryEdit } from "../hooks/memory/useMemoryEdit";
import { useInfiniteMemories } from "../hooks/useInfiniteMemories";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { ManualMemoryFormData } from "./memory/constants";
import { useMemoryActions } from "../hooks/memory/useMemoryActions";
import { useMemoryFilters } from "../hooks/memory/useMemoryFilters";
import { MemoryCategoryGrid } from "./memory/MemoryCategoryGrid";
import { MemoryForm } from "./memory/MemoryForm";
import { MemoryInsights } from "./memory/MemoryInsights";
import { MemoryList } from "./memory/MemoryList";
import { MemoryOverviewHeader } from "./memory/MemoryOverviewHeader";
import { MemorySummaryCard } from "./memory/MemorySummaryCard";
import { SelectionModeControls } from "./memory/SelectionModeControls";
import { MemoryExplanationCard } from "./memory/MemoryExplanationCard";
import { MemoryLabelFilter } from "./memory/MemoryLabelFilter";
import { MemoryEmptyState } from "./memory/MemoryEmptyState";




export default function MemorySection() {
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState<boolean>(false);
  const [memoriesLoaded, setMemoriesLoaded] = useState<boolean>(false);
  const [useInfiniteScrolling, setUseInfiniteScrolling] = useState<boolean>(true);
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

  // Handle form submission from MemoryForm component
  const handleMemoryFormSubmit = (data: ManualMemoryFormData) => {
    createManualMemoryMutation.mutate(data);
    setIsManualEntryOpen(false);
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
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">AI Memory</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
          <MemoryOverviewHeader />

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
      <FAB
        onClick={() => setIsManualEntryOpen(!isManualEntryOpen)}
        position="bottom-right"
        size="default"
        className="shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 safe-area-inset-bottom"
        aria-label="Add Memory"
        title="Add Memory"
      >
        <Plus className="h-6 w-6" />
      </FAB>
      </div>
    </TooltipProvider>
  );
}