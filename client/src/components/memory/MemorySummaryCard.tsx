import { Brain, User, Target, ChevronDown, ChevronUp, X, MousePointer2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Collapsible, CollapsibleContent } from "@shared/components/ui/collapsible";
import { MemoryCategoryGrid } from "./MemoryCategoryGrid";
import { MemoryForm } from "./MemoryForm";
import { ManualMemoryFormData } from "./constants";

interface MemorySummaryCardProps {
  memoryOverview: {
    total: number;
    categories: Record<string, number>;
    qualityMetrics?: any;
  };
  memoriesLoaded: boolean;
  memories: any[];
  selectedCategory: string;
  showAllCategories: boolean;
  isManualEntryOpen: boolean;
  isSelectionMode: boolean;
  createManualMemoryMutation: any;
  voiceInput: any;
  onCategoryChange: (category: string) => void;
  onToggleShowAllCategories: () => void;
  onToggleSelectionMode: () => void;
  onManualEntryClose: () => void;
  onMemoryFormSubmit: (data: ManualMemoryFormData) => void;
}

export function MemorySummaryCard({
  memoryOverview,
  memoriesLoaded,
  memories,
  selectedCategory,
  showAllCategories,
  isManualEntryOpen,
  isSelectionMode,
  createManualMemoryMutation,
  voiceInput,
  onCategoryChange,
  onToggleShowAllCategories,
  onToggleSelectionMode,
  onManualEntryClose,
  onMemoryFormSubmit,
}: MemorySummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Memory Overview</span>
          {memoriesLoaded && memories.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSelectionMode}
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
          onClose={onManualEntryClose}
          onSubmit={onMemoryFormSubmit}
          isSubmitting={createManualMemoryMutation.isPending}
          voiceInput={voiceInput}
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
            onClick={() => onCategoryChange("all")}
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
              onClick={() => onCategoryChange("preferences")}
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
              onClick={() => onCategoryChange("goals")}
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
              onClick={onToggleShowAllCategories}
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
        <Collapsible open={showAllCategories} onOpenChange={onToggleShowAllCategories}>
          <CollapsibleContent>
            <MemoryCategoryGrid 
              memoryOverview={memoryOverview}
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
            />
          </CollapsibleContent>
        </Collapsible>

      </CardContent>
    </Card>
  );
}