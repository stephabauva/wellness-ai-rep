import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Textarea } from "@shared/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@shared/components/ui/form";
import { Trash2, Brain, User, Settings, Lightbulb, Apple, Target, ChevronDown, ChevronUp, Info, X, Plus, Calendar, AlertCircle, Eye, Loader2, CheckCircle, Mic, MicOff, Volume2, History, Zap, Clock, HelpCircle, Edit3, MousePointer2, CheckSquare } from "lucide-react";
import { FAB } from "./ui/FAB";
import { PrivacyBadge, PrivacyStatus } from "./ui/PrivacyBadge";
import { TouchSwipeHandler, createDeleteAction, createEditAction } from "./ui/TouchSwipeHandler";
import { apiRequest, queryClient } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { useVoiceInput } from "../hooks/useVoiceInput";
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




export default function MemorySection() {
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState<boolean>(false);
  const [memoriesLoaded, setMemoriesLoaded] = useState<boolean>(false);
  const [useInfiniteScrolling, setUseInfiniteScrolling] = useState<boolean>(true);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState<boolean>(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState<string>("");
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
  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceInput({
    onTranscript: () => {
      // Voice input handling is now managed by MemoryForm component
    },
    onError: (error) => {
      toast({
        title: "Voice Input Error",
        description: error,
        variant: "destructive",
      });
    },
    continuous: false,
    interimResults: true,
  });

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      setIsVoiceInputActive(false);
    } else {
      startListening();
      setIsVoiceInputActive(true);
    }
  };

  // Handle form submission from MemoryForm component
  const handleMemoryFormSubmit = (data: ManualMemoryFormData) => {
    createManualMemoryMutation.mutate(data);
    setIsManualEntryOpen(false);
  };

  // Overview count query - lightweight, runs once on mount
  const { data: memoryOverview = { total: 0, categories: {}, qualityMetrics: {} }, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["memory-overview"],
    queryFn: async () => {
      const response = await fetch(`/api/memories/overview`);
      if (!response.ok) throw new Error("Failed to fetch memory overview");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchInterval: false, // No polling
  });

  // Infinite scroll hook for optimized memory loading
  const infiniteMemoriesQuery = useInfiniteMemories({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    limit: 20,
    enabled: memoriesLoaded
  });
  
  // Intersection observer for infinite scroll
  const { targetRef, isFetching } = useInfiniteScroll({
    hasMore: infiniteMemoriesQuery.hasMore,
    isLoading: infiniteMemoriesQuery.isFetchingNextPage,
    onLoadMore: () => {
      if (infiniteMemoriesQuery.hasMore && !infiniteMemoriesQuery.isFetchingNextPage) {
        infiniteMemoriesQuery.fetchNextPage();
      }
    },
    threshold: 0.8,
    rootMargin: '100px'
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

  // Auto-load memories on mount
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
      setEditingMemoryId(null);
      setEditingMemoryContent("");
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

  // Edit state handlers
  const handleStartEdit = (memoryId: string, currentContent: string) => {
    setEditingMemoryId(memoryId);
    setEditingMemoryContent(currentContent);
  };

  const handleSaveEdit = (memoryId: string) => {
    handleEditMemory(memoryId, editingMemoryContent);
  };

  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditingMemoryContent("");
  };

  const handleBulkDeleteAction = () => {
    handleBulkDelete(Array.from(selectedMemoryIds));
  };


  const getImportanceLabel = (score: number) => {
    if (score >= 0.8) return "High";
    if (score >= 0.5) return "Medium";
    return "Low";
  };

  const getImportanceColor = (score: number) => {
    if (score >= 0.8) return "bg-red-100 text-red-800";
    if (score >= 0.5) return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
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
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-600 rounded-lg p-6 text-white mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Brain className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">AI Memory</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] min-w-[44px] p-2 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Your AI coach stores important information from your conversations to provide more personalized and effective guidance. All data is encrypted and secure.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-white/90 mb-3">Your AI coach's personalized knowledge about you</p>
            
            {/* Privacy Trust Indicators */}
            <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-white/20">
              <PrivacyBadge 
                variant="encrypted" 
                size="sm" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20" 
              />
              <PrivacyBadge 
                variant="server-stored" 
                size="sm" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20" 
              />
              <PrivacyBadge 
                variant="gdpr-compliant" 
                size="sm" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20" 
              />
              <span className="text-white/70 text-xs ml-2">
                Your health data is protected and secure
              </span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Memory Overview</span>
                {memoriesLoaded && memories.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSelectionMode}
                    className="min-h-[44px] px-4 flex items-center gap-2"
                  >
                    {isSelectionMode ? (
                      <>
                        <X className="h-4 w-4" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <MousePointer2 className="h-4 w-4" />
                        Select
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                Your AI coach remembers important information from your conversations to provide personalized guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemoryForm 
                isOpen={isManualEntryOpen}
                onClose={() => setIsManualEntryOpen(false)}
                onSubmit={handleMemoryFormSubmit}
                isSubmitting={createManualMemoryMutation.isPending}
                voiceInput={{
                  isSupported: isVoiceSupported,
                  isListening: isListening,
                  isActive: isVoiceInputActive,
                  transcript: transcript,
                  interimTranscript: interimTranscript,
                  error: voiceError,
                  onToggle: handleVoiceToggle,
                }}
              />

              {/* Memory Summary - Last Period Title */}
              <div className="text-lg font-semibold text-purple-700 mb-4">
                Memory Overview
                <span className="text-sm text-gray-500 ml-2">
                  ({memoryOverview.total} total memories)
                </span>
              </div>

              {/* Core Actions - 3-Second Rule Compliance */}
              <div className="space-y-4 mb-6">
                {/* Primary Action: Total Memories Overview */}
                <Card 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === "all" ? "bg-purple-50 border-purple-200 ring-2 ring-purple-300" : "bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => handleCategoryChange("all")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Total Memories</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {memoryOverview.total}
                      </div>
                    </div>
                    <Brain className="h-5 w-5 text-purple-400" />
                  </div>
                </Card>

                {/* Secondary Actions: Quick Category Access */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCategoryChange("preferences")}
                    className={`h-12 px-4 min-h-[44px] ${
                      selectedCategory === "preferences" ? "bg-blue-50 border-blue-200 text-blue-700" : ""
                    }`}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Preferences ({memoryOverview.categories.preferences || 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCategoryChange("goals")}
                    className={`h-12 px-4 min-h-[44px] ${
                      selectedCategory === "goals" ? "bg-pink-50 border-pink-200 text-pink-700" : ""
                    }`}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Goals ({memoryOverview.categories.goals || 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleShowAllCategories}
                    className="h-12 px-4 min-h-[44px]"
                  >
                    {showAllCategories ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show All Categories
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Progressive Disclosure: All Categories */}
              <Collapsible open={showAllCategories} onOpenChange={toggleShowAllCategories}>
                <CollapsibleContent>
                  <MemoryCategoryGrid 
                    memoryOverview={memoryOverview}
                    selectedCategory={selectedCategory}
                    onCategoryChange={handleCategoryChange}
                  />
                </CollapsibleContent>
              </Collapsible>

            </CardContent>
          </Card>

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
                  {/* Selection Mode Controls */}
                  {isSelectionMode && memories.length > 0 && (
                    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-sm text-gray-700">
                            <div className="p-2 bg-purple-100 rounded-full">
                              <CheckSquare className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium">Selection Mode</p>
                              <p className="text-xs text-gray-600">
                                {selectedMemoryIds.size} of {memories.length} memories selected
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectedMemoryIds.size === memories.length ? handleDeselectAll : handleSelectAll}
                              className="min-h-[44px] px-4 text-xs"
                            >
                              {selectedMemoryIds.size === memories.length ? "Deselect All" : "Select All"}
                            </Button>
                            {selectedMemoryIds.size > 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDeleteAction}
                                disabled={bulkDeleteMutation.isPending}
                                className="min-h-[44px] px-4 text-xs"
                              >
                                {bulkDeleteMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete ({selectedMemoryIds.size})
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Swipe Instructions for better UX */}
                  {!isSelectionMode && memories.length > 0 && (
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3 text-sm text-gray-700">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Edit3 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">Swipe to interact</p>
                            <p className="text-xs text-gray-600">Swipe left to delete, swipe right to edit</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4">
                    {memories.map((memory: MemoryEntry) => {
                      const isEditing = editingMemoryId === memory.id;
                      const isSelected = selectedMemoryIds.has(memory.id);
                      
                      return (
                        <TouchSwipeHandler
                          key={memory.id}
                          leftAction={!isSelectionMode ? createDeleteAction(() => handleDeleteMemory(memory.id)) : undefined}
                          rightAction={!isSelectionMode ? createEditAction(() => handleStartEdit(memory.id, memory.content)) : undefined}
                          disabled={isSelectionMode || isEditing || deleteMemoryMutation.isPending || editMemoryMutation.isPending}
                          className="mb-2"
                        >
                          <Card className={`relative bg-gradient-to-r from-purple-50/30 via-pink-50/20 to-indigo-50/30 border-purple-100 hover:shadow-md transition-all touch-manipulation ${
                            isSelectionMode && isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                          }`}>
                            <CardHeader className="pb-3 min-h-[44px] py-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  {isSelectionMode && (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleMemorySelection(memory.id)}
                                      className="mt-1"
                                      aria-label={`Select memory: ${memory.content.substring(0, 50)}...`}
                                    />
                                  )}
                                  {categoryIcons[memory.category as keyof typeof categoryIcons]}
                                  <Badge variant="secondary" className={categoryColors[memory.category as keyof typeof categoryColors]}>
                                    {categoryLabels[memory.category as keyof typeof categoryLabels]}
                                  </Badge>
                                  {memory.importanceScore > 0.7 && (
                                    <Badge variant="outline" className={getImportanceColor(memory.importanceScore)}>
                                      {getImportanceLabel(memory.importanceScore)}
                                    </Badge>
                                  )}
                                </div>
                                {isEditing && (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSaveEdit(memory.id)}
                                      disabled={editMemoryMutation.isPending}
                                      className="hover:bg-green-50 hover:text-green-600 min-h-[44px] min-w-[44px] p-2"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      disabled={editMemoryMutation.isPending}
                                      className="hover:bg-gray-50 hover:text-gray-600 min-h-[44px] min-w-[44px] p-2"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="py-4">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <Textarea
                                    value={editingMemoryContent}
                                    onChange={(e) => setEditingMemoryContent(e.target.value)}
                                    className="min-h-[100px] text-gray-800"
                                    placeholder="Edit memory content..."
                                    disabled={editMemoryMutation.isPending}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      disabled={editMemoryMutation.isPending}
                                      className="min-h-[44px] px-4"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveEdit(memory.id)}
                                      disabled={editMemoryMutation.isPending || editingMemoryContent.trim() === ""}
                                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 min-h-[44px] px-4"
                                    >
                                      {editMemoryMutation.isPending ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        "Save Changes"
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-800 mb-3 leading-relaxed">{memory.content}</p>
                              )}
                              
                              {!isEditing && memory.labels && memory.labels.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {memory.labels.map((label: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700 font-normal border-purple-200 min-h-[32px] px-2 py-1">
                                      {label}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              
                              {!isEditing && (
                                <div className="flex justify-between text-xs text-gray-500 pt-3 mt-3 border-t border-purple-100">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Created: {new Date(memory.createdAt).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    Used {memory.accessCount} times
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TouchSwipeHandler>
                      );
                    })}
                  </div>
                  
                  {/* Infinite scroll trigger */}
                  {infiniteMemoriesQuery.hasMore && (
                    <div ref={targetRef} className="flex justify-center py-4">
                      {infiniteMemoriesQuery.isFetchingNextPage ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading more memories...
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Scroll down to load more memories
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Performance stats for development */}
                  {memories.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Performance: {memories.length} memories loaded</div>
                        <div>Mode: Infinite Scroll</div>
                        <div>Total Available: {infiniteMemoriesQuery.totalCount}</div>
                        {infiniteMemoriesQuery.hasMore && (
                          <div>More available: {infiniteMemoriesQuery.totalCount - memories.length} remaining</div>
                        )}
                      </div>
                    </div>
                  )}
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