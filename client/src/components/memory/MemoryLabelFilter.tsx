import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Settings } from "lucide-react";

interface LabelWithCount {
  label: string;
  count: number;
}

interface MemoryLabelFilterProps {
  selectedCategory: string;
  availableLabels: LabelWithCount[];
  selectedLabels: Set<string>;
  onLabelToggle: (label: string) => void;
  onSelectAllLabels: () => void;
}

export function MemoryLabelFilter({
  selectedCategory,
  availableLabels,
  selectedLabels,
  onLabelToggle,
  onSelectAllLabels,
}: MemoryLabelFilterProps) {
  if (selectedCategory === "all" || availableLabels.length === 0) {
    return null;
  }

  return (
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
              onClick={onSelectAllLabels}
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
                className={`cursor-pointer text-xs min-h-[44px] px-3 py-2 flex items-center justify-center touch-manipulation transition-colors ${
                  selectedLabels.has(label)
                    ? "bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-300"
                }`}
                onClick={() => onLabelToggle(label)}
              >
                {label} ({count})
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}