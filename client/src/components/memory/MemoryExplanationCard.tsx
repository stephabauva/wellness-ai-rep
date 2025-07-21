import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@shared/components/ui/collapsible";
import { Info, ChevronDown, ChevronUp } from "lucide-react";
import { explanationCards } from "./constants";

interface MemoryExplanationCardProps {
  selectedCategory: string;
  isExplanationOpen: boolean;
  onToggleExplanation: (open: boolean) => void;
}

export function MemoryExplanationCard({
  selectedCategory,
  isExplanationOpen,
  onToggleExplanation,
}: MemoryExplanationCardProps) {
  return (
    <Collapsible open={isExplanationOpen} onOpenChange={onToggleExplanation}>
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
  );
}