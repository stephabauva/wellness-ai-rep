import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Checkbox } from "@shared/components/ui/checkbox";
import { Textarea } from "@shared/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@shared/components/ui/form";
import { Trash2, Brain, User, Settings, Lightbulb, ChevronDown, ChevronUp, Info, X, Plus, Apple, Calendar, Target, AlertCircle, Eye, Loader2, CheckCircle, Mic, MicOff, Volume2, History, Zap, Clock, HelpCircle, Edit3, MousePointer2, CheckSquare } from "lucide-react";
import { FAB } from "./ui/FAB";
import { PrivacyBadge, PrivacyStatus } from "./ui/PrivacyBadge";
import { TouchSwipeHandler, createDeleteAction, createEditAction } from "./ui/TouchSwipeHandler";
import { apiRequest, queryClient } from "@shared";
import { useToast } from "@shared/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useInfiniteMemories } from "../hooks/useInfiniteMemories";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@shared/components/ui/tooltip";

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
    ],
    privacyNote: "🔒 All memories are encrypted and stored securely. You control what the AI can access.",
    coachingBenefits: "Your AI coach uses this complete information to provide holistic, personalized wellness guidance that considers all aspects of your health journey together."
  },
  preferences: {
    title: "Preferences",
    description: "Your likes, dislikes, and personal choices for workouts and wellness",
    details: [
      "Exercise types you enjoy or avoid",
      "Workout timing and environment preferences", 
      "Equipment and activity preferences",
      "Communication style and feedback preferences"
    ],
    privacyNote: "🤖 This helps your AI coach personalize workout suggestions and communication style.",
    coachingBenefits: "By remembering your preferences, your AI coach can suggest workouts you'll actually enjoy, recommend exercises at your preferred times, and communicate in a way that motivates you best."
  },
  personal_context: {
    title: "Personal Context", 
    description: "Important background information and circumstances that affect your wellness journey",
    details: [
      "Health conditions, allergies, and medical information",
      "Physical limitations or injury considerations",
      "Current fitness level and training phase",
      "Life circumstances and lifestyle factors"
    ],
    privacyNote: "🏥 Medical information is encrypted and only used to ensure safe, personalized recommendations.",
    coachingBenefits: "Your AI coach uses this context to ensure all recommendations are safe for your health conditions, appropriate for your fitness level, and adapted to your life circumstances."
  },
  instructions: {
    title: "Instructions",
    description: "Specific coaching rules and guidance preferences",
    details: [
      "How you want to be coached and communicated with",
      "Protocols for reminders and check-ins",
      "Permission requirements for suggestions",
      "Goal-setting and progress tracking preferences"
    ],
    privacyNote: "🎯 These instructions help the AI coach communicate with you in your preferred style.",
    coachingBenefits: "Instructions ensure your AI coach respects your boundaries, follows your preferred coaching style, and provides guidance in the way that works best for your personality and schedule."
  },
  food_diet: {
    title: "Food & Diet",
    description: "All nutrition-related information including preferences, restrictions, and patterns",
    details: [
      "Food preferences and favorites",
      "Allergies, intolerances, and dietary restrictions",
      "Meal patterns and eating habits",
      "Nutritional needs and dietary choices"
    ],
    privacyNote: "🥗 Dietary information helps create safe, personalized nutrition recommendations.",
    coachingBenefits: "Your AI coach uses dietary information to suggest meals you'll enjoy, avoid foods that cause problems, and create nutrition plans that fit your lifestyle and health goals."
  },
  goals: {
    title: "Goals",
    description: "Your objectives and targets for fitness, nutrition, and overall wellness",
    details: [
      "Fitness and exercise goals",
      "Nutrition and dietary objectives",
      "Weight management targets",
      "Health and wellness milestones"
    ],
    privacyNote: "🎯 Goal information helps the AI coach track your progress and adjust recommendations.",
    coachingBenefits: "Goals give your AI coach direction to create focused plans, track your progress meaningfully, celebrate achievements, and adjust strategies when you're not meeting targets."
  }
};

