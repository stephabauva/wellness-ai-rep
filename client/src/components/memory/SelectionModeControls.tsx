import { CheckSquare, Loader2, Trash2, Edit3 } from "lucide-react";
import { Card, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";

interface SelectionModeControlsProps {
  isSelectionMode: boolean;
  memories: any[];
  selectedMemoryIds: Set<string>;
  bulkDeleteMutation: any;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
}

export function SelectionModeControls({
  isSelectionMode,
  memories,
  selectedMemoryIds,
  bulkDeleteMutation,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
}: SelectionModeControlsProps) {
  if (!isSelectionMode || memories.length === 0) {
    return null;
  }

  return (
    <>
      {/* Selection Mode Controls */}
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
                onClick={selectedMemoryIds.size === memories.length ? onDeselectAll : onSelectAll}
                className="min-h-[44px] px-4 text-xs"
              >
                {selectedMemoryIds.size === memories.length ? "Deselect All" : "Select All"}
              </Button>
              {selectedMemoryIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBulkDelete}
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
    </>
  );
}