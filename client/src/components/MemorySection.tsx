import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Brain, User, Settings, Lightbulb, ChevronDown, ChevronUp, Info, X, Plus } from "lucide-react";
import { Eye, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Manual memory entry schema
const manualMemorySchema = z.object({
  content: z.string().min(10, "Memory content must be at least 10 characters").max(500, "Memory content must be less than 500 characters"),
  category: z.enum(["preference", "personal_info", "context", "instruction"], {
    required_error: "Please select a memory category",
  }),
  importance: z.enum(["low", "medium", "high"], {
    required_error: "Please select importance level",
  }),
});

type ManualMemoryFormData = z.infer<typeof manualMemorySchema>;

interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  importanceScore: number;
  keywords: string[];
  createdAt: string;
  accessCount: number;
  lastAccessed: string;
}

const categoryIcons = {
  preference: <User className="h-4 w-4" />,
  personal_info: <User className="h-4 w-4" />,
  context: <Lightbulb className="h-4 w-4" />,
  instruction: <Settings className="h-4 w-4" />
};

const categoryLabels = {
  preference: "Preferences",
  personal_info: "Personal Info",
  context: "Context",
  instruction: "Instructions"
};

const categoryColors = {
  preference: "bg-blue-100 text-blue-800",
  personal_info: "bg-green-100 text-green-800",
  context: "bg-yellow-100 text-yellow-800",
  instruction: "bg-purple-100 text-purple-800"
};

const explanationCards = {
  all: {
    title: "All Memories",
    description: "Complete collection of information your AI coach remembers about you",
    details: [
      "Combines all memory types in one view",
      "Sorted by importance and recency",
      "Shows how memories are categorized",
      "Use this to get an overview of everything stored"
    ]
  },
  preference: {
    title: "Preferences",
    description: "Your likes, dislikes, and personal choices for workouts and wellness",
    details: [
      "Exercise types you enjoy or avoid",
      "Workout timing and environment preferences", 
      "Equipment and activity preferences",
      "Communication style and feedback preferences"
    ]
  },
  personal_info: {
    title: "Personal Information", 
    description: "Important health details and personal circumstances",
    details: [
      "Health conditions, allergies, and medical information",
      "Physical limitations or injury considerations",
      "Dietary restrictions and nutritional needs",
      "Goals, lifestyle factors, and demographics"
    ]
  },
  context: {
    title: "Context",
    description: "Situational information that affects your wellness journey",
    details: [
      "Current fitness level and training phase",
      "Life circumstances (travel, busy periods, stress)",
      "Environmental factors (gym access, equipment)",
      "Progress milestones and temporary situations"
    ]
  },
  instruction: {
    title: "Instructions",
    description: "Specific coaching rules and guidance preferences",
    details: [
      "How you want to be coached and communicated with",
      "Protocols for reminders and check-ins",
      "Permission requirements for suggestions",
      "Goal-setting and progress tracking preferences"
    ]
  }
};