// Smart defaults system
interface SmartDefault {
  content: string;
  category: string;
  importance: string;
  timestamp: string;
  frequency: number;
}

interface PresetButton {
  id: string;
  label: string;
  content: string;
  category: string;
  importance: string;
  icon: string;
  timeContext?: string[];
}

const healthPresets: PresetButton[] = [
  {
    id: 'morning-routine',
    label: 'Morning Routine',
    content: 'I prefer to exercise in the morning',
    category: 'preferences',
    importance: 'medium',
    icon: '🌅',
    timeContext: ['morning']
  },
  {
    id: 'dietary-restriction',
    label: 'Dietary Restriction',
    content: 'I am allergic to',
    category: 'food_diet',
    importance: 'high',
    icon: '🚫',
  },
  {
    id: 'fitness-goal',
    label: 'Fitness Goal',
    content: 'My goal is to',
    category: 'goals',
    importance: 'high',
    icon: '🎯',
  },
  {
    id: 'injury-limitation',
    label: 'Injury/Limitation',
    content: 'I have a injury/limitation with my',
    category: 'personal_context',
    importance: 'high',
    icon: '⚕️',
  },
  {
    id: 'medication',
    label: 'Medication',
    content: 'I take medication for',
    category: 'personal_context',
    importance: 'high',
    icon: '💊',
  },
  {
    id: 'workout-preference',
    label: 'Workout Preference',
    content: 'I enjoy doing',
    category: 'preferences',
    importance: 'medium',
    icon: '💪',
  },
  {
    id: 'food-preference',
    label: 'Food Preference',
    content: 'I love eating',
    category: 'food_diet',
    importance: 'medium',
    icon: '🥗',
  },
  {
    id: 'coaching-style',
    label: 'Coaching Style',
    content: 'I prefer a coaching style that is',
    category: 'instructions',
    importance: 'high',
    icon: '🗣️',
  }
];

