import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Textarea } from "@shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@shared/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@shared/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@shared/components/ui/form";
import { Trash2, Brain, User, Settings, Lightbulb, ChevronDown, ChevronUp, Info, X, Plus, Apple, Calendar, Target, AlertCircle, Eye, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Manual memory entry schema
const manualMemorySchema = z.object({
  content: z.string().min(10, "Memory content must be at least 10 characters").max(500, "Memory content must be less than 500 characters"),
  category: z.enum(["preferences", "personal_context", "instructions", "food_diet", "goals"], {
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
  labels: string[];
  importanceScore: number;
  keywords: string[];
  createdAt: string;
  accessCount: number;
  lastAccessed: string;
}

const categoryIcons = {
  preferences: <User className="h-4 w-4" />,
  personal_context: <Lightbulb className="h-4 w-4" />,
  instructions: <Settings className="h-4 w-4" />,
  food_diet: <Apple className="h-4 w-4" />,
  goals: <Target className="h-4 w-4" />
};

const categoryLabels = {
  preferences: "Preferences",
  personal_context: "Personal Context",
  instructions: "Instructions",
  food_diet: "Food & Diet",
  goals: "Goals"
};

const categoryColors = {
  preferences: "bg-blue-100 text-blue-800",
  personal_context: "bg-green-100 text-green-800",
  instructions: "bg-purple-100 text-purple-800",
  food_diet: "bg-orange-100 text-orange-800",
  goals: "bg-teal-100 text-teal-800"
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
  preferences: {
    title: "Preferences",
    description: "Your likes, dislikes, and personal choices for workouts and wellness",
    details: [
      "Exercise types you enjoy or avoid",
      "Workout timing and environment preferences", 
      "Equipment and activity preferences",
      "Communication style and feedback preferences"
    ]
  },
  personal_context: {
    title: "Personal Context", 
    description: "Important background information and circumstances that affect your wellness journey",
    details: [
      "Health conditions, allergies, and medical information",
      "Physical limitations or injury considerations",
      "Current fitness level and training phase",
      "Life circumstances and lifestyle factors"
    ]
  },
  instructions: {
    title: "Instructions",
    description: "Specific coaching rules and guidance preferences",
    details: [
      "How you want to be coached and communicated with",
      "Protocols for reminders and check-ins",
      "Permission requirements for suggestions",
      "Goal-setting and progress tracking preferences"
    ]
  },
  food_diet: {
    title: "Food & Diet",
    description: "All nutrition-related information including preferences, restrictions, and patterns",
    details: [
      "Food preferences and favorites",
      "Allergies, intolerances, and dietary restrictions",
      "Meal patterns and eating habits",
      "Nutritional needs and dietary choices"
    ]
  },
  goals: {
    title: "Goals",
    description: "Your objectives and targets for fitness, nutrition, and overall wellness",
    details: [
      "Fitness and exercise goals",
      "Nutrition and dietary objectives",
      "Weight management targets",
      "Health and wellness milestones"
    ]
  }
};

export default function MemorySection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
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
      category: "preferences",
      importance: "medium",
    },
  });

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

  // Client-side filtering of memories based on selected category and labels
  const memories = memoriesLoaded ? 
    (selectedCategory === "all" ? 
      allMemories : 
      allMemories.filter((memory: MemoryEntry) => {
        const categoryMatch = memory.category === selectedCategory;
        const labelMatch = selectedLabels.size === 0 || 
          (memory.labels && memory.labels.some(label => selectedLabels.has(label)));
        return categoryMatch && labelMatch;
      })
    ) : [];
  const isLoading = overviewLoading || (memoriesLoaded && allMemoriesLoading);

  // Get available labels for the current category
  const getAvailableLabels = () => {
    if (selectedCategory === "all" || !memoriesLoaded) return [];
    
    const categoryMemories = allMemories.filter((memory: MemoryEntry) => memory.category === selectedCategory);
    const allLabels = categoryMemories.flatMap((memory: MemoryEntry) => memory.labels || []);
    const labelCounts = allLabels.reduce((acc, label) => {
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(labelCounts).map(([label, count]) => ({ label, count }));
  };
  
  const availableLabels = getAvailableLabels();
  
  // Handle label selection
  const handleLabelToggle = (label: string) => {
    const newLabels = new Set(selectedLabels);
    if (newLabels.has(label)) {
      newLabels.delete(label);
    } else {
      newLabels.add(label);
    }
    setSelectedLabels(newLabels);
  };
  
  const handleSelectAllLabels = () => {
    if (selectedLabels.size === availableLabels.length) {
      setSelectedLabels(new Set());
    } else {
      setSelectedLabels(new Set(availableLabels.map(l => l.label)));
    }
  };
  
  // Reset labels when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedLabels(new Set());
  };

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
      // Force immediate refetch of overview for instant UI updates
      await refetchOverview();
      
      // Invalidate Godmode metrics to update quality indicators
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      
      // If memories are loaded, refetch them to show new memory
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        await refetchMemories();
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
      // Force immediate refetch of overview for instant UI updates
      await refetchOverview();
      
      // Invalidate Godmode metrics to update quality indicators
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      
      // If memories are loaded, refetch them to update the list
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        await refetchMemories();
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
      // Force immediate refetch of overview for instant UI updates
      await refetchOverview();
      
      // Invalidate Godmode metrics to update quality indicators
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      
      // If memories are loaded, refetch them to update the list
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        await refetchMemories();
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
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-600 rounded-lg p-6 text-white mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Brain className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold">AI Memory</h1>
            </div>
            <p className="text-white/90">Your AI coach's personalized knowledge about you</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Memory Overview</span>
                <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 px-6 py-3 min-h-[48px] touch-manipulation">
                      <Plus className="h-5 w-5 mr-2" />
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
                      <form onSubmit={form.handleSubmit((data: ManualMemoryFormData) => createManualMemoryMutation.mutate(data))} className="space-y-4">
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
                                  <SelectItem value="preferences">Preferences</SelectItem>
                                  <SelectItem value="personal_context">Personal Context</SelectItem>
                                  <SelectItem value="instructions">Instructions</SelectItem>
                                  <SelectItem value="food_diet">Food & Diet</SelectItem>
                                  <SelectItem value="goals">Goals</SelectItem>
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
              {/* Memory Summary - Last Period Title */}
              <div className="text-lg font-semibold text-purple-700 mb-4">
                Memory Overview
                <span className="text-sm text-gray-500 ml-2">
                  ({memoryOverview.total} total memories)
                </span>
              </div>

              {/* Memory Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Total Memories */}
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

                {/* Preferences */}
                <Card 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === "preferences" ? "bg-blue-50 border-blue-200 ring-2 ring-blue-300" : "bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => handleCategoryChange("preferences")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Preferences</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {memoryOverview.categories.preferences || 0}
                      </div>
                    </div>
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                </Card>

                {/* Personal Context */}
                <Card 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === "personal_context" ? "bg-green-50 border-green-200 ring-2 ring-green-300" : "bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => handleCategoryChange("personal_context")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Personal Context</div>
                      <div className="text-2xl font-bold text-green-600">
                        {memoryOverview.categories.personal_context || 0}
                      </div>
                    </div>
                    <Lightbulb className="h-5 w-5 text-green-400" />
                  </div>
                </Card>

                {/* Instructions */}
                <Card 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === "instructions" ? "bg-purple-50 border-purple-200 ring-2 ring-purple-300" : "bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => handleCategoryChange("instructions")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Instructions</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {memoryOverview.categories.instructions || 0}
                      </div>
                    </div>
                    <Settings className="h-5 w-5 text-purple-400" />
                  </div>
                </Card>

                {/* Food & Diet */}
                <Card 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === "food_diet" ? "bg-orange-50 border-orange-200 ring-2 ring-orange-300" : "bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => handleCategoryChange("food_diet")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Food & Diet</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {memoryOverview.categories.food_diet || 0}
                      </div>
                    </div>
                    <Apple className="h-5 w-5 text-orange-400" />
                  </div>
                </Card>

                {/* Goals */}
                <Card 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === "goals" ? "bg-pink-50 border-pink-200 ring-2 ring-pink-300" : "bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => handleCategoryChange("goals")}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Goals</div>
                      <div className="text-2xl font-bold text-pink-600">
                        {memoryOverview.categories.goals || 0}
                      </div>
                    </div>
                    <Target className="h-5 w-5 text-pink-400" />
                  </div>
                </Card>
              </div>

            </CardContent>
          </Card>

          <div className="space-y-4">
              {/* Memory Insights Section */}
              {memoryOverview.total > 0 && (
                <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Brain className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-purple-800">Memory Insights</h3>
                  </div>
                  <div className="space-y-3">
                    {memoryOverview.total >= 10 && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                        <span className="text-sm text-gray-700">Strong memory foundation established with {memoryOverview.total} stored memories</span>
                      </div>
                    )}
                    
                    {memoryOverview.categories.preferences > 0 && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                        <span className="text-sm text-gray-700">Preferences captured: AI understands your workout and lifestyle choices</span>
                      </div>
                    )}
                    
                    {memoryOverview.categories.personal_context > 0 && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                        <span className="text-sm text-gray-700">Personal context recorded: Health conditions and limitations noted</span>
                      </div>
                    )}
                    
                    {memoryOverview.categories.goals > 0 && (
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                        <span className="text-sm text-gray-700">Goals defined: Clear targets set for your wellness journey</span>
                      </div>
                    )}
                    
                    {memoryOverview.total < 5 && (
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5 text-amber-600" />
                        <span className="text-sm text-gray-700">Consider adding more memories to improve AI coaching quality</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 mt-0.5 text-purple-600" />
                      <span className="text-sm text-gray-700">Memory system active: Your AI coach learns and remembers from every conversation</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Explanation Card */}
              <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
                <Card className="border-purple-200 bg-purple-50">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-purple-100 transition-colors">
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
                      <ul className="space-y-2">
                        {explanationCards[selectedCategory as keyof typeof explanationCards]?.details.map((detail, index) => (
                          <li key={index} className="flex items-start gap-2 text-purple-700">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>
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
                          className="text-xs"
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
                            className="cursor-pointer hover:bg-gray-100 text-xs"
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

              {showLoadButton ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Brain className="h-12 w-12 text-purple-400 mb-4" />
                    <Button onClick={handleLoadMemories} disabled={allMemoriesLoading} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
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
                              className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 border-0"
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
                      <Card key={memory.id} className="relative bg-gradient-to-r from-purple-50/30 via-pink-50/20 to-indigo-50/30 border-purple-100 hover:shadow-md transition-all">
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
                                  {memory.importanceScore > 0.7 && (
                                    <Badge variant="outline" className={getImportanceColor(memory.importanceScore)}>
                                      {getImportanceLabel(memory.importanceScore)}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteMemory(memory.id)}
                                  disabled={deleteMemoryMutation.isPending}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-800 mb-3 leading-relaxed">{memory.content}</p>
                          
                          {memory.labels && memory.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {memory.labels.map((label: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700 font-normal border-purple-200">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          
                          <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-purple-100">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created: {new Date(memory.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Used {memory.accessCount} times
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}