export default function MemorySection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set());
  const [isManualEntryOpen, setIsManualEntryOpen] = useState<boolean>(false);
  const [memoriesLoaded, setMemoriesLoaded] = useState<boolean>(false);
  const [showLoadButton, setShowLoadButton] = useState<boolean>(true);
  const { toast } = useToast();

  // Form for manual memory entry
  const form = useForm<ManualMemoryFormData>({
    resolver: zodResolver(manualMemorySchema),
    defaultValues: {
      content: "",
      category: "preference",
      importance: "medium",
    },
  });

  // Overview count query - lightweight, runs once on mount
  const { data: memoryOverview = { total: 0, categories: {} }, isLoading: overviewLoading } = useQuery({
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

  // Disabled memory queries by default
  const { data: allMemories = [], isLoading: allMemoriesLoading, refetch: refetchMemories } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const response = await fetch(`/api/memories`);
      if (!response.ok) throw new Error("Failed to fetch memories");
      const data = await response.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
    enabled: false, // Never automatically fetch
    staleTime: 10 * 60 * 1000, // 10 minutes cache once loaded
    refetchOnWindowFocus: false,
    refetchInterval: false, // No polling ever
  });

  // Manual load function
  const handleLoadMemories = async () => {
    setShowLoadButton(false);
    await refetchMemories();
    setMemoriesLoaded(true);
  };

  // Client-side filtering of memories based on selected category
  const memories = memoriesLoaded ? 
    (selectedCategory === "all" ? 
      allMemories : 
      allMemories.filter((memory: MemoryEntry) => memory.category === selectedCategory)
    ) : [];
  const isLoading = overviewLoading || (memoriesLoaded && (allMemoriesLoading || filteredLoading));

  // Manual memory creation mutation
  const createManualMemoryMutation = useMutation({
    mutationFn: async (data: ManualMemoryFormData) => {
      // Convert importance level to numeric score
      const importanceMap = { low: 0.3, medium: 0.6, high: 0.9 };
      const importanceScore = importanceMap[data.importance];

      // Use the existing memory processing system like chat does
      return apiRequest("/api/memories/manual", "POST", {
        content: data.content,
        category: data.category,
        importance: importanceScore,
      });
    },
    onSuccess: async () => {
      // Invalidate overview to update counts
      await queryClient.invalidateQueries({ queryKey: ["memory-overview"] });
      
      // If memories are loaded, refetch them to show new memory
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        await refetchMemories();
        if (selectedCategory !== "all") {
          await refetchFiltered();
        }
      }
      
      form.reset();
      setIsManualEntryOpen(false);
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
      // Invalidate overview to update counts
      await queryClient.invalidateQueries({ queryKey: ["memory-overview"] });
      
      // If memories are loaded, refetch them to update the list
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        await refetchMemories();
        if (selectedCategory !== "all") {
          await refetchFiltered();
        }
      }
      
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

  const bulkDeleteMutation = useMutation({
    mutationFn: (memoryIds: string[]) => apiRequest("/api/memories/bulk", "DELETE", { memoryIds }),
    onSuccess: async (data) => {
      // Invalidate overview to update counts
      await queryClient.invalidateQueries({ queryKey: ["memory-overview"] });
      
      // If memories are loaded, refetch them to update the list
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        await refetchMemories();
        if (selectedCategory !== "all") {
          await refetchFiltered();
        }
      }
      
      setSelectedMemoryIds(new Set());
      toast({
        title: "Memories deleted",
        description: `Successfully deleted ${data.successCount} of ${data.totalRequested} memories.`,
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

  const handleDeleteMemory = (memoryId: string) => {
    if (confirm("Are you sure you want to delete this memory?")) {
      deleteMemoryMutation.mutate(memoryId);
    }
  };

  const handleToggleMemorySelection = (memoryId: string) => {
    const newSelected = new Set(selectedMemoryIds);
    if (newSelected.has(memoryId)) {
      newSelected.delete(memoryId);
    } else {
      newSelected.add(memoryId);
    }
    setSelectedMemoryIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMemoryIds.size === memories.length) {
      setSelectedMemoryIds(new Set());
    } else {
      setSelectedMemoryIds(new Set(memories.map((memory: MemoryEntry) => memory.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedMemoryIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedMemoryIds.size === 0) return;
    
    const count = selectedMemoryIds.size;
    if (confirm(`Are you sure you want to delete ${count} selected ${count === 1 ? 'memory' : 'memories'}?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedMemoryIds));
    }
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
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">AI Memory</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Memory Overview</span>
                <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Memory
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Manually Add Memory</DialogTitle>
                      <DialogDescription>
                        Add important information that your AI coach should remember for future conversations.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(data => createManualMemoryMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Memory Content</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter information you want your AI coach to remember (e.g., 'I prefer morning workouts and have a gluten sensitivity')"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Describe the information clearly and specifically.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select memory category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="preference">Preferences</SelectItem>
                                  <SelectItem value="personal_info">Personal Info</SelectItem>
                                  <SelectItem value="context">Context</SelectItem>
                                  <SelectItem value="instruction">Instructions</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Choose the type of information this memory represents.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="importance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Importance Level</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select importance level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low - General information</SelectItem>
                                  <SelectItem value="medium">Medium - Important preference</SelectItem>
                                  <SelectItem value="high">High - Critical health information</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How important is this information for coaching decisions?
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsManualEntryOpen(false)}
                            disabled={createManualMemoryMutation.isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createManualMemoryMutation.isPending}
                          >
                            {createManualMemoryMutation.isPending ? "Processing..." : "Save Memory"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Your AI coach remembers important information from your conversations to provide personalized guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{memoryOverview.total}</div>
                  <div className="text-sm text-gray-600">Total Memories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {memoryOverview.categories.preference || 0}
                  </div>
                  <div className="text-sm text-gray-600">Preferences</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {memoryOverview.categories.instruction || 0}
                  </div>
                  <div className="text-sm text-gray-600">Instructions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {memoryOverview.categories.personal_info || 0}
                  </div>
                  <div className="text-sm text-gray-600">Personal Info</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <div className="w-full overflow-x-auto">
              <TabsList className="flex md:grid w-full md:grid-cols-5 gap-1 min-w-max md:min-w-0">
                <TabsTrigger value="all" className="text-xs md:text-sm flex-shrink-0">All</TabsTrigger>
                <TabsTrigger value="preference" className="text-xs md:text-sm flex-shrink-0">Preferences</TabsTrigger>
                <TabsTrigger value="personal_info" className="text-xs md:text-sm flex-shrink-0">Personal</TabsTrigger>
                <TabsTrigger value="context" className="text-xs md:text-sm flex-shrink-0">Context</TabsTrigger>
                <TabsTrigger value="instruction" className="text-xs md:text-sm flex-shrink-0">Instructions</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={selectedCategory} className="space-y-4">
              {/* Explanation Card */}
              <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
                <Card className="border-blue-200 bg-blue-50">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-blue-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-blue-800">
                            {explanationCards[selectedCategory as keyof typeof explanationCards]?.title}
                          </CardTitle>
                        </div>
                        {isExplanationOpen ? (
                          <ChevronUp className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <CardDescription className="text-blue-700">
                        {explanationCards[selectedCategory as keyof typeof explanationCards]?.description}
                      </CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {explanationCards[selectedCategory as keyof typeof explanationCards]?.details.map((detail, index) => (
                          <li key={index} className="flex items-start gap-2 text-blue-700">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {showLoadButton ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Brain className="h-12 w-12 text-blue-400 mb-4" />
                    <Button onClick={handleLoadMemories} disabled={allMemoriesLoading}>
                      {allMemoriesLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading Memories...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show My Stored Memories
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : memories.length === 0 ? (
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
                  {/* Bulk Actions Bar */}
                  {memories.length > 0 && (
                    <Card className="bg-gray-50 border-dashed">
                      <CardContent className="py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedMemoryIds.size === memories.length && memories.length > 0}
                                onCheckedChange={handleSelectAll}
                                disabled={memories.length === 0}
                              />
                              <span className="text-sm font-medium">
                                Select All ({memories.length})
                              </span>
                            </div>
                            {selectedMemoryIds.size > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                  {selectedMemoryIds.size} selected
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleClearSelection}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Clear
                                </Button>
                              </div>
                            )}
                          </div>
                          {selectedMemoryIds.size > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleBulkDelete}
                              disabled={bulkDeleteMutation.isPending}
                              className="w-full sm:w-auto"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Delete Selected ({selectedMemoryIds.size})</span>
                              <span className="sm:hidden">Delete ({selectedMemoryIds.size})</span>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4">
                    {memories.map((memory: MemoryEntry) => (
                      <Card key={memory.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className="pt-1">
                              <Checkbox
                                checked={selectedMemoryIds.has(memory.id)}
                                onCheckedChange={() => handleToggleMemorySelection(memory.id)}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  {categoryIcons[memory.category as keyof typeof categoryIcons]}
                                  <Badge variant="secondary" className={categoryColors[memory.category as keyof typeof categoryColors]}>
                                    {categoryLabels[memory.category as keyof typeof categoryLabels]}
                                  </Badge>
                                  <Badge variant="outline" className={getImportanceColor(memory.importanceScore)}>
                                    {getImportanceLabel(memory.importanceScore)}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMemory(memory.id)}
                                  disabled={deleteMemoryMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 mb-3">{memory.content}</p>
                          
                          {memory.keywords && memory.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {memory.keywords.map((keyword: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Created: {new Date(memory.createdAt).toLocaleDateString()}</span>
                            <span>Used {memory.accessCount} times</span>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}