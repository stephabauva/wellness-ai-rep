import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Brain, User, Settings, Lightbulb, ChevronDown, ChevronUp, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Fetch all memories for overview counts
  const { data: allMemories = [], isLoading: allMemoriesLoading } = useQuery({
    queryKey: ["memories"],
    queryFn: async () => {
      const response = await fetch(`/api/memories`);
      if (!response.ok) throw new Error("Failed to fetch memories");
      return response.json();
    }
  });

  // Fetch filtered memories for display
  const { data: filteredMemories = [], isLoading: filteredLoading } = useQuery({
    queryKey: ["memories", selectedCategory],
    queryFn: async () => {
      if (selectedCategory === "all") {
        return allMemories;
      }
      const response = await fetch(`/api/memories?category=${selectedCategory}`);
      if (!response.ok) throw new Error("Failed to fetch filtered memories");
      return response.json();
    },
    enabled: selectedCategory !== "all" || allMemories.length > 0
  });

  const memories = selectedCategory === "all" ? allMemories : filteredMemories;
  const isLoading = allMemoriesLoading || (selectedCategory !== "all" && filteredLoading);

  const deleteMemoryMutation = useMutation({
    mutationFn: (memoryId: string) => apiRequest(`/api/memories/${memoryId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
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

  const handleDeleteMemory = (memoryId: string) => {
    if (confirm("Are you sure you want to delete this memory?")) {
      deleteMemoryMutation.mutate(memoryId);
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
              <CardTitle>Memory Overview</CardTitle>
              <CardDescription>
                Your AI coach remembers important information from your conversations to provide personalized guidance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{allMemories.length}</div>
                  <div className="text-sm text-gray-600">Total Memories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {allMemories.filter((m: MemoryEntry) => m.category === "preference").length}
                  </div>
                  <div className="text-sm text-gray-600">Preferences</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {allMemories.filter((m: MemoryEntry) => m.category === "instruction").length}
                  </div>
                  <div className="text-sm text-gray-600">Instructions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {allMemories.filter((m: MemoryEntry) => m.importanceScore >= 0.8).length}
                  </div>
                  <div className="text-sm text-gray-600">High Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="preference">Preferences</TabsTrigger>
              <TabsTrigger value="personal_info">Personal</TabsTrigger>
              <TabsTrigger value="context">Context</TabsTrigger>
              <TabsTrigger value="instruction">Instructions</TabsTrigger>
            </TabsList>

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
                <div className="grid gap-4">
                  {memories.map((memory: MemoryEntry) => (
                    <Card key={memory.id} className="relative">
                      <CardHeader className="pb-3">
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
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}