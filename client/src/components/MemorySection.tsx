import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Brain, User, Settings, Lightbulb } from "lucide-react";
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

export default function MemorySection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memories", selectedCategory === "all" ? undefined : selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const response = await fetch(`/api/memories${params}`);
      if (!response.ok) throw new Error("Failed to fetch memories");
      return response.json();
    }
  });

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
    <div className="space-y-6">
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
              <div className="text-2xl font-bold text-blue-600">{memories.length}</div>
              <div className="text-sm text-gray-600">Total Memories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {memories.filter((m: MemoryEntry) => m.category === "preference").length}
              </div>
              <div className="text-sm text-gray-600">Preferences</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {memories.filter((m: MemoryEntry) => m.category === "instruction").length}
              </div>
              <div className="text-sm text-gray-600">Instructions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {memories.filter((m: MemoryEntry) => m.importanceScore >= 0.8).length}
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
  );
}