function getTimeContext(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getSmartDefaults(): SmartDefault[] {
  const stored = localStorage.getItem('memorySmartDefaults');
  return stored ? JSON.parse(stored) : [];
}

function saveSmartDefault(memory: Omit<SmartDefault, 'timestamp' | 'frequency'>) {
  const defaults = getSmartDefaults();
  const existing = defaults.find(d => 
    d.content === memory.content && 
    d.category === memory.category
  );
  
  if (existing) {
    existing.frequency += 1;
    existing.timestamp = new Date().toISOString();
  } else {
    defaults.push({
      ...memory,
      timestamp: new Date().toISOString(),
      frequency: 1
    });
  }
  
  // Keep only the 20 most recent/frequent defaults
  defaults.sort((a, b) => b.frequency - a.frequency || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const limitedDefaults = defaults.slice(0, 20);
  
  localStorage.setItem('memorySmartDefaults', JSON.stringify(limitedDefaults));
}

function getRecentValues(field: 'content' | 'category' | 'importance', limit = 5): string[] {
  const defaults = getSmartDefaults();
  const values = defaults.map(d => d[field]).filter(Boolean);
  return [...new Set(values)].slice(0, limit);
}

function getContextualPresets(): PresetButton[] {
  const timeContext = getTimeContext();
  return healthPresets.filter(preset => 
    !preset.timeContext || preset.timeContext.includes(timeContext)
  );
}

export default function MemorySection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState<boolean>(false);
  const [memoriesLoaded, setMemoriesLoaded] = useState<boolean>(false);
  const [showLoadButton, setShowLoadButton] = useState<boolean>(true);
  const [useInfiniteScrolling, setUseInfiniteScrolling] = useState<boolean>(false);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState<boolean>(false);
  const [showSmartDefaults, setShowSmartDefaults] = useState<boolean>(false);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState<string>("");
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form for manual memory entry with smart defaults
  const form = useForm<ManualMemoryFormData>({
    resolver: zodResolver(manualMemorySchema),
    defaultValues: {
      content: "",
      category: "preferences",
      importance: "medium",
    },
  });

  // Smart defaults state
  const [smartDefaults, setSmartDefaults] = useState<SmartDefault[]>([]);
  const [recentContent, setRecentContent] = useState<string[]>([]);
  const [contextualPresets, setContextualPresets] = useState<PresetButton[]>([]);

  // Load smart defaults on component mount
  useEffect(() => {
    setSmartDefaults(getSmartDefaults());
    setRecentContent(getRecentValues('content'));
    setContextualPresets(getContextualPresets());
  }, []);

  // Auto-populate form with smart defaults when opening
  useEffect(() => {
    if (isManualEntryOpen && smartDefaults.length > 0) {
      const mostRecent = smartDefaults[0];
      const timeContext = getTimeContext();
      
      // Set category based on time context or most recent
      if (timeContext === 'morning' && smartDefaults.find(d => d.category === 'preferences')) {
        form.setValue('category', 'preferences');
      } else if (timeContext === 'evening' && smartDefaults.find(d => d.category === 'goals')) {
        form.setValue('category', 'goals');
      } else {
        form.setValue('category', mostRecent.category as any);
      }
      
      // Set importance based on most common choice
      const importanceFrequency = smartDefaults.reduce((acc, d) => {
        acc[d.importance] = (acc[d.importance] || 0) + d.frequency;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonImportance = Object.entries(importanceFrequency)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'medium';
      form.setValue('importance', mostCommonImportance as any);
    }
  }, [isManualEntryOpen, smartDefaults, form]);

  // Handle preset selection
  const handlePresetSelect = (preset: PresetButton) => {
    form.setValue('content', preset.content);
    form.setValue('category', preset.category as any);
    form.setValue('importance', preset.importance as any);
    setShowPresets(false);
    toast({
      title: "Preset Applied",
      description: `${preset.label} template loaded. Continue editing as needed.`,
    });
  };

  // Handle smart default selection
  const handleSmartDefaultSelect = (defaultValue: SmartDefault) => {
    form.setValue('content', defaultValue.content);
    form.setValue('category', defaultValue.category as any);
    form.setValue('importance', defaultValue.importance as any);
    setShowSmartDefaults(false);
    toast({
      title: "Previous Entry Loaded",
      description: "Similar content from your history applied.",
    });
  };

  // Handle recent content selection
  const handleRecentContentSelect = (content: string) => {
    form.setValue('content', content);
    toast({
      title: "Recent Content Applied",
      description: "Previous content loaded for quick editing.",
    });
  };

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
    onTranscript: (newTranscript) => {
      const currentContent = form.getValues('content');
      const updatedContent = currentContent + (currentContent ? ' ' : '') + newTranscript;
      form.setValue('content', updatedContent);
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
    enabled: useInfiniteScrolling
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
  
  // Disabled memory queries by default - legacy fallback
  const { data: allMemories = [], isLoading: allMemoriesLoading, refetch: refetchMemories } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const response = await fetch(`/api/memories`);
      if (!response.ok) throw new Error("Failed to fetch memories");
      const data = await response.json();
      // Handle both paginated and non-paginated responses
      return Array.isArray(data) ? data : (data.memories || []);
    },
    enabled: false, // Never automatically fetch
    staleTime: 10 * 60 * 1000, // 10 minutes cache once loaded
    refetchOnWindowFocus: false,
    refetchInterval: false, // No polling ever
  });

  // Manual load function with infinite scroll option
  const handleLoadMemories = async () => {
    setShowLoadButton(false);
    setUseInfiniteScrolling(true);
    setMemoriesLoaded(true);
  };
  
  // Legacy load function for fallback
  const handleLoadMemoriesLegacy = async () => {
    setShowLoadButton(false);
    await refetchMemories();
    setMemoriesLoaded(true);
  };

  // Get memories from infinite scroll or legacy loading
  const rawMemories = useInfiniteScrolling ? infiniteMemoriesQuery.memories : allMemories;
  
  // Client-side filtering of memories based on selected category and labels
  const memories = memoriesLoaded ? 
    (selectedCategory === "all" ? 
      rawMemories : 
      rawMemories.filter((memory: MemoryEntry) => {
        const categoryMatch = memory.category === selectedCategory;
        const labelMatch = selectedLabels.size === 0 || 
          (memory.labels && memory.labels.some(label => selectedLabels.has(label)));
        return categoryMatch && labelMatch;
      })
    ) : [];
  const isLoading = overviewLoading || (memoriesLoaded && (allMemoriesLoading || infiniteMemoriesQuery.isLoading));

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
    
    // If using infinite scroll, refetch with new category
    if (useInfiniteScrolling && memoriesLoaded) {
      infiniteMemoriesQuery.refetch();
    }
  };

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
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        if (useInfiniteScrolling) {
          await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
          await infiniteMemoriesQuery.refetch();
        } else {
          await refetchMemories();
        }
      }
      
      // Update smart defaults state
      setSmartDefaults(getSmartDefaults());
      setRecentContent(getRecentValues('content'));
      
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
        if (useInfiniteScrolling) {
          await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
          await infiniteMemoriesQuery.refetch();
        } else {
          await refetchMemories();
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
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        if (useInfiniteScrolling) {
          await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
          await infiniteMemoriesQuery.refetch();
        } else {
          await refetchMemories();
        }
      }
      
      setEditingMemoryId(null);
      setEditingMemoryContent("");
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


  const handleDeleteMemory = (memoryId: string) => {
    if (confirm("Are you sure you want to delete this memory?")) {
      deleteMemoryMutation.mutate(memoryId);
    }
  };

  const handleEditMemory = (memoryId: string, currentContent: string) => {
    setEditingMemoryId(memoryId);
    setEditingMemoryContent(currentContent);
  };

  const handleSaveEdit = (memoryId: string) => {
    if (editingMemoryContent.trim() === "") {
      toast({
        title: "Error",
        description: "Memory content cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    editMemoryMutation.mutate({
      memoryId,
      content: editingMemoryContent.trim()
    });
  };

  const handleCancelEdit = () => {
    setEditingMemoryId(null);
    setEditingMemoryContent("");
  };

  // Selection mode handlers
  const handleToggleMemorySelection = (memoryId: string) => {
    const newSelection = new Set(selectedMemoryIds);
    if (newSelection.has(memoryId)) {
      newSelection.delete(memoryId);
    } else {
      newSelection.add(memoryId);
    }
    setSelectedMemoryIds(newSelection);
  };

  const handleSelectAll = () => {
    const visibleMemoryIds = memories.map((memory: MemoryEntry) => memory.id);
    setSelectedMemoryIds(new Set(visibleMemoryIds));
  };

  const handleDeselectAll = () => {
    setSelectedMemoryIds(new Set());
  };

  const handleBulkDelete = () => {
    const selectedCount = selectedMemoryIds.size;
    if (selectedCount === 0) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedCount} selected memories?`);
    if (confirmed) {
      bulkDeleteMutation.mutate(Array.from(selectedMemoryIds));
    }
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (memoryIds: string[]) => {
      const deletePromises = memoryIds.map(id => apiRequest(`/api/memories/${id}`, "DELETE"));
      await Promise.all(deletePromises);
    },
    onSuccess: async () => {
      await refetchOverview();
      await queryClient.invalidateQueries({ queryKey: ["memory-quality-metrics"] });
      if (memoriesLoaded) {
        await queryClient.invalidateQueries({ queryKey: ["memories"] });
        if (useInfiniteScrolling) {
          await queryClient.invalidateQueries({ queryKey: ["memories", "infinite"] });
          await infiniteMemoriesQuery.refetch();
        } else {
          await refetchMemories();
        }
      }
      setSelectedMemoryIds(new Set());
      toast({
        title: "Memories deleted",
        description: `${selectedMemoryIds.size} memories have been successfully removed.`,
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
                variant="local-storage" 
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
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedMemoryIds(new Set());
                    }}
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
              {/* Inline Add Memory Form */}
              <Collapsible open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
                <CollapsibleContent>
                  <div className="border rounded-lg p-4 mb-6 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Add New Memory</h3>
                      <div className="flex gap-1">
                        <PrivacyBadge variant="encrypted" size="sm" />
                        <PrivacyBadge variant="local-storage" size="sm" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Add important information that your AI coach should remember for future conversations.
                      <span className="block text-xs text-gray-500 mt-1">
                        🔒 Your data is encrypted and stored securely with full privacy protection
                      </span>
                    </p>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data: ManualMemoryFormData) => createManualMemoryMutation.mutate(data))} className="space-y-4">
                        {/* Quick Access Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPresets(!showPresets)}
                            className="min-h-[44px] px-4 flex items-center gap-2 justify-start"
                          >
                            <Zap className="h-4 w-4" />
                            <span className="text-sm">Quick Templates</span>
                            {contextualPresets.length > 0 && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {contextualPresets.length}
                              </Badge>
                            )}
                          </Button>
                          
                          {smartDefaults.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowSmartDefaults(!showSmartDefaults)}
                              className="min-h-[44px] px-4 flex items-center gap-2 justify-start"
                            >
                              <History className="h-4 w-4" />
                              <span className="text-sm">Recent Entries</span>
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {smartDefaults.length}
                              </Badge>
                            </Button>
                          )}
                          
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-[44px] px-4 flex items-center gap-2 justify-start text-purple-600"
                            disabled
                          >
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{getTimeContext().charAt(0).toUpperCase() + getTimeContext().slice(1)}</span>
                          </Button>
                        </div>

                        {/* Preset Templates */}
                        <Collapsible open={showPresets} onOpenChange={setShowPresets}>
                          <CollapsibleContent>
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="text-sm font-medium text-blue-800 mb-3">Quick Templates</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {contextualPresets.map((preset) => (
                                  <Button
                                    key={preset.id}
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handlePresetSelect(preset)}
                                    className="min-h-[44px] p-3 text-left justify-start hover:bg-blue-100"
                                  >
                                    <span className="mr-2 text-lg">{preset.icon}</span>
                                    <div className="flex flex-col items-start">
                                      <span className="text-sm font-medium">{preset.label}</span>
                                      <span className="text-xs text-gray-600 truncate">{preset.content}</span>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Smart Defaults */}
                        <Collapsible open={showSmartDefaults} onOpenChange={setShowSmartDefaults}>
                          <CollapsibleContent>
                            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                              <h4 className="text-sm font-medium text-green-800 mb-3">Your Recent Entries</h4>
                              <div className="space-y-2">
                                {smartDefaults.slice(0, 5).map((defaultValue, index) => (
                                  <Button
                                    key={index}
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleSmartDefaultSelect(defaultValue)}
                                    className="w-full min-h-[44px] p-3 text-left justify-start hover:bg-green-100"
                                  >
                                    <div className="flex items-center gap-2">
                                      {categoryIcons[defaultValue.category as keyof typeof categoryIcons]}
                                      <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium truncate max-w-[200px]">{defaultValue.content}</span>
                                        <span className="text-xs text-gray-600">
                                          {categoryLabels[defaultValue.category as keyof typeof categoryLabels]} • Used {defaultValue.frequency} times
                                        </span>
                                      </div>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                        
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Memory Content</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Textarea
                                    placeholder="Enter information you want your AI coach to remember (e.g., 'I prefer morning workouts and have a gluten sensitivity')"
                                    className="min-h-[100px] pr-12"
                                    {...field}
                                    value={field.value + (interimTranscript ? ` ${interimTranscript}` : '')}
                                  />
                                  {isVoiceSupported && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleVoiceToggle}
                                      className={`absolute right-2 top-2 min-h-[44px] min-w-[44px] p-2 rounded-full touch-manipulation ${
                                        isListening ? "bg-red-50 text-red-600 hover:bg-red-100" : "hover:bg-gray-100"
                                      }`}
                                      disabled={createManualMemoryMutation.isPending}
                                    >
                                      {isListening ? (
                                        <>
                                          <MicOff className="h-4 w-4" />
                                          <span className="sr-only">Stop voice input</span>
                                        </>
                                      ) : (
                                        <>
                                          <Mic className="h-4 w-4" />
                                          <span className="sr-only">Start voice input</span>
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormDescription className="flex items-center gap-2">
                                <span>Describe the information clearly and specifically.</span>
                                {isVoiceSupported && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Volume2 className="h-3 w-3" />
                                    Voice input available
                                  </span>
                                )}
                                {isListening && (
                                  <span className="text-xs text-red-600 flex items-center gap-1 animate-pulse">
                                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                                    Listening...
                                  </span>
                                )}
                              </FormDescription>
                              
                              {/* Recent Content Suggestions */}
                              {recentContent.length > 0 && field.value.length < 10 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-600 mb-1">Recent content:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {recentContent.slice(0, 3).map((content, index) => (
                                      <Button
                                        key={index}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRecentContentSelect(content)}
                                        className="text-xs h-8 px-2 truncate max-w-[120px]"
                                      >
                                        {content.length > 15 ? `${content.substring(0, 15)}...` : content}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(categoryLabels).map(([key, label]) => (
                                      <Tooltip key={key}>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => field.onChange(key)}
                                            className={`
                                              min-h-[56px] p-3 rounded-lg border-2 transition-all
                                              flex flex-col items-center justify-center gap-1
                                              touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                                              ${field.value === key 
                                                ? `${categoryColors[key as keyof typeof categoryColors]} border-current ring-2 ring-offset-2 ring-current` 
                                                : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                              }
                                            `}
                                          >
                                            <div className={`p-1 rounded-full ${field.value === key ? 'text-current' : 'text-gray-600'}`}>
                                              {categoryIcons[key as keyof typeof categoryIcons]}
                                            </div>
                                            <span className={`text-xs font-medium text-center leading-tight ${field.value === key ? 'text-current' : 'text-gray-700'}`}>
                                              {label}
                                            </span>
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-sm">
                                          <div className="space-y-2">
                                            <p className="text-sm font-medium">
                                              {explanationCards[key as keyof typeof explanationCards]?.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {explanationCards[key as keyof typeof explanationCards]?.coachingBenefits}
                                            </p>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                </FormControl>
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
                                <FormLabel className="flex items-center gap-2">
                                  Importance Level
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-sm">
                                        Higher importance memories are prioritized when your AI coach makes recommendations. Critical health information should be marked as high importance.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </FormLabel>
                                <FormControl>
                                  <div className="grid grid-cols-1 gap-2">
                                    {[
                                      { value: 'low', label: 'Low', description: 'General information', color: 'bg-gray-100 text-gray-800', icon: '📝' },
                                      { value: 'medium', label: 'Medium', description: 'Important preference', color: 'bg-orange-100 text-orange-800', icon: '⚡' },
                                      { value: 'high', label: 'High', description: 'Critical health information', color: 'bg-red-100 text-red-800', icon: '🚨' }
                                    ].map((importance) => (
                                      <button
                                        key={importance.value}
                                        type="button"
                                        onClick={() => field.onChange(importance.value)}
                                        className={`
                                          min-h-[56px] p-3 rounded-lg border-2 transition-all
                                          flex items-center justify-start gap-3
                                          touch-manipulation focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                                          ${field.value === importance.value
                                            ? `${importance.color} border-current ring-2 ring-offset-2 ring-current`
                                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                          }
                                        `}
                                      >
                                        <span className="text-lg">{importance.icon}</span>
                                        <div className="flex flex-col items-start">
                                          <span className={`text-sm font-medium ${field.value === importance.value ? 'text-current' : 'text-gray-900'}`}>
                                            {importance.label}
                                          </span>
                                          <span className={`text-xs ${field.value === importance.value ? 'text-current opacity-90' : 'text-gray-600'}`}>
                                            {importance.description}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  How important is this information for coaching decisions?
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsManualEntryOpen(false)}
                            disabled={createManualMemoryMutation.isPending}
                            className="min-h-[44px] px-6"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createManualMemoryMutation.isPending}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 min-h-[44px] px-6"
                          >
                            {createManualMemoryMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Save Memory"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                </CollapsibleContent>
              </Collapsible>

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
                    onClick={() => setShowAllCategories(!showAllCategories)}
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
              <Collapsible open={showAllCategories} onOpenChange={setShowAllCategories}>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Preferences */}
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      {explanationCards.preferences.coachingBenefits}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Personal Context */}
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      {explanationCards.personal_context.coachingBenefits}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Instructions */}
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      {explanationCards.instructions.coachingBenefits}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Food & Diet */}
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      {explanationCards.food_diet.coachingBenefits}
                    </p>
                  </TooltipContent>
                </Tooltip>

                {/* Goals */}
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      {explanationCards.goals.coachingBenefits}
                    </p>
                  </TooltipContent>
                </Tooltip>
                  </div>
                </CollapsibleContent>
              </Collapsible>

            </CardContent>
          </Card>

          <div className="space-y-4">
              {/* Memory Insights Section - Progressive Disclosure */}
              {memoryOverview.total > 0 && (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInsights(!showInsights)}
                    className="w-full sm:w-auto h-12 px-4 min-h-[44px]"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {showInsights ? 'Hide' : 'Show'} Memory Insights
                    {showInsights ? (
                      <ChevronUp className="h-4 w-4 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2" />
                    )}
                  </Button>
                  
                  <Collapsible open={showInsights} onOpenChange={setShowInsights}>
                    <CollapsibleContent>
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
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

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

              {showLoadButton ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Brain className="h-12 w-12 text-purple-400 mb-4" />
                    <div className="flex flex-col gap-3">
                      <Button onClick={handleLoadMemories} disabled={infiniteMemoriesQuery.isLoading || allMemoriesLoading} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 min-h-[44px] px-6">
                        {infiniteMemoriesQuery.isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading Memories...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Show My Stored Memories (Optimized)
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={handleLoadMemoriesLegacy} disabled={allMemoriesLoading} className="min-h-[44px] px-6">
                        {allMemoriesLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Show All (Legacy Mode)
                          </>
                        )}
                      </Button>
                    </div>
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
                                onClick={handleBulkDelete}
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
                          rightAction={!isSelectionMode ? createEditAction(() => handleEditMemory(memory.id, memory.content)) : undefined}
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
                              
                              {/* Privacy Status for each memory */}
                              {!isEditing && (
                                <div className="mb-4">
                                  <PrivacyStatus
                                    encrypted={true}
                                    localStorage={true}
                                    aiAccessible={memory.category !== 'medical'}
                                    gdprCompliant={true}
                                    size="sm"
                                    className="gap-1"
                                  />
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
                  {useInfiniteScrolling && infiniteMemoriesQuery.hasMore && (
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
                  {useInfiniteScrolling && memories.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Performance: {memories.length} memories loaded</div>
                        <div>Mode: {useInfiniteScrolling ? 'Infinite Scroll' : 'Legacy Loading'}</div>
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