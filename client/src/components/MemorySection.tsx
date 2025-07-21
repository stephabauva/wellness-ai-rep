import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@shared/components/ui/form";
import { Trash2, Brain, User, Settings, Lightbulb, Apple, Target, ChevronDown, ChevronUp, Info, X, Plus, AlertCircle, Loader2, Mic, MicOff, Volume2, History, Zap, Clock, HelpCircle, Edit3, MousePointer2, CheckSquare } from "lucide-react";
import { FAB } from "./ui/FAB";
import { PrivacyBadge, PrivacyStatus } from "./ui/PrivacyBadge";
import { apiRequest, queryClient } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { useVoiceHandlers } from "../hooks/memory/useVoiceHandlers";
import { useMemoryEdit } from "../hooks/memory/useMemoryEdit";
import { useInfiniteMemories } from "../hooks/useInfiniteMemories";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";
import { 
  manualMemorySchema, 
  ManualMemoryFormData, 
  MemoryEntry, 
  categoryIcons, 
  categoryLabels, 
  categoryColors, 
  explanationCards 
} from "./memory/constants";
import { useMemoryActions } from "../hooks/memory/useMemoryActions";
import { useMemoryFilters } from "../hooks/memory/useMemoryFilters";
import { MemoryCategoryGrid } from "./memory/MemoryCategoryGrid";
import { MemoryForm } from "./memory/MemoryForm";
import { MemoryInsights } from "./memory/MemoryInsights";
import { MemoryList } from "./memory/MemoryList";
import { MemoryOverviewHeader } from "./memory/MemoryOverviewHeader";
import { MemorySummaryCard } from "./memory/MemorySummaryCard";
import { SelectionModeControls } from "./memory/SelectionModeControls";




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

              {/* Explanation Card */}
              <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
                <Card className="border-purple-200 bg-purple-50">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-purple-100 transition-colors min-h-[44px] py-4 touch-manipulation">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="h-5 w-5 text-purple-600" />
                          <CardTitle className="text-purple-800">
                            {explanationCards[selectedCategory as keyof typeof explanationCards]?.title}
                          </CardTitle>
                        </div>
                        {isExplanationOpen ? (
                          <ChevronUp className="h-4 w-4 text-purple-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-purple-600" />
                        )}
                      </div>
                      <CardDescription className="text-purple-700">
                        {explanationCards[selectedCategory as keyof typeof explanationCards]?.description}
                      </CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ul className="space-y-2 mb-4">
                        {explanationCards[selectedCategory as keyof typeof explanationCards]?.details.map((detail, index) => (
                          <li key={index} className="flex items-start gap-2 text-purple-700">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* Privacy & Data Usage Transparency */}
                      {explanationCards[selectedCategory as keyof typeof explanationCards]?.privacyNote && (
                        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-1">
                            <span>🔒</span>
                            How this helps your coaching
                          </h4>
                          <p className="text-xs text-purple-700 mb-2">
                            {explanationCards[selectedCategory as keyof typeof explanationCards]?.privacyNote}
                          </p>
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-xs text-blue-700">
                              <strong>Coaching Benefits:</strong> {explanationCards[selectedCategory as keyof typeof explanationCards]?.coachingBenefits}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
              
              {/* Label Filtering Section */}
              {selectedCategory !== "all" && availableLabels.length > 0 && (
                <Card className="border-gray-200 bg-gray-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Filter by Labels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllLabels}
                          className="text-xs min-h-[44px] px-4"
                        >
                          {selectedLabels.size === availableLabels.length ? "Deselect All" : "Select All"}
                        </Button>
                        <span className="text-xs text-gray-600">
                          {selectedLabels.size} of {availableLabels.length} labels selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableLabels.map(({ label, count }) => (
                          <Badge
                            key={label}
                            variant={selectedLabels.has(label) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-gray-100 text-xs min-h-[44px] px-3 py-2 flex items-center justify-center touch-manipulation"
                            onClick={() => handleLabelToggle(label)}
                          >
                            {label} ({count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {memories.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Brain className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No memories yet</h3>
                    <p className="text-gray-500 text-center">
                      Start chatting with your AI coach to build a personalized memory bank that helps provide better guidance.
                    </p>
                  </CardContent>
                </Card>
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