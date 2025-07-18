import { Card } from "@shared/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import { User, Lightbulb, Settings, Apple, Target } from "lucide-react";
import { explanationCards } from "./constants";

interface MemoryOverview {
  total: number;
  categories: {
    preferences?: number;
    personal_context?: number;
    instructions?: number;
    food_diet?: number;
    goals?: number;
  };
}

interface MemoryCategoryGridProps {
  memoryOverview: MemoryOverview;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function MemoryCategoryGrid({ 
  memoryOverview, 
  selectedCategory, 
  onCategoryChange 
}: MemoryCategoryGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Preferences */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedCategory === "preferences" ? "bg-blue-50 border-blue-200 ring-2 ring-blue-300" : "bg-gray-50 border-gray-200"
            }`}
            onClick={() => onCategoryChange("preferences")}
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
            onClick={() => onCategoryChange("personal_context")}
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
            onClick={() => onCategoryChange("instructions")}
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
            onClick={() => onCategoryChange("food_diet")}
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
            onClick={() => onCategoryChange("goals")}
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
  );
}